# Research — `src/proxy.ts` en Next.js 16 (feature #4 `auth_jwt`)

> **Fecha:** 2026-07-21
> **Versión verificada:** `next@16.2.10` (instalada en `node_modules`, confirmada con
> `require('next/package.json').version`).
> **Método:** context7 **no estaba disponible** en el entorno (no hay herramientas MCP
> `context7`; `ToolSearch` devolvió "No matching deferred tools found"). Se sustituyó por
> una fuente **más fuerte**: el **código fuente compilado del paquete instalado** y los
> **docs oficiales que Next.js empaqueta dentro de `node_modules/next/dist/docs/`**
> (es decir, la doc exacta de la versión instalada), contrastados con
> `https://nextjs.org/docs/app/api-reference/file-conventions/proxy` (doc online, v16.2.11).
> Cada afirmación de abajo lleva su cita de archivo.

---

## Resumen ejecutivo (lo que cambia el diseño)

1. **`proxy.ts` corre SIEMPRE en runtime Node.js.** No es edge. No es opcional. Poner
   `export const runtime = ...` en `proxy.ts` es un **error de build**. Esto invalida toda la
   guía histórica de "en middleware solo podés usar `jose` porque no hay APIs de Node".
   → **Podemos usar `node:crypto`, `jsonwebtoken`, `bcrypt`, lo que sea, dentro del proxy.**
2. **Los route groups `(app)` NO existen en la URL.** El matcher **no puede** escribir
   `(app)/**`. Hay que matchear las URLs reales. Esto es el error más probable del implementer
   si lee el PRD §10 literalmente.
3. **`cookies()` de `next/headers` es `async` en Next 16** → `(await cookies()).set(...)`.
4. El PRD **no se contradice** con la API real en la firma ni en la ubicación. Solo hay que
   precisar el punto 2 (route groups) — ver §7.

---

## 1. Firma, export y ubicación exactos

### Ubicación

Verificado en `node_modules/next/dist/lib/constants.js:289-290`:

```js
const PROXY_FILENAME = 'proxy';
const PROXY_LOCATION_REGEXP = `(?:src/)?${PROXY_FILENAME}`;
```

Y en `node_modules/next/dist/build/utils.js:1131`:

```js
function isProxyFile(file) {
    return file === `/${_constants.PROXY_FILENAME}` || file === `/src/${_constants.PROXY_FILENAME}`;
}
```

→ **Solo dos ubicaciones válidas: `/proxy.ts` (raíz) o `/src/proxy.ts`.** Debe quedar al mismo
nivel que `app/`. Como este repo tiene `src/app/`, la ubicación correcta es **`src/proxy.ts`**.
**Coincide con el PRD §10 y §3.** ✅

### Export

Verificado en `node_modules/next/dist/build/templates/middleware.js`:

```js
const isProxy = page === '/proxy' || page === '/src/proxy';
const handlerUserland = (isProxy ? mod.proxy : mod.middleware) || mod.default;
...
if (typeof handlerUserland !== 'function') {
    throw new ProxyMissingExportError(
      `The ${isProxy ? 'Proxy' : 'Middleware'} file "${page}" must export a function named `
      + `\`${isProxy ? 'proxy' : 'middleware'}\` or a default function.`);
}
```

→ Vale **named export `proxy`** o **`export default`**. El named export `proxy` es el canónico
(es el que produce el codemod oficial). El validador AST
(`dist/build/analysis/get-page-static-info.js:564+`, `validateMiddlewareProxyExports`) acepta:
`export function proxy`, `export const proxy = ...`, `export { x as proxy }` y default.

**`async` es válido y opcional.** El runner hace `await fn(...args)`
(`errorHandledHandler` en `dist/build/templates/middleware.js`). Doc online:
*"This function can be marked `async` if using `await` inside"*.
→ Como vamos a verificar la firma del JWT (async con `jose`), **usaremos `async`**.

### Firma de tipos

`node_modules/next/dist/server/web/types.d.ts:44-63`:

```ts
export type NextMiddlewareResult = NextResponse | Response | null | undefined | void;
/** @deprecated Use `NextProxy` instead. Middleware has been renamed to Proxy. */
export type NextMiddleware = (request: NextRequest, event: NextFetchEvent) =>
    NextMiddlewareResult | Promise<NextMiddlewareResult>;
