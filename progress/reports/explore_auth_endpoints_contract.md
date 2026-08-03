# explore — contrato de los endpoints de auth para #31 `auth_ui`

> **Nota de procedencia:** lo produjo un subagente `Explore` (solo lectura), que **no pudo escribir el
> archivo** porque no tiene herramienta de escritura. El leader lo volcó literalmente aquí. El fallo fue del
> encargo, no del explorador. **Para futuros encargos de exploración: `Explore` no puede escribir; o se usa
> `general-purpose`, o el leader vuelca el resultado.**

---

## 1. `POST /api/auth/login` — `src/app/api/auth/login/route.ts`

- **Body**: `{ email: string, password: string }` (`loginSchema`, `src/features/auth/validation.ts:28-31`).
  `email`: trim + toLowerCase + max 255 + formato email ("El email no es válido."); `password`: solo
  `min(1, "La contraseña es obligatoria.")` — en login **no** se aplica el mínimo de 8.
- **Éxito 200**: `{ user: PublicUser }` (`login/route.ts:20`). `PublicUser` = fila `users` sin
  `passwordHash` → `{ id, email, name, createdAt, updatedAt }` (`types.ts:6`, `schema.ts:3-10`). El JSON
  **no** incluye el token: viaja solo en la cookie.
- **400 validación**: `validationErrorResponse` (`src/shared/lib/http.ts:18-23`) → `{ error: <mensaje del
  PRIMER issue de zod> }`. **No hay `path` ni lista de issues: el cuerpo no identifica el campo.** Body
  no-JSON → `readJsonBody` devuelve `undefined` (`http.ts:26-32`) y cae también en 400.
- **401 credenciales inválidas**: `errorResponse(error.message, 401)` (`login/route.ts:22-24`) →
  **`{ "error": "Email o contraseña incorrectos." }`** (`errors.ts:8-13`). Mismo mensaje exacto para email
  inexistente y password errónea, **a propósito** (`login.ts:16-28`) → **es un error de formulario, no de
  campo**; pintalo a nivel form (o duplicado en ambos campos), nunca infieras "el email no existe".
- **500**: `{ error: "Error interno del servidor." }` (`http.ts:34-40`).
- No se setea cookie en el 401 (verificado en `auth-routes.test.ts:176`).

## 2. `POST /api/auth/register` — `src/app/api/auth/register/route.ts`

- **Body**: `{ email, password, name }` (`registerSchema`, `validation.ts:22-26`). `password`: min 8
  ("La contraseña debe tener al menos 8 caracteres.") / max 72 ("La contraseña no puede superar 72
  caracteres."), constantes en `src/shared/lib/auth/password.ts:5-6`. `name`: trim, min 1 ("El nombre es
  obligatorio."), max 120. **No hay campo `confirmPassword` en el contrato** — si el diseño lo quiere, es
  puramente cliente.
- **Éxito 201**: `{ user: PublicUser }` (`register/route.ts:24`) — ojo, **201, no 200**.
- **400**: idéntico a login (primer issue, sin campo).
- **Email duplicado → 409** (`register/route.ts:26-28`), cuerpo **`{ "error": "Ya existe una cuenta con ese
  email." }`** (`errors.ts:1-6`). **El cuerpo NO dice qué campo falló**: para cumplir "email duplicado →
  error en el campo", el form tiene que mapear `status === 409` ⇒ error del campo `email` (el 409 es
  exclusivo de ese caso en este endpoint).
- Recomendación para pintar errores por campo en el 400: **no dependas del body**; validá en cliente con los
  mismos `loginSchema`/`registerSchema` (te dan `issue.path`) antes de hacer fetch, y reservá el body del
  server para el error de form. (Ver §8: reusar esos schemas en cliente tiene un coste de bundling.)

## 3. Cookie de sesión

- La setea el propio endpoint: `setSessionCookie(...)` en `login/route.ts:20` y `register/route.ts:24`,
  definido en `src/shared/lib/auth/session.ts:54-68`.
- Nombre **`kc_session`** (`src/shared/lib/auth/jwt.ts:3`). Flags: `httpOnly: true`, `sameSite: "lax"`,
  `secure` solo en producción, `path: "/"`, `maxAge = 60*60*24*7` (7 días, `jwt.ts:4`). JWT HS256, iss
  `knit-crochet`, aud `knit-crochet-app`, `sub = userId`, exp 7d (`jwt.ts:41-52`).
- **`register` YA inicia sesión**: devuelve token y setea la cookie igual que login (`register.ts:27` +
  `register/route.ts:24`). **El form NO tiene que encadenar login después del register**; basta con
  redirigir.
