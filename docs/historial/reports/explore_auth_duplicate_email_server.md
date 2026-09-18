# Diagnóstico servidor — `POST /api/auth/register` y el email duplicado (deuda 45)

**Alcance:** solo lado servidor (validación → store → migración → route handler →
serialización del 409) + el contrato que el cliente consume. **No se modificó
ningún archivo de `src/**`.** No se ejecutó ninguna consulta contra la base real
(el acceso a `.env` fue denegado por el clasificador de permisos; ver
"Lo que NO pude determinar").

**Veredicto global (adelanto):** recorriendo la cadena completa **no aparece
ningún defecto que explique un 201 espurio**. La normalización del email existe y
funciona, el UNIQUE existe en Drizzle y en la migración aplicada, el pre-chequeo
`findByEmail` compara valores ya normalizados y el 409 se serializa con la clave
que el cliente lee. La hipótesis original de la deuda 45 (traducción del error
UNIQUE, precedente `isDuplicateColorCode`) **no aplica** al camino feliz del
duplicado, porque el error UNIQUE nunca debería llegar a dispararse. Lo que sí
queda confirmado es un **agujero de segundo orden**: si por cualquier motivo el
UNIQUE llegara a saltar, la respuesta sería **500, no 409**, y el navegador
pintaría un banner genérico en vez del error bajo el campo email.

---

## 1. `src/features/auth/validation.ts` — ¿se normaliza el email? **SÍ. Sospecha nº1 DESCARTADA.**

`src/features/auth/validation.ts:12-19` define **un único** `emailSchema`:

```ts
// El email se normaliza (trim + minúsculas) ANTES de validar el formato y
// antes de consultar/guardar, para que la unicidad no dependa del casing.
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(255)
  .pipe(z.email("El email no es válido."));
```

Y ese mismo `emailSchema` lo usan **los dos** schemas
(`src/features/auth/validation.ts:26-35`):

```ts
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es obligatoria."),
});
```

No hay divergencia posible entre alta y login: es literalmente la misma constante.

**Verificación empírica** (no me fié de leer el código; zod instalado es
`node_modules/zod` versión **4.4.3**, y en zod 4 estos helpers de string siguen
siendo transformaciones reales). Script efímero ejecutado en la raíz del repo
(creado y borrado en el acto, fuera de `src/`):

```
"  Fulano@X.com " -> "fulano@x.com"
"fulano@x.com"    -> "fulano@x.com"
"FULANO@X.COM"    -> "fulano@x.com"
"Tejedora@Example.com" -> "tejedora@example.com"
```

`.trim()` y `.toLowerCase()` **sí transforman el valor** antes del `.pipe(z.email())`,
y `parsed.data.email` que recibe el route handler ya viene en minúsculas y sin
espacios. Por tanto `Fulano@X.com` y `fulano@x.com` **no** producen dos usuarios
distintos.

**Además, la normalización existe desde el primer día**, no es un añadido reciente
que dejara filas legacy sin normalizar. `git log -p --follow` sobre el archivo
muestra que `.trim()` / `.toLowerCase()` entran ya en el commit original de auth
`838ffee "feat: create jwt auth and protect routes"` (y el archivo solo se ha
tocado después en `8ab6b99 "feat: implement auth UI"`, sin cambiar el bloque —
`git diff` del working tree sobre este archivo sale **vacío**).

> Conclusión punto 1: **descartado**. El casing no es la causa.

---

## 2. `src/features/auth/schema.ts` y la migración — ¿hay UNIQUE de verdad? **SÍ, en ambos sitios.**

Drizzle, `src/features/auth/schema.ts:3-10`:

