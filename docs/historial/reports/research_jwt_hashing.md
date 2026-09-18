# Research: JWT + hashing de password (feature #4 `auth_jwt`)

> Fecha: 2026-07-21 · Alcance: elección de librerías, snippets listos, reparto edge/node, testing con Vitest 4.
> **Nota metodológica:** las herramientas MCP `context7` **no están disponibles** en este entorno
> (`ToolSearch` no devuelve ninguna herramienta `context7__*`). La investigación se hizo con
> **doc oficial vía WebFetch** (nextjs.org, README/docs de `jose` y `bcrypt.js`), **registry de npm**
> y **verificación empírica ejecutando las librerías** en un sandbox con pnpm 11 + Node v24.11.1.
> Todo lo marcado como “verificado” se ejecutó de verdad; lo no confirmado está marcado explícitamente.

---

## 0. Stack real verificado (`package.json`)

| Item | Valor |
|---|---|
| Next.js | `^16.2.10` |
| TypeScript | `^5.9.3`, `strict: true`, `verbatimModuleSyntax: true`, `noUncheckedIndexedAccess: true`, `moduleResolution: "bundler"`, `target: ES2022` |
| Módulos | `"type": "module"` (ESM puro) |
| Package manager | `pnpm@11.9.0` (regla dura del repo: **nunca npm/npx**) |
| Tests | `vitest ^4.1.10`, `environment: "node"`, alias `@ → ./src`, include `src/**/*.{test,spec}.{ts,tsx}` |
| DB | `@neondatabase/serverless ^1.1.0` + `drizzle-orm ^0.45.2` |
| Env ya previsto | `JWT_SECRET` ya está en `.env.example` (marcado “feature #4”) |

---

## 1. HALLAZGO QUE CAMBIA EL PLANTEAMIENTO: **`proxy.ts` NO corre en edge**

La pregunta original asume que `proxy.ts` corre en edge. **Eso es falso en Next.js 16.**

Doc oficial, `proxy.js` API reference (v16.2.11), sección *Runtime*:

> "Proxy defaults to using the Node.js runtime. The `runtime` config option is not available in Proxy
> files. Setting the `runtime` config option in Proxy will throw an error."

Doc oficial, *Upgrading: Version 16*, sección `middleware` to `proxy`:

> "The `edge` runtime is **NOT** supported in `proxy`. The `proxy` runtime is `nodejs`, and it cannot be
> configured. If you want to continue using the `edge` runtime, keep using `middleware`."

Version history de la misma página: `v16.0.0` — *"Middleware is deprecated and renamed to Proxy. Proxy
defaults to the Node.js runtime"*.

**Consecuencia:** en este proyecto **no existe código en edge runtime**. `proxy.ts` = Node. Route Handlers
= Node (default). Por tanto la restricción “edge no puede hacer bcrypt” **no aplica técnicamente**… pero la
conclusión arquitectónica sigue siendo la misma por otros motivos (ver §4).

Otra cita relevante de la misma doc, que condiciona el diseño de seguridad:

> "Always verify authentication and authorization inside each Server Function rather than relying on
> Proxy alone."

> "Proxy is meant to be invoked separately of your render code and in optimized cases deployed to your
> CDN for fast redirect/rewrite handling, you should not attempt relying on shared modules or globals."

Fuentes:
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- https://nextjs.org/docs/app/guides/upgrading/version-16

---

## 2. JWT: `jose` vs `jsonwebtoken` vs alternativas

### Comparativa (datos del registry de npm, consultados hoy)

| Librería | Última | ESM | Deps | Runtime | Veredicto |
|---|---|---|---|---|---|
| **`jose`** | **6.2.4** | ESM nativo (`"type":"module"`, exports con `types`+`default`, tree-shakeable) | **0 dependencias** | Universal: Node, Deno, Bun, Cloudflare Workers, browsers, edge. Basada en **Web Crypto API** | ✅ **ELEGIDA** |
| `jsonwebtoken` | 9.0.3 | **CJS** (sin campo `exports`, sin `"type":"module"`) | **10 deps** (`jws`, `semver`, `ms`, 6× `lodash.*`) | Solo Node (usa `node:crypto` síncrono) | ❌ CJS + 10 deps en un repo ESM puro; API síncrona con callbacks; no portable |
| `jwt-simple`, `njwt`, etc. | — | — | — | — | ❌ Sin mantenimiento comparable / superficie menor de auditoría |
| `next-auth`/`@auth/core` | — | — | muchas | — | ❌ Fuera de alcance: el PRD §10 pide **JWT propio**, no una librería de auth completa |

### Decisión: **`jose`**

Razones cerradas:
1. **ESM nativo con 0 dependencias** — encaja exacto con `"type": "module"` + `verbatimModuleSyntax`.
2. Basada en **Web Crypto API** → el mismo código funciona en Node, en edge y en el runtime de tests de
   Vitest, sin `#if`s ni bundling especial. Aunque hoy no usemos edge, no nos ata.
3. API `async` moderna, tipada, con **validación de claims integrada** (`issuer`, `audience`,
   `algorithms`, `clockTolerance`) y **clases de error específicas**, lo que permite mapear a `401` limpio.
4. `algorithms: ["HS256"]` explícito en verify → inmune a *algorithm confusion* / `alg: none`
   (verificado empíricamente, ver abajo).

### Comportamiento verificado empíricamente (ejecutado, no copiado de la doc)

Con `jose@6.2.3` + Node v24.11.1:

```
token parts: 3
payload: {"sub":"user-1","iat":...,"iss":"knit-crochet","aud":"knit-crochet-app","exp":...}
header:  {"alg":"HS256","typ":"JWT"}
firma manipulada → JWSSignatureVerificationFailed  code=ERR_JWS_SIGNATURE_VERIFICATION_FAILED
token expirado   → JWTExpired                      code=ERR_JWT_EXPIRED
secreto erróneo  → JWSSignatureVerificationFailed  code=ERR_JWS_SIGNATURE_VERIFICATION_FAILED
algorithms:["HS512"] sobre token HS256 → JOSEAlgNotAllowed code=ERR_JOSE_ALG_NOT_ALLOWED
```

Todas las clases de error heredan de `errors.JOSEError`, así que un solo `instanceof errors.JOSEError`
captura el conjunto y lo traduce a `InvalidSessionError` → `401`.

---

## 3. Hashing de password: `bcrypt` vs `bcryptjs` vs `argon2` vs `@node-rs/argon2`

| Librería | Última | Binario nativo | ESM | Deps | Instala limpio con pnpm en Vercel | Route Handlers | Edge |
|---|---|---|---|---|---|---|---|
| **`bcryptjs`** | **3.0.3** | **No — JS puro** | ESM nativo (`"type":"module"`, exports import/require, **tipos propios**) | **0** | ✅ sin scripts de build | ✅ | ⚠️ importa `crypto` estáticamente (ver nota) |
| `bcrypt` | 6.x | **Sí** (`node-gyp` / prebuilds) | CJS | `node-addon-api`, `node-gyp-build` | ⚠️ requiere `pnpm.onlyBuiltDependencies`; riesgo de mismatch de ABI/glibc en Vercel | ✅ | ❌ |
| `argon2` | 0.45.0 | **Sí** (`node-addon-api` + `node-gyp-build`) + arrastra `cross-env` como **dependency** | CJS | 4 | ⚠️ igual que arriba, y peor (dep rara en prod) | ✅ | ❌ |
| `@node-rs/argon2` | 2.0.2 | **Sí** (napi-rs, paquetes `optionalDependencies` por plataforma) | CJS | 0 directas + N optionals por plataforma | ⚠️ pnpm + optional deps por plataforma es la fuente clásica de fallos "module not found" en CI/Vercel | ✅ | ❌ |

> El PRD §10 dice literalmente “password hasheado (**bcrypt/argon2**)”, así que cualquiera cumple.

### Decisión: **`bcryptjs@3`**

Justificación cerrada, contra los criterios (a)(b)(c) pedidos:

- **(a) Instalación bajo pnpm en Vercel:** `bcryptjs` es **JavaScript puro, sin `install`/`postinstall`
  scripts, sin `node-gyp`, sin binarios por plataforma, 0 dependencias**. Verificado: `pnpm add bcryptjs@3`
  resuelve e instala en ~1.5 s sin ningún paso de build. Esto elimina de raíz el problema conocido de pnpm
  (que **bloquea scripts de postinstall por defecto** y exige `pnpm.onlyBuiltDependencies`) y el de los
  binarios nativos compilados en una arquitectura distinta a la del runtime de Vercel.
  El repo ya tiene un `pnpm-workspace.yaml` con configuración; **no hace falta tocarlo** para bcryptjs.
- **(b) Route Handlers:** ✅ funciona sin más; los Route Handlers corren en Node por defecto.
- **(c) Edge:** en la práctica **no**. `bcryptjs/index.js` hace `import nodeCrypto from "crypto"` de forma
  **estática** (usa `crypto.getRandomValues` de Web Crypto cuando está, y cae al módulo `crypto` de Node si
  no). Ese import estático de un módulo Node es lo que rompe/ensucia el bundle en edge.
  **No pude confirmarlo empíricamente en el edge runtime de Vercel** (marcado como no verificado); es
  irrelevante aquí porque **no hay código nuestro en edge** (§1).
- **Coste de CPU:** bcryptjs es ~30 % más lento que el binding nativo (dato del propio README). Medido en
  este entorno: **cost 10 → 167 ms**, **cost 12 → 604 ms**, `compare` → 171 ms.
  → **Se fija `BCRYPT_COST = 12`** (~0,6 s por register/login). Está muy por debajo del límite de duración
  de una Serverless Function en Vercel y es el estándar recomendado hoy. Si el implementer detecta
  timeouts en el plan Hobby, bajar a 10 es aceptable (deja constancia en el report).

### Comportamiento verificado empíricamente

Con `bcryptjs@3.0.3`:
```
hash cost10: 167 ms · len 60 · prefijo "$2b$10$"
hash cost12: 604 ms
compare(correcta) → true (171 ms)
compare(incorrecta) → false
truncates("x".repeat(80)) → true   // avisa de que bcrypt trunca a 72 bytes
```

**Trampa a documentar:** bcrypt (cualquier implementación) **trunca la password a 72 bytes**. La
validación Zod de `password` debe poner un `.max()` razonable (p. ej. `.max(72)`) para que dos passwords
distintas no colisionen silenciosamente. `bcryptjs` expone `truncates(password): boolean` para detectarlo.

Fuentes: https://github.com/dcodeIO/bcrypt.js (README v3) · registry npm.

---

## 4. Consecuencia arquitectónica (respuesta explícita)

**La conclusión propuesta se CONFIRMA, pero la razón es distinta a la supuesta.**

- ❌ **Refutado el motivo:** *"el hashing no corre en edge, por eso `proxy.ts` solo verifica"*.
  En Next.js 16 `proxy.ts` **corre en Node**, así que técnicamente *podría* hashear.
- ✅ **Confirmada la conclusión:** **`proxy.ts` solo VERIFICA el JWT; register/login con hashing viven en
  Route Handlers.** Motivos válidos, independientes del runtime:
  1. `proxy` se ejecuta en **toda** petición que matchee. Meter bcrypt (0,6 s) o una consulta a Neon ahí
     penaliza cada navegación. Verificar un HS256 es sub-milisegundo.
  2. Doc oficial: *"Proxy is meant to be invoked separately of your render code and in optimized cases
     deployed to your CDN […] you should not attempt relying on shared modules or globals."* → nada de
     cliente Drizzle/Neon en `proxy.ts`.
  3. Doc oficial de seguridad: *"Always verify authentication and authorization inside each Server
     Function rather than relying on Proxy alone."* → `proxy.ts` es un **filtro barato de primera línea**,
     no la fuente de verdad. **Cada Route Handler privado debe volver a extraer y validar el `userId`**
     con el helper compartido, y filtrar por `userId` (PRD §10: “aislamiento total entre usuarios”).

### Reparto de responsabilidades

| Pieza | Runtime | Qué hace | Qué NO hace |
|---|---|---|---|
| `src/proxy.ts` | Node (forzado por Next 16) | Lee cookie `kc_session`, `verifySessionToken`, redirige/`401`. Deja pasar `/api/auth/login`, `/api/auth/register` y assets | ❌ No toca la DB. ❌ No hashea. ❌ No es la única barrera |
| `src/shared/lib/auth/jwt.ts` | agnóstico (Web Crypto) | `signSessionToken` / `verifySessionToken` | ❌ No importa Drizzle |
| `src/shared/lib/auth/password.ts` | Node | `hashPassword` / `verifyPassword` (bcryptjs) | ❌ **Nunca** se importa desde `proxy.ts` |
| `src/shared/lib/auth/session.ts` | Node | `getSessionUserId()` reutilizable desde Route Handlers (lee `cookies()` de `next/headers`) | — |
| `app/api/auth/{register,login,logout,me}/route.ts` | Node (default) | Zod → hashing → Drizzle → set/clear cookie httpOnly | — |

> Mantener `password.ts` y `jwt.ts` en **archivos separados** es la regla dura: garantiza que el grafo de
> imports de `proxy.ts` nunca arrastre `bcryptjs`.

---

## 5. Versiones exactas y comando pnpm

Ambas son **dependencias de producción**. **Ninguna necesita `@types/*`**: `jose` trae sus tipos y
`bcryptjs@3` también (`@types/bcryptjs` está **deprecado** en npm con el mensaje literal *"This is a stub
types definition. bcryptjs provides its own type definitions, so you do not need this installed."*
→ **NO instalarlo**).

```bash
pnpm add jose@^6.2.4 bcryptjs@^3.0.3
```

Resultado esperado en `package.json > dependencies`:

```json
"bcryptjs": "^3.0.3",
"jose": "^6.2.4"
```

- Última publicada: `jose 6.2.4`, `bcryptjs 3.0.3` (registry, consultado hoy). Verificado funcionando con
  `jose 6.2.3` (lo que resolvió el registry local en la prueba); el rango `^6.2.4` es seguro.
- **No** añadir `pnpm.onlyBuiltDependencies`: ninguna de las dos ejecuta scripts de build.
- **Prohibido** `npm`/`npx` en este repo (regla dura). Si hace falta un binario puntual: `pnpm dlx`.

---

## 6. Snippets listos para usar

### 6.1 `src/shared/lib/auth/jwt.ts` — firmar y verificar (HS256, secret de env, expiración)

> **Typechequeado**: compilado con `tsc --noEmit` bajo `strict`, `verbatimModuleSyntax`,
> `noUncheckedIndexedAccess`, `moduleResolution: "bundler"`, `target: ES2022` → **exit 0**.
> Y ejecutado end-to-end con Node (ver §2).

```ts
import { SignJWT, errors, jwtVerify } from "jose";

export const JWT_COOKIE_NAME = "kc_session";
export const JWT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const JWT_ALG = "HS256";
const JWT_ISSUER = "knit-crochet";
const JWT_AUDIENCE = "knit-crochet-app";
const JWT_EXPIRATION = "7d";

export class MissingJwtSecretError extends Error {
  override readonly name = "MissingJwtSecretError";
  constructor() {
    super("JWT_SECRET no está definida");
  }
}

export class InvalidSessionError extends Error {
  override readonly name = "InvalidSessionError";
  constructor() {
    super("Token de sesión inválido o expirado");
  }
}

export type SessionPayload = { userId: string };

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new MissingJwtSecretError();
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: JWT_ALG, typ: "JWT" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_EXPIRATION)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [JWT_ALG],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new InvalidSessionError();
    }

    return { userId: payload.sub };
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      throw new InvalidSessionError();
    }
    throw error;
  }
}
```

Notas:
- `getSecret()` se llama **dentro** de cada función, no a nivel de módulo → `vi.stubEnv` funciona sin
  `vi.resetModules()`, igual que el patrón lazy ya usado en `src/shared/db/index.ts`.
- `algorithms: ["HS256"]` es **obligatorio**: sin él, `jose` aceptaría cualquier alg soportado.
- `setSubject(userId)` → el `userId` viaja en el claim estándar `sub`.

### 6.2 `src/shared/lib/auth/password.ts` — hashing

```ts
import { compare, hash } from "bcryptjs";

const BCRYPT_COST = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, BCRYPT_COST);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(plainPassword, passwordHash);
}
```

> `bcryptjs@3` expone named exports ESM (`hash`, `compare`, `genSalt`, …) además del default export.
> **Verificado**: `typeof hash === "function"` y `typeof compare === "function"` con `import { compare, hash } from "bcryptjs"`.

### 6.3 Cookie httpOnly (Route Handler)

```ts
import { NextResponse } from "next/server";
import { JWT_COOKIE_NAME, JWT_MAX_AGE_SECONDS } from "@/shared/lib/auth/jwt";

const response = NextResponse.json({ user });
response.cookies.set({
  name: JWT_COOKIE_NAME,
  value: token,
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: JWT_MAX_AGE_SECONDS,
});
```

Logout: mismo `set` con `value: ""` y `maxAge: 0` (o `response.cookies.delete(JWT_COOKIE_NAME)`).

### 6.4 `src/proxy.ts` — solo verifica

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { JWT_COOKIE_NAME, verifySessionToken } from "@/shared/lib/auth/jwt";

const PUBLIC_API_ROUTES = ["/api/auth/login", "/api/auth/register"];

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (PUBLIC_API_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
  const isApi = pathname.startsWith("/api/");

  if (!token) {
    return isApi
      ? NextResponse.json({ error: "No autenticado" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await verifySessionToken(token);
    return NextResponse.next();
  } catch {
    return isApi
      ? NextResponse.json({ error: "No autenticado" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|register).*)"],
};
```

> ⚠️ **Prohibido** exportar `runtime` desde `proxy.ts`: *"Setting the `runtime` config option in Proxy will
> throw an error"* (doc oficial). El matcher debe excluir estáticos, si no bloquea CSS/JS/imágenes.

### 6.5 `src/shared/lib/auth/session.ts` — helper reutilizable (acceptance del feature)

```ts
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME, InvalidSessionError, verifySessionToken } from "@/shared/lib/auth/jwt";

export async function getSessionUserId(): Promise<string> {
  const cookieStore = await cookies(); // Next 16: cookies() es async (breaking change v16)
  const token = cookieStore.get(JWT_COOKIE_NAME)?.value;
  if (!token) {
    throw new InvalidSessionError();
  }
  const { userId } = await verifySessionToken(token);
  return userId;
}
```

> Recordatorio Next 16: `cookies()` y `headers()` **solo son accesibles de forma asíncrona** (el acceso
> síncrono fue eliminado en v16).

---

## 7. Testing con Vitest 4 (sin DB real)

Estilo de referencia observado en `src/shared/db/index.test.ts` y `src/shared/config/index.test.ts`:
- `import { describe, expect, it, vi } from "vitest"` (nada de globals).
- `vi.stubEnv(...)` + `afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); })`.
- Import dinámico `await import("@/shared/...")` cuando el módulo lee env.
- Aserciones de error por **clase** y por `error.name`, con `expect.unreachable(...)` en el camino que no
  debe alcanzarse.

### 7.1 `src/shared/lib/auth/jwt.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