export type NextProxy = NextMiddleware;
```

→ Existe el tipo `NextProxy` exportado desde `next/server`. **`NextMiddleware` está deprecado.**

**Forma canónica a usar:**

```ts
// src/proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) { /* ... */ }

export const config = { matcher: [/* ... */] }
```

---

## 2. Matcher / `config` — y el problema de los route groups

### `config.matcher` sigue existiendo y funcionando

`dist/build/analysis/get-page-static-info.js:373-396` (`parseMiddlewareConfig`) sigue leyendo
`config.matcher`, más `unstable_allowDynamic` y `regions`. La sintaxis es idéntica a Next 15.

Acepta: string, array de strings, o array de objetos `{ source, has, missing, locale }`.

### ⚠️ Los route groups NO son parte de la URL

El PRD §10 dice *"protege `(app)/**` y `/api/**`"*. Eso es una descripción **conceptual**, no un
matcher. `(app)` es un **route group** de App Router: los paréntesis hacen que el segmento
**no aparezca en la URL**. Una página en `src/app/(app)/projects/page.tsx` responde a
**`/projects`**, no a `/(app)/projects`.

→ **Un matcher `'/(app)/:path*'` no matchearía nada de lo que se quiere proteger** (y encima
`(app)` se interpretaría como grupo de captura regex del path literal `app`).
**Esto NO es una contradicción del PRD; es una precisión técnica que el implementer debe aplicar.**

Además, hoy `src/app/` solo tiene `layout.tsx` y `page.tsx` — **el route group `(app)` todavía no
existe**, lo crea esta feature. Por eso conviene un matcher que **no dependa** de la lista concreta
de rutas privadas.

### Estrategia recomendada: matcher amplio + allowlist explícita en código (fail-closed)

Codificar las excepciones dentro de un mega-regex es frágil y **falla-abierto** si te equivocás.
La doc oficial advierte además que sin matcher el proxy corre sobre `_next/static`, `_next/image`
y `public/`, lo que rompería CSS/JS/imágenes.

Matcher: excluir **solo assets**. Lógica de público/privado: **en TypeScript**, donde es legible
y testeable.

```ts
export const config = {
  matcher: [
    // Todo excepto assets estáticos y archivos con extensión.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

Reglas de `source` (doc oficial, sección Matcher):
1. DEBE empezar con `/`.
2. Params nombrados: `/about/:path` (un segmento), `/about/:path*` (cero o más), `:path+`, `:path?`.
3. Regex entre paréntesis: `/about/(.*)`.
4. **Anclado al inicio**: `/about` matchea `/about` y `/about/team`, pero no `/blog/about`.
5. Soporta negative lookahead: `'/((?!api|_next/static).*)'`.

### 🚨 Gotcha crítico: el matcher debe ser una constante estática

Doc oficial, *Good to know*:

> The `matcher` values need to be constants so they can be statically analyzed at build-time.
> **Dynamic values such as variables will be ignored.**

Se evalúa vía `extractExportedConstValue` sobre el AST **en build**, sin ejecutar el módulo.
→ **NO** hacer `import { PUBLIC_ROUTES } from '@/shared/config'` y usarlo dentro de `config.matcher`.
Se ignora **en silencio** y el proxy pasa a correr en todas las rutas (o en ninguna). Literal
inline siempre.

### Otros gotchas de matcher confirmados

- **`_next/data` se ejecuta igual aunque lo excluyas.** Doc oficial:
  > Even when `_next/data` is excluded in a negative matcher pattern, proxy will still be invoked
  > for `_next/data` routes. This is intentional behavior to prevent accidental security issues.
- **Server Functions (`'use server'`) no son rutas propias**: son POST a la ruta donde se usan.
  Si el matcher excluye ese path, la Server Function queda **sin cobertura de proxy**.
  → Refuerza que la autorización real va en el servicio (coincide con PRD §10:
  *"Cada servicio filtra por `userId`"*).
- Next.js agrega automáticamente sufijos internos al source (`.rsc`, `/_next/data/<build-id>/...`)
  — ver `getMiddlewareMatchers` en `get-page-static-info.js:332`. No hay que manejarlo a mano.

---

## 3. Runtime — **el hallazgo más importante**

### Proxy siempre corre en Node.js

`dist/build/analysis/get-page-static-info.js:583-598`:

```js
let resolvedRuntime = config.runtime ?? config.config?.runtime;
if (isProxyFile(page) && resolvedRuntime) {
    const message = `Route segment config is not allowed in Proxy file at "${resolvedPath}". `
        + `Proxy always runs on Node.js runtime. `
        + `Learn more: https://nextjs.org/docs/messages/middleware-to-proxy`;
    if (isDev) {
        _log.errorOnce(message);
        resolvedRuntime = SERVER_RUNTIME.nodejs;
    } else {
        throw new Error(message);  // __NEXT_ERROR_CODE: "E1031"
    }
}
```

Y `dist/build/index.js:1520-1525`:

```js
if (staticInfo.runtime === 'nodejs' || isProxyFile(page)) {
    hasNodeMiddleware = true;
    functionsConfigManifest.functions['/_middleware'] = {
        runtime: 'nodejs',
        ...
    };
}
```

Doc oficial (sección *Runtime*):

> Proxy defaults to using the Node.js runtime. The `runtime` config option is not available in
> Proxy files. **Setting the `runtime` config option in Proxy will throw an error.**

Version history: `v16.0.0` — *"Middleware is deprecated and renamed to Proxy. **Proxy defaults to
the Node.js runtime**"*.

### Consecuencias prácticas

| | Middleware Next 15 (edge por defecto) | **Proxy Next 16 (Node siempre)** |
|---|---|---|
| `node:crypto` | ❌ | ✅ |
| `jsonwebtoken` | ❌ | ✅ |
| `bcrypt` / `bcryptjs` | ❌ | ✅ |
| `export const runtime` | ✅ (`'edge'` \| `'nodejs'`) | ❌ **error de build E1031** |
| `jose` | ✅ (obligatorio en la práctica) | ✅ (sigue siendo buena opción) |

→ **NO hay restricción de APIs de Node dentro de `src/proxy.ts`.** Toda guía que diga
"en middleware usá `jose` porque `jsonwebtoken` no funciona en edge" **ya no aplica** a `proxy.ts`.

### Pero: mantener el import graph del proxy chico

Doc oficial, *Good to know* del top:

> Proxy is meant to be invoked separately of your render code and in optimized cases deployed to
> your CDN for fast redirect/rewrite handling, you should not attempt relying on shared modules
> or globals.

Y en la guía de auth empaquetada (`dist/docs/01-app/02-guides/authentication.md:1031`):

> since Proxy runs on every route, including **prefetched** routes, it's important to only read the
> session from the cookie (**optimistic checks**), and **avoid database checks** to prevent
> performance issues.

→ **Regla dura para el implementer:** `src/proxy.ts` **no debe importar** nada que arrastre
Drizzle / `@neondatabase/serverless` / `shared/db`. Solo verificación de firma del JWT.
La verificación "real" (usuario existe, scoping) va en los Route Handlers / servicios.

---

## 4. Leer la cookie y responder (redirect vs 401 JSON)

### Leer

`request.cookies` es una `RequestCookies` con `get`, `getAll`, `has`, `delete`, `clear`.

```ts
const token = request.cookies.get('kc_session')?.value
// get() devuelve { name, value } | undefined  → ojo con el ?.value
```

(La guía de auth oficial usa `(await cookies()).get(...)` dentro del proxy; funciona, pero
`request.cookies.get()` es directo, síncrono y no depende del async store. **Usar
`request.cookies`.**)

### Responder distinto según API vs página

Producir respuesta directa desde el proxy está soportado desde v13.1. Doc oficial
(*Producing a response*) usa exactamente el caso 401:

```ts
if (!isAuthenticated(request)) {
  return Response.json({ success: false, message: 'authentication failed' }, { status: 401 })
}
```

Patrón para este repo:

```ts
const { pathname } = request.nextUrl

if (pathname.startsWith('/api/')) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

const loginUrl = new URL('/login', request.nextUrl)
loginUrl.searchParams.set('next', pathname)
return NextResponse.redirect(loginUrl)
```

Notas:
- `NextResponse.redirect` exige **URL absoluta** → construir con `new URL(path, request.nextUrl)`.
- Devolver `NextResponse.next()` (o `undefined`) deja pasar la request.
- **No** usar `redirect()` de `next/navigation` dentro del proxy: el runner lo detecta y tira
  *"Next.js navigation API is not allowed to be used in Proxy."*
  (`dist/build/templates/middleware.js`, rama `isNextRouterError`).

---

## 5. Setear / borrar la cookie httpOnly desde un Route Handler

### `cookies()` es **async** en Next 16 — confirmado en los tipos instalados

`node_modules/next/dist/server/request/cookies.d.ts`:

```ts
export declare function cookies(): Promise<ReadonlyRequestCookies>;
```

Y `dist/server/web/spec-extension/adapters/request-cookies.d.ts`:

```ts
export type ReadonlyRequestCookies =
    Omit<RequestCookies, 'set' | 'clear' | 'delete'> & Pick<ResponseCookies, 'set' | 'delete'>;
```

→ Pese al nombre `Readonly`, **`set` y `delete` SÍ están disponibles** (vienen de
`ResponseCookies`). Funcionan en Route Handlers y Server Actions.

### Opción A — `cookies()` de `next/headers`

Snippet de la guía oficial empaquetada (`dist/docs/01-app/02-guides/authentication.md:636+`),
con las **opciones recomendadas**:

```ts
import { cookies } from 'next/headers'

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ userId, expiresAt })
  const cookieStore = await cookies()

  cookieStore.set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}
```

Borrado (logout):

```ts
const cookieStore = await cookies()
cookieStore.delete('session')
```

### Opción B — `NextResponse.cookies.set` (recomendada aquí)

```ts
const response = NextResponse.json({ user }, { status: 200 })
response.cookies.set({
  name: 'kc_session',
  value: token,
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
})
return response
```

Logout:

```ts
const response = NextResponse.json({ ok: true })
response.cookies.delete('kc_session')   // o .set({ name, value: '', maxAge: 0, path: '/' })
return response
```

**Por qué B:** es explícita, va acoplada a la respuesta que se devuelve, no depende del async
storage, y es **trivial de testear** con Vitest (se inspecciona `response.headers.get('set-cookie')`
sin montar un request context de Next). Los tests del `acceptance` de la feature #4 lo agradecen.

⚠️ `secure: true` fijo rompe el login en `http://localhost` en dev. Usar
`process.env.NODE_ENV === 'production'`.

---

## 6. Rupturas conocidas vs `middleware.ts` de Next 15

| # | Next 15 (`middleware.ts`) | Next 16 (`src/proxy.ts`) | Fuente |
|---|---|---|---|
| 1 | archivo `middleware.ts` | **`proxy.ts`**; `middleware.ts` **deprecado** con `warnOnce` | `dist/build/index.js:651` |
| 2 | export `middleware` | export **`proxy`** (o default) | `dist/build/templates/middleware.js` |
| 3 | **edge** por defecto | **Node.js siempre** | `get-page-static-info.js:587` |
| 4 | `export const runtime = 'nodejs'` opt-in (estable desde 15.5) | **prohibido → build error E1031** | idem |
| 5 | `cookies()` async (ya en 15) | async (sin cambio) | `dist/server/request/cookies.d.ts` |
| 6 | `skipMiddlewareUrlNormalize` | renombrado a **`skipProxyUrlNormalize`** | doc oficial, *Advanced Proxy flags* |
| 7 | tipo `NextMiddleware` | **`NextProxy`**; `NextMiddleware` deprecado | `dist/server/web/types.d.ts:51` |
| 8 | — | **Tener `middleware.ts` Y `proxy.ts` a la vez = build error** | `dist/build/index.js:641-650` |

Error exacto del #8:

```
Both middleware file "./src/middleware.ts" and proxy file "./src/proxy.ts" are detected.
Please use "./src/proxy.ts" only.
```

Codemod oficial (no lo necesitamos, no hay middleware previo):
`npx @next/codemod@canary middleware-to-proxy .` — ⚠️ en este repo sería `pnpm dlx`, nunca `npx`.

### ❗ Discrepancia doc-online vs implementación real (verificada)

La doc online dice que existe `unstable_doesProxyMatch` en `next/experimental/testing/server`.
**En `next@16.2.10` instalado ese export NO existe.** El único disponible es el nombre viejo:

`node_modules/next/dist/experimental/testing/server/middleware-testing-utils.d.ts:13`

```ts
export declare function unstable_doesMiddlewareMatch({ config, url, headers, cookies, nextConfig }): boolean
```

`index.d.ts` exporta además `getRedirectUrl`, `getRewrittenUrl`, `isRewrite`.

→ Si se testea el matcher, usar **`unstable_doesMiddlewareMatch`**. `unstable_doesProxyMatch`
tira `undefined is not a function`.

---

## 7. Contraste con la documentación del repo

| Afirmación del repo | Veredicto |
|---|---|
| PRD §10 / §3: `proxy.ts` vive en la raíz de `src/` | ✅ **Correcto** (`(?:src/)?proxy`) |
| PRD §10: exporta la función `proxy(request: NextRequest)` | ✅ **Correcto** y canónico |
| PRD §10 / `architecture.md:15`: reemplaza a `middleware.ts` | ✅ **Correcto** |
| PRD §10: cookie httpOnly `SameSite=Lax` | ✅ Coincide con la recomendación oficial |
| PRD §10: *"protege `(app)/**` y `/api/**`"* | ⚠️ **Precisión necesaria** — es una descripción conceptual. `(app)` es route group y **no aparece en la URL**; el matcher debe usar URLs reales. Ver §2. |
| PRD §10: *"Cada servicio filtra por `userId`"* | ✅ **Reforzado** por la doc: el proxy es un chequeo *optimista*; la autorización real va en el servicio |

**No hay contradicción real entre el PRD y la API de Next 16.** El único punto a vigilar es el
matcher con route groups (§2), que el PRD no especifica a nivel de sintaxis.

---

## 8. Recomendación para el implementer

Decisiones cerradas. No son opciones.

### 8.1 Archivo y firma

- Crear **`src/proxy.ts`** (NO en la raíz del repo, NO `middleware.ts`).
- **`export async function proxy(request: NextRequest)`** — named export, async.
- **NO** exportar `runtime` ni ningún route segment config. Rompe el build.
- **NO** crear `src/middleware.ts`. Coexistir = build error.

### 8.2 Matcher

- Un único matcher amplio que excluye solo assets, **literal inline** (nunca una constante importada).
- La distinción público/privado va **en código**, con allowlist explícita (fail-closed).
- **No** intentar `(app)` en el matcher.

### 8.3 Runtime y dependencias

- Asumir **Node.js runtime**. Sin restricciones de API.
- **JWT: usar `jose` (HS256)** — `pnpm add jose`. Tipado, mantenido, valida `exp` sola,
  sin binarios nativos, y sirve igual en Route Handlers y en el proxy. (`jsonwebtoken` también
  funcionaría ahora, pero `jose` tiene mejores tipos y API async uniforme.)
- **Hashing: `bcryptjs`** — `pnpm add bcryptjs` + `pnpm add -D @types/bcryptjs`. Pure-JS, sin
  compilación nativa → sin sorpresas en el build de Vercel. Cumple el PRD ("bcrypt/argon2").
- Usar **`pnpm`**, nunca `npm`/`npx`.
- ⚠️ **`src/proxy.ts` no debe importar `shared/db` ni nada que arrastre Drizzle/Neon.**
  El helper de JWT debe vivir en un módulo hoja (`src/shared/lib/jwt.ts`) sin dependencias de DB.

### 8.4 Secretos y constantes

- `JWT_SECRET` por env (`src/shared/config`), validado con Zod al arrancar. Fallar ruidoso si falta.
- Nombre de cookie como constante `UPPER_SNAKE` (`conventions.md:32` ya nombra `JWT_COOKIE_NAME`),
  en `src/shared/config`. **Importable desde el proxy** (es un string, no toca el matcher).

### 8.5 Esqueleto listo para usar

```ts
// src/proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { JWT_COOKIE_NAME } from '@/shared/config'
import { verifyToken } from '@/shared/lib/jwt'

/** Rutas de API que NO requieren sesión. */
const PUBLIC_API_ROUTES = ['/api/auth/register', '/api/auth/login'] as const
/** Páginas que NO requieren sesión. */
const PUBLIC_PAGES = ['/', '/login', '/register'] as const

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith('/api/')

  const isPublic = isApi
    ? PUBLIC_API_ROUTES.some((r) => pathname === r)
    : PUBLIC_PAGES.some((r) => pathname === r)

  if (isPublic) return NextResponse.next()

  const token = request.cookies.get(JWT_COOKIE_NAME)?.value
  const payload = token ? await verifyToken(token) : null

  if (!payload) {
    if (isApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.nextUrl)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // ⚠️ Literal inline obligatorio: se analiza estáticamente en build.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

⚠️ `PUBLIC_PAGES` usa igualdad exacta a propósito (fail-closed). Si más adelante hay subrutas
públicas, usar `startsWith` **solo** para esos prefijos concretos, nunca genérico.

### 8.6 Cookie desde los Route Handlers

Helper único en `src/shared/lib/session.ts`, usado por `login`, `register` y `logout`:

```ts
export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: JWT_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  })
  return response
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: JWT_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return response
}
```

### 8.7 Seguridad — no confiar solo en el proxy

El proxy es **optimista** (solo valida la firma de la cookie). El `acceptance` pide un
*"helper de verificación de sesión reutilizable en `shared/lib` (extrae `userId`)"*: ese helper
debe usarse **dentro de cada Route Handler**, no solo en el proxy. Motivos confirmados por la doc:
Server Functions pueden quedar fuera del matcher, y un refactor de matcher puede quitar cobertura
en silencio.

### 8.8 Tests (`acceptance` de la feature #4)

- Registro válido / login válido / credenciales inválidas (401) → testear los Route Handlers
  invocándolos directo e inspeccionando `response.headers.get('set-cookie')`.
- Acceso protegido sin token (401) → invocar `proxy(new NextRequest('http://localhost/api/projects'))`
  y assertear `status === 401`.
- Si se testea el matcher: **`unstable_doesMiddlewareMatch`** (NO `unstable_doesProxyMatch`, no existe
  en 16.2.10).

---

## 9. Lo que NO se pudo confirmar

- **context7 no estaba disponible** en este entorno; se usó el código fuente instalado + los docs
  empaquetados en `node_modules/next/dist/docs/` (que son de la versión exacta instalada) + la doc
  online. Considero la evidencia **más fuerte** que context7, no más débil.
- Los docs empaquetados corresponden a `16.2.10`; la página online declara `version: 16.2.11`.
  No detecté diferencias relevantes entre ambas para este tema.
- No verifiqué empíricamente (sin ejecutar build) el error E1031 ni el conflicto
  `middleware.ts` + `proxy.ts`; ambos están leídos directamente del código de build, que es
  inequívoco.
- No investigué el comportamiento del proxy bajo `next start` self-hosted vs Vercel más allá de la
  tabla *Platform support* (Node server ✅, Docker ✅, static export ❌).