```ts
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

SQL realmente generado, `drizzle/0000_cold_ben_urich.sql:4-12`:

```sql
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
```

- **Tipo de columna:** `text` normal, **no `citext`** → la unicidad en Postgres es
  **case-sensitive**. Es decir: la red de seguridad de la DB *sola* no protegería
  contra `A@x.com` vs `a@x.com`. Pero como el punto 1 demuestra que la aplicación
  **siempre** escribe en minúsculas, en la práctica ese hueco no se puede alcanzar
  por el BFF. (Si alguien insertara a mano una fila con mayúsculas, ahí sí habría
  un duplicado lógico que ni el UNIQUE ni `findByEmail` verían — pero eso no es un
  camino de la app.)
- **Migración aplicada:** `drizzle/meta/_journal.json` tiene una sola entrada
  (`idx: 0`, tag `0000_cold_ben_urich`), y el informe previo
  `progress/reports/smoke_neon.md:19-21` afirma explícitamente que
  *"Migración `drizzle/0000_cold_ben_urich.sql` ya aplicada (por el líder)"*, con
  el smoke corriendo contra Neon real y creando/borrando usuarios en `users`
  (`smoke_neon.md:137-152` muestra el conteo de las 8 tablas). O sea: la tabla y
  su constraint existen en la base real que usó el smoke.
- `drizzle.config.ts` apunta a `./src/shared/db/schema.ts`, que
  (`src/shared/db/schema.ts:5`) re-exporta `@/features/auth/schema` → no hay una
  segunda definición de `users` compitiendo.

> Conclusión punto 2: hay UNIQUE en Drizzle **y** en el SQL aplicado. Existe red
> de seguridad; lo único "flojo" es que es case-sensitive, hueco que la
> normalización de zod tapa.

---

## 3. `src/features/auth/api/store.ts` — comparación exacta y ausencia total de traducción

`src/features/auth/api/store.ts:29-36`:

```ts
    async findByEmail(email) {
      const rows = await database
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return rows[0];
    },
```

Igualdad **exacta** (`=` de SQL, sin `lower()`, sin `ilike`). Es correcto
*porque* lo que entra ya viene normalizado desde zod; es frágil si algún día
alguien llama a `findByEmail` con un string sin pasar por el schema.

`src/features/auth/api/store.ts:45-52`:

```ts
    async create(input) {
      const rows = await database.insert(users).values(input).returning();
      const created = rows[0];
      if (!created) {
        throw new Error("No se pudo crear el usuario.");
      }
      return created;
    },
```

**No hay ningún `try/catch`, ningún `isDuplicateEmail`, ninguna inspección de
`error.code` / `error.constraint` / `error.cause`.** No existe el equivalente de
`isDuplicateColorCode`.

**Qué pasaría si el UNIQUE saltara** (cadena literal, verificada leyendo cada
eslabón):

1. Postgres devuelve `23505` sobre `users_email_unique`.
2. El driver `drizzle-orm/neon-http` lo envuelve en un `DrizzleQueryError` cuyo
   `.code` y `.constraint` son `undefined` y cuyo mensaje es
   `"Failed query: insert into \"users\" …"`; el `NeonDbError` real viaja en
   `.cause` (forma capturada empíricamente en
   `progress/reports/smoke_neon.md:72-93`).
3. `create` lo deja propagar tal cual → `registerUser` tampoco lo captura
   (`src/features/auth/api/register.ts:20-24`).
4. El `catch` del route handler (`src/app/api/auth/register/route.ts:25-30`)
   comprueba `error instanceof EmailAlreadyRegisteredError` → **falso** → cae en
   `unexpectedErrorResponse("POST /api/auth/register", error)`.
5. Resultado: **HTTP 500** con cuerpo `{"error":"Error interno del servidor."}`
   y un `console.error` en los logs del servidor.

En el navegador eso se vería como el **banner rojo de formulario** (`AuthFormError`,
`role="alert"`, arriba del form) con el texto *"Error interno del servidor."*, y
**no** como el mensaje *"Ya existe una cuenta con ese email."* bajo el campo Email
— porque `RegisterForm` solo pinta error de campo cuando el status es exactamente
`409` (`src/features/auth/ui/RegisterForm.tsx:19,82-89`).

> Conclusión punto 3: la comparación es exacta y correcta dado el input
> normalizado; **la traducción del 23505 no existe**, así que el UNIQUE es una red
> que, si se activa, entrega **500 en vez de 409**. Es una deuda real, aunque
> probablemente **no** sea la causa del síntoma reportado (ver punto 5 y
> "Causas candidatas").

---

## 4. Route handler y `src/shared/lib/http.ts` — cuerpo exacto del 409

`src/app/api/auth/register/route.ts:16-31` completo:

```ts
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = registerSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  try {
    const { user, token } = await registerUser(parsed.data);
    return setSessionCookie(NextResponse.json({ user }, { status: 201 }), token);
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return errorResponse(error.message, 409);
    }
    return unexpectedErrorResponse("POST /api/auth/register", error);
  }
}
```

`src/shared/lib/http.ts:9-16` (nota: el módulo es `src/shared/lib/http.ts`, un
archivo, **no** un directorio `src/shared/lib/http/`):

```ts
export type ErrorBody = { error: string };

