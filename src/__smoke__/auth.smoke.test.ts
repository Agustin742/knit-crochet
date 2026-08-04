import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { count, like, sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { users } from "@/features/auth/schema";
import { createDbClient } from "@/shared/db";
import { verifySessionToken } from "@/shared/lib/auth/jwt";

/**
 * Smoke test de la CADENA DE AUTH contra la DB real de Neon (deudas #45 y #46).
 * Ejercita los Route Handlers reales (`POST /api/auth/register` y
 * `POST /api/auth/login`) → servicios → store Drizzle → Postgres. Nada de
 * dobles: ni del borde de datos ni de `fetch`.
 *
 * Está guardado por `SMOKE_NEON` (mismo flag que `neon.smoke.test.ts`): en la
 * corrida hermética normal (`pnpm test`) queda SKIPPED y NO abre ninguna
 * conexión (el cliente se construye perezosamente dentro de `beforeAll`, nunca
 * en el top-level del módulo).
 *
 *   SMOKE_NEON=1 pnpm vitest run src/__smoke__/auth.smoke.test.ts
 */

/** Lee una variable de `process.env` o, en su defecto, del `.env` del repo. */
function resolveEnvValue(name: string): string {
  const fromEnv = process.env[name];
  if (fromEnv) {
    return fromEnv;
  }
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)\\s*$`));
    if (match?.[1]) {
      return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error(`${name} no encontrada ni en env ni en .env`);
}

const RUN_SMOKE = Boolean(process.env.SMOKE_NEON);
const STAMP = Date.now();
const PASSWORD = "lana-1234";

type JsonBody = {
  user?: { id: string; email: string; name: string };
  error?: string;
};

type Observed = {
  status: number;
  text: string;
  body: JsonBody;
  setCookie: string | null;
};

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function observe(response: Response): Promise<Observed> {
  const text = await response.text();
  let body: JsonBody = {};
  try {
    body = JSON.parse(text) as JsonBody;
  } catch {
    body = {};
  }
  return {
    status: response.status,
    text,
    body,
    setCookie: response.headers.get("set-cookie"),
  };
}

async function postRegister(payload: unknown): Promise<Observed> {
  return observe(
    await registerRoute(
      jsonRequest("https://smoke.local/api/auth/register", payload),
    ),
  );
}

async function postLogin(payload: unknown): Promise<Observed> {
  return observe(
    await loginRoute(jsonRequest("https://smoke.local/api/auth/login", payload)),
  );
}

function logObserved(label: string, observed: Observed): void {
  console.log(
    `[smoke-auth] ${label} -> status=${observed.status} body=${observed.text}`,
  );
}

describe.skipIf(!RUN_SMOKE)("smoke: cadena de auth contra Neon real", () => {
  let database: NeonHttpDatabase;

  beforeAll(async () => {
    // Los Route Handlers usan el store por defecto (`db` de @/shared/db), que
    // lee `process.env.DATABASE_URL` en su primer uso: hay que poblar el env
    // ANTES de la primera petición. Igual con `JWT_SECRET` (firma del token).
    process.env.DATABASE_URL = resolveEnvValue("DATABASE_URL");
    process.env.JWT_SECRET = resolveEnvValue("JWT_SECRET");
    database = createDbClient(process.env.DATABASE_URL);
  }, 30_000);

  afterAll(async () => {
    if (!database) {
      return;
    }
    // Teardown ORDENADO y explícito (no hay transacción multi-statement en
    // neon-http). Estos usuarios no tienen hijos (el smoke solo toca auth), y
    // el borrado va por LIKE del stamp para arrastrar TAMBIÉN los duplicados
    // que pudiera haber creado el caso 3. Corre aunque un assert falle.
    const leftovers = await database
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(like(users.email, `%${STAMP}%`));
    console.log(
      `[smoke-auth] teardown: filas a borrar = ${JSON.stringify(leftovers)}`,
    );

    await database.delete(users).where(like(users.email, `%${STAMP}%`));

    const [remaining] = await database
      .select({ n: count() })
      .from(users)
      .where(like(users.email, `%${STAMP}%`));
    const [total] = await database.select({ n: count() }).from(users);
    console.log(
      `[smoke-auth] teardown: filas del stamp restantes = ${remaining?.n} | total users = ${total?.n}`,
    );
    expect(remaining?.n).toBe(0);
  }, 30_000);

  it(
    "1. alta feliz → 201, usuario en Postgres y passwordHash != contraseña en claro",
    async () => {
      const email = `smoke+${STAMP}@knit.test`;
      const observed = await postRegister({
        email,
        password: PASSWORD,
        name: "Smoke Alta",
      });
      logObserved("1. alta feliz", observed);

      const rows = await database
        .select()
        .from(users)
        .where(like(users.email, `%${STAMP}%`));
      console.log(
        `[smoke-auth] 1. filas en users = ${JSON.stringify(
          rows.map((row) => ({ email: row.email, hash: row.passwordHash })),
        )}`,
      );

      expect(observed.status).toBe(201);
      expect(observed.body.user).toBeDefined();
      expect(observed.body.user).not.toHaveProperty("passwordHash");
      expect(rows).toHaveLength(1);
      expect(rows[0]?.email).toBe(email);
      // El hash guardado NO es la contraseña en claro (bcrypt, prefijo $2).
      expect(rows[0]?.passwordHash).not.toBe(PASSWORD);
      expect(rows[0]?.passwordHash.startsWith("$2")).toBe(true);

      // La cookie de sesión sale firmada y verificable.
      const setCookie = observed.setCookie ?? "";
      expect(setCookie).toContain("HttpOnly");
      const token = /kc_session=([^;]+)/.exec(setCookie)?.[1] ?? "";
      await expect(verifySessionToken(token)).resolves.toEqual({
        userId: observed.body.user?.id,
      });
    },
    30_000,
  );

  it(
    "2. CASO CENTRAL — alta con email ya registrado → 409 (deuda #45)",
    async () => {
      const email = `smoke-dup+${STAMP}@knit.test`;
      const payload = { email, password: PASSWORD, name: "Smoke Dup" };

      const first = await postRegister(payload);
      const second = await postRegister(payload);
      logObserved("2. primera alta", first);
      logObserved("2. SEGUNDA alta (misma cadena exacta)", second);

      const rows = await database
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(like(users.email, `%smoke-dup+${STAMP}%`));
      console.log(
        `[smoke-auth] 2. columna email en Postgres = ${JSON.stringify(rows)}`,
      );

      expect(first.status).toBe(201);
      // Comportamiento correcto esperado (PRD §4.2): el segundo alta con el
      // mismo email debe responder 409 con el mensaje de email ya registrado,
      // que es el que el formulario sabe pintar en el campo `email`.
      expect(second.status).toBe(409);
      expect(second.body.error).toBe("Ya existe una cuenta con ese email.");
      // Y en la base sigue habiendo UNA sola fila.
      expect(rows).toHaveLength(1);
    },
    30_000,
  );

  it(
    "3. normalización del email (caja y espacios) → el duplicado también es 409",
    async () => {
      const local = `Fulano+${STAMP}`;
      const mixedCase = `${local}@Knit.Test`;
      const lowerCase = mixedCase.toLowerCase();
      const padded = `  ${mixedCase}  `;

      const first = await postRegister({
        email: mixedCase,
        password: PASSWORD,
        name: "Smoke Caja",
      });
      const sameLower = await postRegister({
        email: lowerCase,
        password: PASSWORD,
        name: "Smoke Caja Baja",
      });
      const samePadded = await postRegister({
        email: padded,
        password: PASSWORD,
        name: "Smoke Caja Espacios",
      });
      logObserved(`3. alta con "${mixedCase}"`, first);
      logObserved(`3. alta con "${lowerCase}"`, sameLower);
      logObserved(`3. alta con "${padded}" (con espacios)`, samePadded);

      const rows = await database
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(like(users.email, `%${STAMP}%`));
      console.log(
        `[smoke-auth] 3. columna email en Postgres = ${JSON.stringify(rows)}`,
      );

      expect(first.status).toBe(201);
      // El schema zod normaliza (trim + toLowerCase) ANTES de consultar y de
      // guardar, así que las tres cadenas son el MISMO email: solo la primera
      // crea usuario, las otras dos son duplicados → 409.
      expect(sameLower.status).toBe(409);
      expect(samePadded.status).toBe(409);
      // Lo guardado en la columna `email` está normalizado a minúsculas.
      const stored = rows
        .filter((row) => row.email.includes(local.toLowerCase()))
        .map((row) => row.email);
      expect(stored).toEqual([lowerCase]);
    },
    45_000,
  );

  it(
    "4. login real: credenciales correctas → 200 + cookie; erróneas → 401 idéntico",
    async () => {
      const email = `smoke-login+${STAMP}@knit.test`;
      const created = await postRegister({
        email,
        password: PASSWORD,
        name: "Smoke Login",
      });
      logObserved("4. alta previa", created);

      const okLogin = await postLogin({ email, password: PASSWORD });
      const wrongPassword = await postLogin({
        email,
        password: "password-erronea",
      });
      const unknownEmail = await postLogin({
        email: `smoke-nadie+${STAMP}@knit.test`,
        password: PASSWORD,
      });
      logObserved("4. login correcto", okLogin);
      logObserved("4. password incorrecta", wrongPassword);
      logObserved("4. email inexistente", unknownEmail);

      expect(created.status).toBe(201);
      expect(okLogin.status).toBe(200);
      expect(okLogin.body.user?.email).toBe(email);
      expect(okLogin.body.user).not.toHaveProperty("passwordHash");
      const token =
        /kc_session=([^;]+)/.exec(okLogin.setCookie ?? "")?.[1] ?? "";
      await expect(verifySessionToken(token)).resolves.toEqual({
        userId: okLogin.body.user?.id,
      });

      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      // Mismo status y mismo cuerpo: no se revela qué cuentas existen.
      expect(wrongPassword.text).toBe(unknownEmail.text);
      expect(wrongPassword.setCookie).toBeNull();
    },
    45_000,
  );

  it(
    "5. la tabla users tiene constraint UNIQUE real sobre email en la DB",
    async () => {
      const constraints = await database.execute(
        sql`select tc.constraint_name, tc.constraint_type, kcu.column_name
            from information_schema.table_constraints tc
            join information_schema.key_column_usage kcu
              on kcu.constraint_name = tc.constraint_name
             and kcu.table_schema = tc.table_schema
            where tc.table_name = 'users'
              and tc.constraint_type in ('UNIQUE', 'PRIMARY KEY')`,
      );
      const indexes = await database.execute(
        sql`select indexname, indexdef from pg_indexes where tablename = 'users'`,
      );
      console.log(
        `[smoke-auth] 5. constraints users = ${JSON.stringify(constraints.rows)}`,
      );
      console.log(
        `[smoke-auth] 5. índices users = ${JSON.stringify(indexes.rows)}`,
      );

      const uniqueOnEmail = constraints.rows.some(
        (row) =>
          row.constraint_type === "UNIQUE" && row.column_name === "email",
      );
      expect(uniqueOnEmail).toBe(true);
    },
    30_000,
  );
});