- Como es `httpOnly`, el cliente no puede leerla: el fetch debe ir same-origin (por defecto manda cookies) y
  tras el éxito conviene `router.push(destino)` + `router.refresh()` para que los RSC vean la sesión nueva.

## 4. `src/proxy.ts` y el `next`

- Rutas públicas hoy (`proxy.ts:11-14`): APIs `"/api/auth/register"`, `"/api/auth/login"`; páginas por
  **igualdad exacta** `"/"`, `"/login"`, `"/register"`. Todo lo demás es privado (fail-closed).
- Construcción del `next`: `proxy.ts:29-31` → `new URL("/login", request.nextUrl)` +
  `searchParams.set("next", pathname)`. `LOGIN_PATH` se exporta en `proxy.ts:16`.
- **Trampas a tener en cuenta:**
  1. Solo se guarda `pathname`: **se pierde el query string y el hash** del destino original. No hay forma de
     recuperarlos.
  2. **No hay ninguna validación del `next` en el repo** (ni en `proxy.ts` ni en ningún consumidor — no
     existe consumidor). El proxy solo escribe valores que empiezan con `/`, pero un atacante puede fabricar
     `/login?next=https://evil.com` a mano. La página de login **debe** validar: aceptar solo strings que
     empiecen con `/` y **no** con `//` ni `/\` (protocol-relative), y caer a `/` en cualquier otro caso.
     **Esto es trabajo nuevo de #31, no existe hoy.**
  3. `/` es pública pero es el Dashboard (`src/app/(app)/page.tsx`) — el destino de éxito por defecto según
     el acceptance.
  4. **Hoy `/login` y `/register` no existen como páginas**: solo está `src/app/(auth)/layout.tsx` (layout
     limpio, sin nav; comentario en `:4-5` dice que las páginas quedaron fuera de #13). Los redirects del
     proxy hoy terminan en **404**.
  5. Ojo con el import graph del proxy: `proxy.ts:6-8` prohíbe explícitamente importar Drizzle /
     `@/shared/db` / hashing desde ahí.
  6. El `matcher` (`proxy.ts:60-62`) debe seguir siendo un literal inline; no lo toques desde #31.
- API privada sin sesión → `{ error: "No autenticado." }` 401 JSON (`proxy.ts:26-27`); página privada →
  **redirect 307** a `/login?next=<pathname>` (verificado en `src/proxy.test.ts:39-46`).

## 5. `POST /api/auth/logout` y `GET /api/auth/me`

- **logout** (`src/app/api/auth/logout/route.ts:5-7`): sin body, sin params. Siempre **200 `{ ok: true }`** y
  `clearSessionCookie` (`session.ts:70-81`) → `kc_session=""` con `maxAge: 0`, mismos flags. No requiere
  sesión previa (no pasa por `withSession`), pero **está fuera de la allowlist pública del proxy**
  (`proxy.ts:11`): sin cookie válida el proxy lo corta con 401 antes de llegar al handler. Tras llamarlo:
  redirigir a `/login`.
- **me** (`src/app/api/auth/me/route.ts:6-16`): `GET`, envuelto en `withSession` (`http.ts:65-83`). 200 →
  `{ user: PublicUser }`; sin cookie o cookie inválida → **401 `{ error: "No autenticado." }`**; usuario
  borrado → **404 `{ error: "El usuario no existe." }`** (`errors.ts:15-20`); resto → 500. También protegido
  por el proxy (`proxy.test.ts:62-66`).
- **Estado de uso**: cero consumidores en `src/**` hoy. `src/features/auth/ui/AppShellClient.tsx:16-28`
  documenta que el `GET /api/auth/me` en `useEffect` se quitó (deuda 21) y que **#31 es quien vuelve a
  cablear `me` + `logout`**, pasándolos al shell por las props `user` / `onLogout`, que `AppShell` conserva
  reservadas (`src/shared/ui/layout/app-shell/AppShell.tsx:20-29`). Tipo esperado:
  `ArchiveNavUser = { name: string }` (`src/shared/ui/layout/archive-nav/ArchiveNav.tsx:19-21`).
- **Gate de regresión activo**: `src/features/auth/ui/AppShellClient.test.tsx:87-99` falla si montar
  `AppShellClient` dispara **cualquier** fetch, y `:101-114` asertan que `user`/`onLogout` llegan
  `undefined`. Si #31 cablea el menú de cuenta desde el shell, **esos dos tests hay que reescribirlos
  conscientemente** (no borrarlos sin justificar; el comentario explica la deuda 29).

## 6. Patrón de tests de auth (a copiar)

Archivo de referencia: `src/app/api/auth/auth-routes.test.ts`.

- Convención: **un solo archivo por grupo de rutas**, nombrado `<dominio>-routes.test.ts`, colocado en la
  carpeta del recurso (igual que `brands-routes.test.ts`, `yarns-routes.test.ts`…).
- Se dobla **solo el borde de datos** (`:9-43`): `vi.hoisted` con un array en memoria + un `AuthUserStore`
  fake, y `vi.mock("@/features/auth/api/store", ...)` reemplazando `createAuthUserStore`. Route handlers,
  zod, bcrypt y el JWT son **los reales**.
- Cookies: `vi.mock("next/headers")` con un `Map` como cookie jar (`:37`, `:45-52`); para leer la cookie de
  respuesta se parsea el header con un regex sobre `kc_session` (`:100`, `:149`, `:208`).
- Los handlers se importan con `await import(...)` **después** de declarar los mocks (`:54-57`).
- Helper local `jsonRequest(url, body)` construyendo un `Request` con `content-type: application/json`
  (`:59-65`) y una constante `VALID_REGISTRATION` (`:67-71`).
- `beforeEach`: limpiar filas + cookie jar + `vi.stubEnv("JWT_SECRET", SECRET)`; `afterEach`:
  `vi.unstubAllEnvs()` (`:74-82`).
- Aserciones: `response.status`, body por `await response.json()`, y verificación criptográfica real con
  `verifySessionToken(token)` (`:101-103`).
- Config: entorno por defecto **node** (`vitest.config.ts`); los tests de UI marcan
  `// @vitest-environment happy-dom` en la primera línea (ejemplo: `AppShellClient.test.tsx:1`).
  `vitest.setup.ts` registra `toHaveNoViolations` (vitest-axe) globalmente; el runner `axe` se importa
  aparte en cada test de UI. Alias `@` → `src`.

## 7. PRD / RFC — reglas que el form debe respetar

- `docs/product/PRD-01-estructura-funcional.md:386-387` solo declara las formas del body
  (`{ email, password, name }` / `{ email, password }`) y `:429-431` que la password va hasheada y el JWT en
  cookie httpOnly `SameSite=Lax`. **El PRD NO define longitud mínima de password ni formato de email**: la
  única fuente de verdad es `validation.ts` + `password.ts` (min 8 / max 72, `z.email()`, name 1-120, email
  max 255). Tampoco define política de mayúsculas/dígitos/símbolos → **no definido**; no inventes reglas
  extra en cliente o divergirás del server.
- `docs/design/rfc/RFC-01-shell.md:20-21`: landing post-login = Dashboard; auth = pantalla limpia sin
  archivero; **ovillo ASCII de fondo solo en login, no en register**. `:166` confirma que el shell consume
  `me` + `logout` y nada más. `:137` (enmienda E7) es el porqué de que los utils salieran del nav hasta #31.

## 8. Trampas de bundling para el form cliente

- **No importes desde el barrel `@/features/auth`**: `src/features/auth/index.ts:1` reexporta `./api`, que
  exporta `store.ts` → `@/shared/db` (Drizzle/Neon) y `schema.ts` → `drizzle-orm/pg-core`. En un componente
  `"use client"` eso arrastra el ORM al bundle.
- Importá `@/features/auth/validation` directamente si querés reusar los schemas en cliente — pero **ojo**:
  `validation.ts:3-6` importa `PASSWORD_MIN_LENGTH/MAX` desde `@/shared/lib/auth/password`, que en su línea 1
  importa `bcryptjs`. Reusar los schemas en cliente **arrastra bcryptjs**. Alternativas: validar en cliente
  con un schema propio en `features/auth/ui/` que replique los mensajes, o extraer las constantes a un módulo
  sin bcrypt (cambio en `src/**`, decisión del implementer).
- Ubicación exigida por el acceptance: fetch/redirect en `src/features/auth/ui/**` (patrón `AppShellClient`),
  páginas finas en `src/app/(auth)/login/page.tsx` y `.../register/page.tsx`; `shared/ui` queda como
  presentación pura (`Field` + `Input` ya cablean `aria-invalid`/`aria-describedby` a partir de la prop
  `error`: `src/shared/ui/primitives/field/Field.tsx:41-51`).
- Leer `?next=` requiere `useSearchParams()` en un client component ⇒ **envolvelo en `<Suspense>`** o Next se
  queja en build (hoy no hay ningún uso de `useSearchParams` en `src/**` como precedente).