export function errorResponse(
  message: string,
  status: number,
): NextResponse<ErrorBody> {
  return NextResponse.json({ error: message }, { status });
}
```

Y el mensaje sale de `src/features/auth/api/errors.ts:1-6`:

```ts
export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("Ya existe una cuenta con ese email.");
    this.name = "EmailAlreadyRegisteredError";
  }
}
```

**Contrato exacto del duplicado:**

```
HTTP/1.1 409
content-type: application/json
{"error":"Ya existe una cuenta con ese email."}
```

Clave: **`error`** (string plano). Sin `field`, sin `code`, sin array de issues.

**El cliente lo consume bien.** `src/features/auth/ui/auth-client.ts:14-29`
(`readErrorMessage`) busca exactamente `"error" in body` con
`typeof body.error === "string"` y lo devuelve; si no, cae al mensaje genérico.
Y `RegisterForm` (`src/features/auth/ui/RegisterForm.tsx:82-89`) mapea
`status === 409` al error del campo email. **El contrato servidor↔cliente encaja.**

Tabla de estados que puede emitir el endpoint:

| Situación | Status | Cuerpo | Dónde se ve en el navegador |
|---|---|---|---|
| Alta correcta | 201 | `{ user }` + cookie `kc_session` | redirección a `/` |
| Payload inválido / body no-JSON | 400 | `{"error": "<primer issue zod>"}` o `"Datos inválidos."` | banner de formulario |
| Email ya registrado (pre-chequeo) | **409** | `{"error":"Ya existe una cuenta con ese email."}` | **bajo el campo Email** |
| Cualquier excepción no controlada (incluido UNIQUE 23505) | 500 | `{"error":"Error interno del servidor."}` | banner de formulario |

---

## 5. `src/app/api/auth/auth-routes.test.ts` — qué dobla y por qué el caso pasa en verde

Dobla **el borde de datos entero**, sustituyendo la fábrica del store por un array
en memoria. `src/app/api/auth/auth-routes.test.ts:11-43`:

```ts
// Solo se dobla el borde de datos: los Route Handlers, la validación zod, el
// hashing y la firma del JWT son los reales.
const dbState = vi.hoisted(() => {
  const rows: UserRecord[] = [];
  const store: AuthUserStore = {
    async findByEmail(email: string) {
      return rows.find((row) => row.email === email);
    },
    ...
    async create(input: NewUserRecord) {
      const now = new Date("2026-07-21T10:00:00Z");
      const created: UserRecord = {
        id: `user-${rows.length + 1}`,
        ...
      };
      rows.push(created);
      return created;
    },
  };
  return { rows, store };
});

vi.mock("@/features/auth/api/store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/auth/api/store")>();
  return { ...actual, createAuthUserStore: () => dbState.store };
});
```

El caso de duplicado, `src/app/api/auth/auth-routes.test.ts:119-130`:

```ts
  it("POST /api/auth/register rejects a duplicated email with 409", async () => {
    await register(
      jsonRequest("https://test.local/api/auth/register", VALID_REGISTRATION),
    );

    const response = await register(
      jsonRequest("https://test.local/api/auth/register", VALID_REGISTRATION),
    );

    expect(response.status).toBe(409);
    expect(dbState.rows).toHaveLength(1);
  });
