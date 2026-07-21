# Implementación — Feature #4 `auth_jwt`

> Fecha: 2026-07-21 · Agente: implementer · Estado final: `in_progress` (cierra el reviewer)
> Fuentes técnicas: `progress/reports/research_next16_proxy.md` y
> `progress/reports/research_jwt_hashing.md` (aplicados sin desviaciones).

---

## 1. Dependencias añadidas

```
pnpm add jose@^6.2.4 bcryptjs@^3.0.3
```

Resultado: `bcryptjs 3.0.3`, `jose 6.2.4` en `dependencies`. **Sin `@types/*`** (ambas traen tipos).
Efecto colateral de pnpm: añadió `jose@6.2.4` a `minimumReleaseAgeExclude` en `pnpm-workspace.yaml`
(automático del gestor, no editado a mano).

## 2. Archivos creados

### `src/shared/lib/` (helpers compartidos)

| Archivo | Contenido |
|---|---|
| `src/shared/lib/auth/jwt.ts` | `signSessionToken` / `verifySessionToken` (jose, HS256, `iss`/`aud`, exp 7d), `JWT_COOKIE_NAME = "kc_session"`, `JWT_MAX_AGE_SECONDS`, errores `MissingJwtSecretError` e `InvalidSessionError` |
| `src/shared/lib/auth/password.ts` | `hashPassword` / `verifyPassword` (bcryptjs, coste 12), `PASSWORD_MIN_LENGTH`/`PASSWORD_MAX_LENGTH` |
| `src/shared/lib/auth/session.ts` | `getSessionUserId`, `requireSessionUserId`, `setSessionCookie`, `clearSessionCookie` |
| `src/shared/lib/http.ts` | `errorResponse`, `validationErrorResponse`, `readJsonBody`, `unexpectedErrorResponse` (mantiene los Route Handlers finos y homogéneos para #6-#10) |

### `src/features/auth/`

| Archivo | Contenido |
|---|---|
| `types.ts` | `UserRecord` (inferido del schema de #3), `PublicUser` (= `Omit<UserRecord, "passwordHash">`), inputs y `AuthResult` |
| `validation.ts` | `registerSchema`, `loginSchema` (zod) |
| `api/store.ts` | `AuthUserStore` (puerto), `createAuthUserStore(db)` (implementación Drizzle), `toPublicUser` |
| `api/errors.ts` | `EmailAlreadyRegisteredError`, `InvalidCredentialsError`, `UserNotFoundError` |
| `api/register.ts` | `registerUser` |
| `api/login.ts` | `loginUser` |
| `api/current-user.ts` | `getCurrentUser` |
| `api/index.ts` | barrel de la capa de servicios |

`src/features/auth/index.ts` **modificado**: ahora reexporta `./api`, `./schema`, `./types`, `./validation`.
`schema.ts` no se tocó (se reutiliza tal cual).

### Route Handlers (`src/app/api/auth/**`)

`register/route.ts` (201), `login/route.ts` (200), `logout/route.ts` (200), `me/route.ts` (200).
Todos: zod → servicio → serialización. Cero lógica de negocio.

### Proxy

`src/proxy.ts` — nuevo.

### Tests (34 nuevos)

- `src/shared/lib/auth/jwt.test.ts` (5)
- `src/shared/lib/auth/password.test.ts` (2)
- `src/shared/lib/auth/session.test.ts` (5)
- `src/features/auth/api/auth-service.test.ts` (5)
- `src/app/api/auth/auth-routes.test.ts` (9)
- `src/proxy.test.ts` (8)

## 3. Decisiones de diseño no obvias

### 3.1 API del helper de sesión (lo usarán #6-#10)

```ts
// src/shared/lib/auth/session.ts
getSessionUserId(): Promise<string | null>      // tolerante: null si no hay sesión válida
requireSessionUserId(): Promise<string>          // estricto: lanza InvalidSessionError
setSessionCookie(response, token)                // devuelve la misma respuesta (encadenable, genérico en T)
clearSessionCookie(response)
```

- **Dos variantes a propósito**: el 95 % de los endpoints privados usará `requireSessionUserId()`
  (`catch (e) { if (e instanceof InvalidSessionError) → 401 }`, ver `me/route.ts` como plantilla);
  `getSessionUserId()` queda para rutas con comportamiento de invitado.
- Devuelve **solo el `userId`** (claim `sub`), que es lo único que necesita el scoping. No devuelve
  el usuario entero para no meter una query a DB en cada request.
- `setSessionCookie` es genérico (`<T extends NextResponse>`) para no perder el tipado del body
  al encadenarlo con `NextResponse.json(...)`.
- Se lee la cookie con `await cookies()` de `next/headers` (Next 16: es async).

### 3.2 Estrategia matcher + allowlist en `src/proxy.ts`

- **Matcher literal inline** que solo excluye assets. No se importa ninguna constante: una constante
  importada se ignoraría en silencio (hallazgo del research), dejando el proxy sin cobertura.
- La decisión público/privado vive en TypeScript, **fail-closed** y con **igualdad exacta**:
  `PUBLIC_API_ROUTES = ["/api/auth/register", "/api/auth/login"]`,
  `PUBLIC_PAGES = ["/", "/login", "/register"]`. Todo lo demás requiere token.
  Consecuencia deseada y testeada: `/api/auth/me` y `/api/auth/logout` **sí** están protegidos.
- Respuesta diferenciada: `/api/**` → `401 JSON {error}`; páginas → `307` a `/login?next=<pathname>`.
- **No** se exporta `runtime` (sería error de build E1031) y **no** se usa `(app)/**` en el matcher
  (los route groups no aparecen en la URL).
- El grafo de imports del proxy es solo `next/server` + `shared/lib/auth/jwt` (jose). **No** arrastra
  Drizzle, Neon ni bcryptjs. Por eso `password.ts` está en un archivo separado de `jwt.ts`.
- Si faltara `JWT_SECRET`, `verifySessionToken` lanza y el `catch` del proxy deniega el acceso
  (fail-closed también ante mala configuración).

### 3.3 Puerto `AuthUserStore` (seam de testing)

Los servicios reciben `store: AuthUserStore = createAuthUserStore()`. Es la **única** capa nueva
introducida y su razón es explícita: permite testear los servicios y los Route Handlers reales
mockeando **solo el borde de datos**, sin simular el query builder de Drizzle ni depender de red.
No es un repositorio genérico: es específico de `users` y vive dentro de la feature.

### 3.4 Seguridad

- `login` responde el **mismo** error (`401`, "Email o contraseña incorrectos.") para email inexistente
  y para password incorrecta → no filtra qué emails están registrados (testeado comparando bodies).
- El email se normaliza (`trim` + `toLowerCase`) **antes** de validar el formato y de tocar la DB
  (`z.string().trim().toLowerCase().max(255).pipe(z.email())`), para que la unicidad no dependa del casing.
- `password`: `.min(8).max(72)` — el `max` es obligatorio porque bcrypt trunca a 72 bytes.
- `passwordHash` nunca sale del servicio: todo lo que se serializa pasa por `toPublicUser`.
- Cookie: `httpOnly`, `sameSite: "lax"`, `path: "/"`, `maxAge: 604800`, `secure` solo en producción
  (si fuera fijo rompería el login en `http://localhost`).
- El proxy es defensa en profundidad; la autorización real la hace cada Route Handler con
  `requireSessionUserId()` (así lo hace ya `/api/auth/me`).

### 3.5 Otras

- `BCRYPT_COST = 12` (recomendación del research; ~0,6 s por hash). Es el mayor coste de los tests.
- `me` responde `404` si el token es válido pero el usuario ya no existe (usuario borrado).
- `.env.example` **ya contenía** `JWT_SECRET` (lo dejó la feature #1); no hizo falta añadirlo.
  El error nombrado equivalente a `MissingDatabaseUrlError` es `MissingJwtSecretError`.

## 4. Verificación

### `bash ./init.sh` (output real, final)

```
── 1. Verificando entorno ─────────────────────────────
[OK]    node -> v24.11.1
[OK]    pnpm -> 11.9.0

── 2. Verificando archivos base del arnés ──────────────
[OK]    Existe AGENTS.md
[OK]    Existe feature_list.json
[OK]    Existe progress/current.md
[OK]    Existe docs/harness/architecture.md
[OK]    Existe docs/harness/conventions.md
[OK]    Existe docs/harness/verification.md
[OK]    Existe CHECKPOINTS.md

── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (11 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  10 passed (10)
      Tests  60 passed (60)
   Start at  19:40:42
   Duration  16.69s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

26 tests previos intactos + 34 nuevos = 60.

### Verificación extra: `pnpm build`

`init.sh` no compila, y los riesgos del `proxy.ts` son de **build-time**, así que se ejecutó además
`JWT_SECRET=build-secret pnpm build`:

```
✓ Compiled successfully in 11.3s
  Finished TypeScript in 9.2s
✓ Generating static pages (7/7)

Route (app)
├ ƒ /api/auth/login
├ ƒ /api/auth/logout
├ ƒ /api/auth/me
└ ƒ /api/auth/register

ƒ Proxy (Middleware)
```

→ Confirmado empíricamente: no se dispara E1031, el matcher se analiza y Next registra el Proxy.

## 5. Cobertura del `acceptance`

| Criterio | Dónde |
|---|---|
| 4 endpoints | `src/app/api/auth/{register,login,logout,me}/route.ts` |
| Password hasheado + JWT en cookie httpOnly SameSite=Lax | `shared/lib/auth/{password,jwt,session}.ts`; asertado en `auth-routes.test.ts` y `session.test.ts` |
| `src/proxy.ts` protege privadas / deja pasar auth público | `src/proxy.ts` + `src/proxy.test.ts` |
| Helper de sesión reutilizable que extrae `userId` | `shared/lib/auth/session.ts` (§3.1) |
| Tests: registro válido, login válido, credenciales inválidas 401, protegido sin token 401 | `auth-routes.test.ts` + `proxy.test.ts` + `auth-service.test.ts` |
| Validación zod por endpoint | `features/auth/validation.ts` |

## 6. Riesgos / puntos de atención para el reviewer

1. **`src/app/api/auth/auth-routes.test.ts` vive dentro de `src/app/`.** Es un archivo de test
   colocado junto a las rutas; Next solo trata como especiales `route.ts`/`page.tsx`/etc., y el
   `pnpm build` real confirma que no interfiere. Si la convención del repo prefiere no tener tests
   dentro de `app/`, moverlo a `src/features/auth/api/` es trivial.
2. **Ningún test toca una DB real.** Se mockea únicamente `createAuthUserStore` (borde de datos);
   zod, bcryptjs, jose y los handlers son reales. `conventions.md` prefiere un doble real acotado
   (DB de test), pero no hay `DATABASE_URL` de test disponible en el entorno.
3. **`PUBLIC_PAGES` incluye `/`** (la home actual es pública). Cuando exista el route group `(app)`,
   revisar si la home debe pasar a privada — es un cambio de una línea, y por ser fail-closed
   equivocarse "de más" nunca abre acceso.
4. **`POST /api/auth/logout` está protegido por el proxy** (no está en la allowlist): un usuario sin
   sesión que llame a logout recibe 401 en vez de 200. Es coherente (no hay nada que cerrar) pero es
   una decisión, no un descuido.
5. **Coste bcrypt 12** → la suite tarda ~16 s. Si molesta, bajar a 10 solo tendría sentido en el
   entorno de test, nunca en producción.
6. `pnpm-workspace.yaml` fue modificado automáticamente por pnpm al instalar `jose` (entrada en
   `minimumReleaseAgeExclude`).