const SECRET = "test-secret-suficientemente-largo-para-hs256";

describe("shared/lib/auth/jwt", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("firma y verifica un token devolviendo el userId", async () => {
    vi.stubEnv("JWT_SECRET", SECRET);
    const { signSessionToken, verifySessionToken } = await import("@/shared/lib/auth/jwt");

    const token = await signSessionToken({ userId: "user-1" });
    expect(token.split(".")).toHaveLength(3);
    await expect(verifySessionToken(token)).resolves.toEqual({ userId: "user-1" });
  });

  it("rechaza un token manipulado", async () => {
    vi.stubEnv("JWT_SECRET", SECRET);
    const { signSessionToken, verifySessionToken, InvalidSessionError } =
      await import("@/shared/lib/auth/jwt");

    const token = await signSessionToken({ userId: "user-1" });
    await expect(verifySessionToken(`${token.slice(0, -2)}xx`)).rejects.toThrow(InvalidSessionError);
  });

  it("rechaza un token firmado con otro secreto", async () => {
    vi.stubEnv("JWT_SECRET", SECRET);
    const { signSessionToken } = await import("@/shared/lib/auth/jwt");
    const token = await signSessionToken({ userId: "user-1" });

    vi.stubEnv("JWT_SECRET", "otro-secreto-completamente-distinto-abc");
    const { verifySessionToken, InvalidSessionError } = await import("@/shared/lib/auth/jwt");
    await expect(verifySessionToken(token)).rejects.toThrow(InvalidSessionError);
  });

  it("rechaza un token expirado", async () => {
    vi.stubEnv("JWT_SECRET", SECRET);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const { signSessionToken, verifySessionToken, InvalidSessionError } =
      await import("@/shared/lib/auth/jwt");
    const token = await signSessionToken({ userId: "user-1" });

    vi.setSystemTime(new Date("2026-02-01T00:00:00Z")); // > 7d
    await expect(verifySessionToken(token)).rejects.toThrow(InvalidSessionError);
  });

  it("falla con MissingJwtSecretError si no hay JWT_SECRET", async () => {
    vi.stubEnv("JWT_SECRET", "");
    const { signSessionToken, MissingJwtSecretError } = await import("@/shared/lib/auth/jwt");

    await expect(signSessionToken({ userId: "user-1" })).rejects.toThrow(MissingJwtSecretError);
  });
});
```

> `vi.stubEnv("JWT_SECRET", "")` reproduce el patrón exacto de `db/index.test.ts` para “env ausente”
> (con el `if (!secret)` del snippet, `""` es falsy → salta el error).
> `vi.useFakeTimers()` funciona con `jose` porque las claims temporales se calculan con `Date.now()`.

### 7.2 `src/shared/lib/auth/password.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/shared/lib/auth/password";