```

**Por qué pasa en verde:** el doble `create` **siempre acepta** el insert (no
simula ningún UNIQUE), pero el test nunca llega ahí: el pre-chequeo
`findByEmail` del servicio encuentra la fila con `rows.find(row => row.email === email)`
— comparación de strings JS, sobre emails que zod ya normalizó — y `registerUser`
lanza `EmailAlreadyRegisteredError` **antes** de tocar `create`. El 409 sale del
`catch` del route handler.

Detalle a favor del test: el payload es
`src/app/api/auth/auth-routes.test.ts:67-71` →
`email: "Tejedora@Example.com"` (con mayúsculas a propósito), y
`auth-routes.test.ts:93` asserta `dbState.rows[0]?.email === "tejedora@example.com"`.
O sea: **la normalización del email SÍ está cubierta por test**, y el caso
duplicado de hecho ejercita la ruta con casing mixto. Eso refuerza el descarte del
punto 1.

Lo que el test **no** cubre (esto es exactamente la deuda 46):

- que la tabla real tenga la constraint;
- que Postgres real, con dos filas, se comporte igual que `rows.find`;
- **el camino del UNIQUE disparado** — es imposible de alcanzar con este doble,
  porque el doble no rechaza nunca un insert;
- cualquier fallo de conexión/configuración de `DATABASE_URL`.

---

## Causa(s) candidata(s), ordenadas por probabilidad

> Aviso importante: **ninguna de estas está confirmada**. Leyendo el código, la
> cadena servidor es coherente y devuelve 409. El síntoma reportado no se explica
> por el código tal cual está escrito, así que las candidatas son hipótesis sobre
> el *entorno* o sobre la *observación*, no sobre la lógica.

### A. El primer alta nunca llegó a persistir, así que el segundo alta era legítimamente nuevo (probabilidad ALTA)

- **Qué rompe:** nada del código de duplicados. La primera petición falló (500 por
  `MissingDatabaseUrlError`, timeout de Neon, base sin migrar, rama de Neon
  distinta…) y el usuario **no se enteró**, porque —según la propia deuda 44—
  tras el alta *"no hay ni un solo elemento en pantalla que diga que hay sesión"*.
  Al reintentar con el mismo email, el servidor responde 201 correctamente: para
  él ese email no existe.
- **Qué se vería en el navegador:** dos altas "aparentemente OK" seguidas. Aunque
  el 500 sí pintaría el banner *"Error interno del servidor."*, es fácil pasarlo
  por alto o atribuirlo a otra cosa, sobre todo si el usuario venía peleando con
  la deuda 44 en la misma sesión.
- **Cómo confirmarla:** ver el panel **Network** del navegador (o los logs del
  `next dev`) en el **primer** alta. Si el primer POST no fue 201, todo el
  síntoma se cae. Complementario: `SELECT count(*) FROM users WHERE email = '<el email>'`
  contra la base real — si es 0 después del "primer alta", es esta.

### B. La base contra la que corre el `next dev` no es la que tiene la migración / no es donde el usuario mira (probabilidad MEDIA)

- **Qué rompe:** si `DATABASE_URL` apunta a una base sin la tabla `users`, **todo**
  el alta da 500. Si apunta a una base con la tabla pero **sin** la constraint
  (por ejemplo creada a mano y no por la migración), sigue habiendo pre-chequeo
  `findByEmail`, así que el duplicado se rechazaría igual — la falta de constraint
  por sí sola **no** produce un 201 espurio. Solo produce un 201 espurio si además
  la escritura y la lectura van a sitios distintos, lo cual es difícil con un solo
  `DATABASE_URL`.
- **Qué se vería:** 500 sistemático (banner *"Error interno del servidor."*), no
  un 201.
- **Cómo confirmarla:** contra la base a la que apunta la app,
  `SELECT conname FROM pg_constraint WHERE conrelid = 'users'::regclass;` →
  debe aparecer `users_email_unique`. Y comprobar que `DATABASE_URL` del proceso
  `next dev` es la misma que se está inspeccionando.

### C. Doble envío concurrente (carrera entre `findByEmail` y `create`) (probabilidad BAJA)

- **Qué rompe:** el pre-chequeo y el insert **no son atómicos**, y entre ambos hay
  un `await hashPassword(...)` de bcrypt (decenas/centenas de ms):
  `src/features/auth/api/register.ts:15-24`. Dos peticiones simultáneas con el
  mismo email pueden pasar ambas el `findByEmail`; una inserta y la otra choca con
  el UNIQUE → por el punto 3, **500 en vez de 409**.
- **Qué se vería:** *"Error interno del servidor."* en el banner tras un doble
  clic. Mitigado (no eliminado) porque el `Button` se auto-deshabilita con
  `disabled={disabled ?? loading}` (`src/shared/ui/primitives/button/Button.tsx:22`)
  y `RegisterForm` pasa `loading={pending}`.
- **Cómo confirmarla:** dos `curl` en paralelo con el mismo email contra la base
  real; observar si alguno devuelve 500 con `"Failed query: insert into \"users\""`
  en el log del servidor.

### D. Servidor de desarrollo con build obsoleto (probabilidad BAJA)

- **Qué rompe:** nada del código; el proceso `next dev` sirve una versión anterior
  del route handler o del bundle del formulario.
- **Qué se vería:** comportamiento que no corresponde a ningún archivo del repo.
- **Cómo confirmarla:** parar el dev server, borrar `.next/`, `pnpm dev`, repetir.

### E. Colisión "lógica" por casing insertado fuera de la app (probabilidad MUY BAJA)

- **Qué rompe:** una fila con email en mayúsculas insertada a mano (seed, consola
  de Neon, smoke antiguo). El alta normaliza a minúsculas, `findByEmail` no la
  encuentra, el UNIQUE case-sensitive tampoco choca → **201 legítimo con dos
  cuentas del "mismo" email**. Es el único escenario leído en el código que
  produce el síntoma exacto reportado.
- **Qué se vería:** exactamente lo que reporta el usuario: el alta pasa con un
  email "ya registrado".
- **Cómo confirmarla:** `SELECT id, email FROM users ORDER BY created_at;` y buscar
  emails con mayúsculas o duplicados que solo difieran en casing.

---

## Qué NO es

1. **NO es un fallo de normalización del email en zod.** `emailSchema`
   (`validation.ts:14-19`) aplica `.trim().toLowerCase()` antes de validar el
   formato, es **el mismo objeto** para `registerSchema` y `loginSchema`
   (`validation.ts:27,33`), y su comportamiento se verificó ejecutándolo con la
   zod 4.4.3 instalada: `"  Fulano@X.com "` → `"fulano@x.com"`. Además existe
   desde el commit original de auth (`838ffee`), así que tampoco hay filas legacy
   sin normalizar creadas por la propia app.

2. **NO es la ausencia del pre-chequeo.** `registerUser`
   (`src/features/auth/api/register.ts:15-18`) consulta `store.findByEmail(input.email)`
   y lanza `EmailAlreadyRegisteredError` antes de cualquier insert.

3. **NO es que falte el UNIQUE en la base.** Está en Drizzle
   (`src/features/auth/schema.ts:5`) y en el SQL aplicado
   (`drizzle/0000_cold_ben_urich.sql:11`, `CONSTRAINT "users_email_unique" UNIQUE("email")`),
   con la migración registrada en `drizzle/meta/_journal.json` y confirmada como
   aplicada contra Neon real en `progress/reports/smoke_neon.md:19-21`.

4. **NO es la hipótesis original de la deuda 45 (traducción del error UNIQUE al
   estilo `isDuplicateColorCode`)** — al menos no como causa del síntoma. Ese
   camino **solo se recorre si el pre-chequeo falla primero**. Sí es un defecto
   latente confirmado: `create` no traduce nada, así que un 23505 se entrega como
   **500**, no como 409 (punto 3). Pero un 500 no puede confundirse con "no
   rechaza el email": el formulario muestra un banner de error bien visible.

5. **NO es un fallo del mapeo del status en el cliente.** `readErrorMessage`
   (`auth-client.ts:14-29`) lee exactamente la clave `error` que emite
   `errorResponse` (`http.ts:15`), y `RegisterForm` (`RegisterForm.tsx:19,82-89`)
   mapea `409` al error del campo email. El contrato encaja. (Revisado solo como
   lectura; el cliente queda fuera del alcance de cambios de este diagnóstico.)

6. **NO es el proxy/middleware.** `src/proxy.ts:11` incluye `/api/auth/register`
   en `PUBLIC_API_ROUTES`, así que la petición llega intacta al route handler; el
   proxy no reescribe ni cachea nada.

7. **NO es una definición duplicada de la tabla `users`.**
   `src/shared/db/schema.ts:5` re-exporta `@/features/auth/schema`, y
   `drizzle.config.ts` apunta a ese barrel: hay una sola definición.

---

## Lo que NO pude determinar leyendo (y hay que medir, no suponer)

- **El estado real de la base a la que apunta la app.** Intenté leer `DATABASE_URL`
  de `.env` y el clasificador de permisos bloqueó la acción; **no ejecuté ninguna
  consulta contra Neon**. Por tanto no puedo afirmar (a) que la constraint
  `users_email_unique` exista en *esa* base concreta hoy, ni (b) si hay filas con
  emails en mayúsculas o duplicados lógicos.
- **Qué status devolvió realmente el navegador del usuario.** Sin ese dato, todo
  lo anterior son hipótesis. Es el primer paso que ya pedía la propia deuda 45.

### Repro mínimo para cerrar el diagnóstico (10 minutos, sin tocar código)

Con `pnpm dev` levantado y `DATABASE_URL` apuntando a la base real:

```bash
EMAIL="dup-$(date +%s)@knit.test"