describe("shared/lib/auth/password", () => {
  it("hashea una password con formato bcrypt y no la guarda en claro", async () => {
    const hash = await hashPassword("s3cret-password");

    expect(hash).not.toBe("s3cret-password");
    expect(hash).toHaveLength(60);
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it("genera hashes distintos para la misma password (salt aleatorio)", async () => {
    const [a, b] = await Promise.all([hashPassword("misma"), hashPassword("misma")]);
    expect(a).not.toBe(b);
  });

  it("verifica la password correcta y rechaza la incorrecta", async () => {
    const hash = await hashPassword("s3cret-password");

    await expect(verifyPassword("s3cret-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("otra-password", hash)).resolves.toBe(false);
  });
});
```

> ⏱️ Con `BCRYPT_COST = 12` cada `hashPassword` cuesta ~0,6 s (medido). Este archivo hace 4 hashes
> → ~2,5 s. Está dentro del timeout por defecto de Vitest (5 s **por test**, no por archivo), pero si el
> implementer añade más casos, que use `it("...", { timeout: 15_000 }, ...)` o baje el coste **solo en
> tests** exponiendo el coste como parámetro opcional. **No bajar el coste en producción.**

### 7.3 Testear el borde (`proxy.ts`) — cómo mockear

Next.js 15.1+ expone utilidades oficiales (experimentales) en `next/experimental/testing/server`:

```ts
import { unstable_doesProxyMatch } from "next/experimental/testing/server";

expect(unstable_doesProxyMatch({ config, nextConfig, url: "/test" })).toEqual(false);
```

y para la función entera:

```ts
import { isRewrite, getRewrittenUrl } from "next/experimental/testing/server";

const request = new NextRequest("https://nextjs.org/docs");
const response = await proxy(request);
```

**Recomendación para este repo:** no depender de una API experimental. Testear `proxy.ts` construyendo un
`NextRequest` a mano y comprobando `response.status` / `response.headers.get("location")`:

```ts
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const SECRET = "test-secret-suficientemente-largo-para-hs256";

function requestWithCookie(url: string, token?: string): NextRequest {
  const request = new NextRequest(new URL(url, "https://test.local"));
  if (token) {
    request.cookies.set("kc_session", token);
  }
  return request;
}

describe("proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("responde 401 en /api privado sin token", async () => {
    vi.stubEnv("JWT_SECRET", SECRET);
    const { proxy } = await import("@/proxy");

    const response = await proxy(requestWithCookie("/api/projects"));
    expect(response.status).toBe(401);
  });

  it("deja pasar /api/auth/login sin token", async () => {
    vi.stubEnv("JWT_SECRET", SECRET);
    const { proxy } = await import("@/proxy");

    const response = await proxy(requestWithCookie("/api/auth/login"));
    expect(response.status).toBe(200);
  });

  it("deja pasar una ruta privada con token válido", async () => {
    vi.stubEnv("JWT_SECRET", SECRET);
    const { signSessionToken } = await import("@/shared/lib/auth/jwt");
    const { proxy } = await import("@/proxy");

    const token = await signSessionToken({ userId: "user-1" });
    const response = await proxy(requestWithCookie("/api/projects", token));
    expect(response.status).toBe(200);
  });
});
```

> ⚠️ **No verificado empíricamente**: que `NextRequest` se pueda instanciar dentro de Vitest sin el runtime
> de Next (`vitest.config.ts` usa `environment: "node"`, y `next/server` es ESM que suele importarse bien,
> pero no lo he ejecutado). **El implementer debe validarlo en el primer test**; si `next/server` no
> importa limpio, el plan B es testear una función pura extraída (`resolveProxyDecision(pathname, token)`)
> en `shared/lib/auth` y dejar `proxy.ts` como cascarón fino que solo traduce la decisión a `NextResponse`.
> Esa extracción es, además, el diseño más limpio para el acceptance del feature.

### 7.4 Route Handlers de auth sin DB real

`docs/harness/conventions.md` dice: *"Nada de mocks de DB/fs donde puedas usar un doble real acotado (DB de
test)"*. Recomendación:
- La lógica de negocio (`registerUser`, `loginUser`) vive en `features/auth/api/` recibiendo el cliente
  Drizzle **por parámetro** (o vía una función `getDb()` inyectable).
- Los tests de los caminos de error que no necesitan DB (**credenciales inválidas → 401**, **acceso
  protegido sin token → 401**) se cubren con los tests de §7.1–7.3 + un doble acotado del repositorio de
  usuarios (`{ findByEmail: async () => undefined }`), sin `vi.mock` del módulo Drizzle entero.
- Si el implementer necesita DB real, `DATABASE_URL` apuntando a una branch de Neon de test; si no está
  disponible, `describe.skipIf(!process.env.DATABASE_URL)`.

---

## 8. Recomendación para el implementer (decisiones cerradas)

### Librerías elegidas + versiones

| Rol | Librería | Versión | Tipo | `@types/*` |
|---|---|---|---|---|
| JWT | **`jose`** | `^6.2.4` | `dependencies` | ❌ no hace falta (trae tipos) |
| Hashing | **`bcryptjs`** | `^3.0.3` | `dependencies` | ❌ **no instalar `@types/bcryptjs`** (deprecado) |

Descartadas: `jsonwebtoken` (CJS + 10 deps), `bcrypt` / `argon2` / `@node-rs/argon2` (binarios nativos →
riesgo de instalación con pnpm en Vercel).

### Comando de instalación

```bash
pnpm add jose@^6.2.4 bcryptjs@^3.0.3
```

(Nunca `npm`/`npx`. Para binarios puntuales, `pnpm dlx`.)

### Reparto de responsabilidades edge/node — **decidido**

1. **NO hay código en edge runtime en este proyecto.** En Next.js 16 `proxy.ts` corre en **Node** y el
   runtime **no es configurable**; exportar `runtime` desde `proxy.ts` **lanza error**.
2. **`src/proxy.ts` SOLO verifica el JWT** (`verifySessionToken`) y decide pasar / `401` / redirigir.
   **Nunca** importa `bcryptjs`, ni Drizzle, ni `@/shared/db`.
3. **`src/shared/lib/auth/jwt.ts`** (jose) — sin dependencias de Node ni de DB, importable desde `proxy.ts`.
4. **`src/shared/lib/auth/password.ts`** (bcryptjs) — **archivo separado**, importado **solo** desde los
   Route Handlers de `register`/`login`.
5. **`src/shared/lib/auth/session.ts`** — `getSessionUserId()` con `await cookies()`, reutilizable en todos
   los Route Handlers privados.
6. **Cada Route Handler privado revalida la sesión** con `getSessionUserId()` y filtra por `userId`.
   `proxy.ts` es defensa en profundidad, **no** la única barrera (recomendación explícita de la doc de Next).
7. **Constantes fijadas:** `JWT_COOKIE_NAME = "kc_session"`, `alg = "HS256"`, expiración `7d`
   (`maxAge` 604800), cookie `httpOnly` + `sameSite: "lax"` + `secure` en producción + `path: "/"`,
   `BCRYPT_COST = 12`.
8. **Zod:** `password` con `.min(8).max(72)` (límite de 72 bytes de bcrypt); `email` con `.email()` y
   normalizado a minúsculas antes de consultar/guardar.
9. **Login:** respuesta `401` **genérica** ("Credenciales inválidas") tanto si el email no existe como si
   la password no coincide, para no filtrar qué emails están registrados.

### Puntos NO verificados (que el implementer debe validar)

- Que `NextRequest` / `next/server` se importe limpio en Vitest 4 con `environment: "node"` (§7.3).
  Plan B documentado: extraer la decisión a una función pura.
- El comportamiento exacto de `bcryptjs` bajo edge runtime (irrelevante aquí: no usamos edge).
- Latencia real de `BCRYPT_COST = 12` en las Serverless Functions de Vercel (medido solo en local: ~0,6 s).

---

## Fuentes

- https://nextjs.org/docs/app/api-reference/file-conventions/proxy (v16.2.11)
- https://nextjs.org/docs/app/guides/upgrading/version-16
- https://github.com/panva/jose (README, docs de `SignJWT`, `jwtVerify`, `util/errors`)
- https://github.com/dcodeIO/bcrypt.js (README v3)
- registry.npmjs.org — metadatos de `jose`, `bcryptjs`, `jsonwebtoken`, `argon2`, `@node-rs/argon2`, `@types/bcryptjs`
- Verificación empírica local: pnpm 11.9.0 + Node v24.11.1, `jose@6.2.3` + `bcryptjs@3.0.3`, más
  `tsc --noEmit` con la configuración estricta del proyecto (exit 0).