# 1º alta -> se espera 201 + Set-Cookie: kc_session
curl -i -sS -X POST http://localhost:3000/api/auth/register \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"lana-1234\",\"name\":\"Dup\"}"

# 2º alta, MISMO email -> se espera 409 {"error":"Ya existe una cuenta con ese email."}
curl -i -sS -X POST http://localhost:3000/api/auth/register \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"lana-1234\",\"name\":\"Dup\"}"

# 3º alta, mismo email con OTRO casing -> se espera 409 también (prueba la normalización)
curl -i -sS -X POST http://localhost:3000/api/auth/register \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$(echo "$EMAIL" | tr 'a-z' 'A-Z')\",\"password\":\"lana-1234\",\"name\":\"Dup\"}"
```

Lectura del resultado:

- **201 / 409 / 409** → el servidor está bien; el defecto (si lo hay) es de
  cliente o de percepción; la deuda 45 se cierra por el lado servidor.
- **201 / 500** → el pre-chequeo falló y saltó el UNIQUE: ahí sí aplica el
  precedente `isDuplicateColorCode` y toca añadir traducción de 23505 en
  `store.create` desenvolviendo `error.cause`.
- **201 / 201** → hay dos filas con el mismo email: mirar la tabla
  (`SELECT id, email FROM users WHERE lower(email) = lower('<email>')`) y las
  constraints (`SELECT conname FROM pg_constraint WHERE conrelid='users'::regclass`).
- **500 / 500** desde el primer alta → es configuración/conexión (candidata A/B),
  no lógica de duplicados.

---

## Deudas colaterales confirmadas por este diagnóstico

Independientemente de cuál sea la causa del síntoma, estas dos son ciertas y
verificables solo leyendo el código:

1. **`store.create` no traduce el 23505 de `users_email_unique`**
   (`src/features/auth/api/store.ts:45-52`). Un choque con la constraint entrega
   **500** con `"Error interno del servidor."` en vez de **409** con el mensaje
   accionable. Es el mismo agujero que el smoke destapó en `isDuplicateColorCode`,
   y el fix tiene la misma forma: inspeccionar recursivamente `error.cause`
   (donde vive el `NeonDbError` con `code: "23505"` y `constraint`).
2. **`registerUser` tiene una ventana de carrera** entre `findByEmail` y `create`
   (`src/features/auth/api/register.ts:15-24`), ensanchada por el `await
   hashPassword(...)` intermedio. Sin (1), esa carrera se manifiesta como 500.

**Columna `email` como `text` y no `citext`:** documentado, no accionable por sí
solo mientras la normalización de zod siga siendo la única puerta de escritura.
Merece una nota si alguna vez se inserta en `users` fuera del BFF.
