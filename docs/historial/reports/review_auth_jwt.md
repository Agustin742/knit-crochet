# Review — feature #4 `auth_jwt`

**Veredicto: APROBADO**

Revisado contra `docs/harness/architecture.md`, `conventions.md`, `verification.md`,
`CHECKPOINTS.md`, `docs/product/PRD-01-estructura-funcional.md` §3, §4.1, §9 (Auth), §10,
el `acceptance` de la feature #4 en `feature_list.json` y los dos informes de research
(`research_next16_proxy.md`, `research_jwt_hashing.md`).

---

## Resultado de la verificación (ejecutada por el reviewer, no copiada)

### `bash ./init.sh` -> **VERDE (exit 0)**

```
[OK]    node -> v24.11.1
[OK]    pnpm -> 11.9.0
[OK]    feature_list.json válido (11 features)
[OK]    lint verde
[OK]    typecheck verde
 Test Files  10 passed (10)
      Tests  60 passed (60)
   Duration  9.93s
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```

**Conteo real de tests: 60 (10 archivos).** Coincide exactamente con lo declarado por el
implementer (26 previos + 34 nuevos). Sin tests skipped ni todo.

### `JWT_SECRET=build-secret pnpm build` -> **VERDE (exit 0)**

```
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully in 10.0s
  Finished TypeScript in 7.4s
✓ Generating static pages (7/7)

Route (app)
├ ƒ /api/auth/login
├ ƒ /api/auth/logout
├ ƒ /api/auth/me
└ ƒ /api/auth/register

ƒ Proxy (Middleware)
EXIT=0
```

Confirmado empíricamente: **no se dispara E1031** y Next **detecta y registra el Proxy**
(línea `ƒ Proxy (Middleware)`), que es la prueba de que el `config.matcher` fue analizado
estáticamente en build.

---

## Checklist punto por punto

### 1. Endpoints como Route Handlers finos delegando en `features/auth/api/` — [x]

| Endpoint | Archivo | Status feliz | Body |
|---|---|---|---|
| `POST /api/auth/register` | `src/app/api/auth/register/route.ts` | 201 | `{ user }` + cookie |
| `POST /api/auth/login` | `src/app/api/auth/login/route.ts` | 200 | `{ user }` + cookie |
| `POST /api/auth/logout` | `src/app/api/auth/logout/route.ts` | 200 | `{ ok: true }` + cookie borrada |
| `GET /api/auth/me` | `src/app/api/auth/me/route.ts` | 200 | `{ user }` |

Los 4 cumplen el patrón exacto de `architecture.md` regla 2: parsear -> zod -> servicio ->
serializar. **Cero lógica de negocio y cero Drizzle en los `route.ts`**: verificado que
ninguno importa `drizzle-orm`, `@/shared/db` ni `schema.ts`. El único acceso a Drizzle vive
en `src/features/auth/api/store.ts` (`import { eq } from "drizzle-orm"`, `db` de `@/shared/db`),
que es exactamente la capa que manda `architecture.md` regla 3.

Manejo de errores conforme a `conventions.md`: errores de dominio nombrados
(`EmailAlreadyRegisteredError` -> 409, `InvalidCredentialsError` -> 401,
`UserNotFoundError` -> 404, `InvalidSessionError` -> 401) y catch-all a 500 vía
`unexpectedErrorResponse`, que **loguea del lado servidor y responde `{ error }` genérico**
(`shared/lib/http.ts:29-35`). Nunca se propaga un stack trace al cliente.

**`/me` NO filtra `passwordHash`** — triple barrera verificada:
- `PublicUser = Omit<UserRecord, "passwordHash">` (`types.ts:6`).
- `toPublicUser()` (`store.ts:56-59`) destructura y descarta el campo; **todos** los servicios
  (`register`, `login`, `current-user`) pasan por él antes de devolver.
- Asertado en test: `expect(body.user).not.toHaveProperty("passwordHash")`
  (`auth-routes.test.ts:91, 146, 217`).

### 2. Password hasheado + JWT + cookie — [x]

- **bcryptjs, nunca en claro.** `hashPassword`/`verifyPassword` (`shared/lib/auth/password.ts`)
  con `BCRYPT_COST = 12`. `registerUser` guarda solo `passwordHash: await hashPassword(...)`
  (`register.ts:23`); `loginUser` compara con `verifyPassword` (`login.ts:22-25`), nunca con
  `===`. La tabla solo tiene `password_hash` (`features/auth/schema.ts:6`). Test de
  no-regresión real: `expect(dbState.rows[0]?.passwordHash).not.toBe("lana-1234")`
  (`auth-routes.test.ts:94`).
- **JWT con jose, HS256 explícito** (`jwt.ts:6, 45, 61`). El `algorithms: ["HS256"]` en el
  verify es correcto y necesario: sin él jose aceptaría cualquier alg soportado
  (*algorithm confusion*). Se validan además `issuer` y `audience`, y se exige `sub` string
  no vacío (`jwt.ts:66-68`).
- **Secret desde env, sin default hardcodeado.** `getSecret()` (`jwt.ts:33-39`) lee
  `process.env.JWT_SECRET` y, si falta, lanza **`MissingJwtSecretError`** con mensaje claro
  que apunta a `.env.example`. **No existe ningún fallback tipo `?? "dev-secret"`**: el grep de
  `JWT_SECRET` en `src/` solo devuelve `jwt.ts` y los `vi.stubEnv` de tests. No hay motivo de
  rechazo inmediato. Cubierto por test (`jwt.test.ts:67-68`, `stubEnv("JWT_SECRET","")`).
  Bien elegido: el secret se lee **dentro** de la función, no a nivel de módulo, así importar
  el archivo nunca revienta el build (y por eso `pnpm build` funciona sin `.env`).
- **`.env.example` contiene `JWT_SECRET`** (línea 9, bloque "feature #4"). Correcto que el
  implementer no lo duplicara: ya lo dejó la feature #1.
- **Cookie**: `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `maxAge: 604800`,
  `secure` solo en producción (`session.ts:54-62`). Cumple PRD §10 literal. El `secure`
  condicional está justificado (fijo rompería el login en `http://localhost`).
  Asertado sobre el header `set-cookie` real (`session.test.ts:55-64`,
  `auth-routes.test.ts:96-98`), no sobre el objeto de opciones.

### 3. `src/proxy.ts` — [x] (los 3 hallazgos críticos del research, aplicados)

- **NO exporta `runtime`** — verificado por lectura (el archivo solo exporta `LOGIN_PATH`,
  `proxy` y `config`) **y empíricamente por `pnpm build` verde**, que es la prueba dura de
  que no salta E1031.
- **`config.matcher` es un literal inline** (`proxy.ts:60-62`): array de strings escrito a
  mano, sin ninguna constante importada ni template literal. Es el punto que habría causado
  el fallo silencioso; está bien resuelto. La línea `ƒ Proxy (Middleware)` del build confirma
  que Next lo analizó.
- **Allowlist explícita y fail-closed**, con **igualdad exacta** (`Array.includes`), no
  `startsWith` (`proxy.ts:18-23`). Busqué activamente bypasses:

| Vector de bypass | Path probado | Resultado | Veredicto |
|---|---|---|---|
| Prefijo laxo en API | `/api/auth/loginXYZ` | `includes()` da false -> **protegido** | OK, no cuela |
| Prefijo laxo en el guard | `/api/authfoo/x` | no está en la lista -> **protegido** | OK, no cuela |
| Subruta de ruta pública | `/api/auth/login/algo` | **protegido** | OK, no cuela |
| Trailing slash | `/api/auth/login/` | no está en la lista -> **protegido** (over-protect) | OK, fail-closed |
| Mayúsculas | `/API/projects`, `/Login` | no matchean -> **protegido** | OK, fail-closed |
| Endpoints de auth privados | `/api/auth/me`, `/api/auth/logout` | **protegidos** (testeado, `proxy.test.ts:62-66`) | OK, correcto |
| Ruta desconocida | `/api/projects`, `/projects`, `/_next/data/...` | **protegido** por defecto | OK, fail-closed |
| Falta de `JWT_SECRET` | cualquier ruta privada | `verifySessionToken` lanza -> `catch` -> deniega | OK, fail-closed |

  No encontré ningún bypass. El diseño es correcto por construcción: la única forma de ser
  público es estar **literalmente** en una de las dos listas.
- **Respuesta correcta por tipo de ruta** (`proxy.ts:25-32`): `/api/**` -> `401` JSON
  `{ error: "No autenticado." }`; páginas -> `NextResponse.redirect` (307) a
  `/login?next=<pathname>`, construido con `new URL(LOGIN_PATH, request.nextUrl)` (URL
  absoluta, como exige la API). Ambos casos testeados incluyendo el `location` y el
  query param (`proxy.test.ts:26-46`).
- **Grafo de imports mínimo**: el proxy solo importa `next/server` y
  `@/shared/lib/auth/jwt` (jose). **No arrastra Drizzle, Neon ni bcryptjs** — verificado
  siguiendo la cadena de imports. Es exactamente la razón por la que `password.ts` está
  separado de `jwt.ts`, y el implementer lo respetó.

### 4. Helper de sesión reutilizable en `shared/lib` — [x]

`src/shared/lib/auth/session.ts` expone `getSessionUserId(): Promise<string | null>`,
`requireSessionUserId(): Promise<string>`, `setSessionCookie`, `clearSessionCookie`.

Evaluado explícitamente como **contrato para las features #6-#10**:
- Devuelve **solo el `userId`** (claim `sub`), tipado como `string`. No filtra el payload del
  token, ni el `exp`, ni el objeto de jose. Es exactamente lo que necesita el scoping por
  usuario de `architecture.md` regla 4, sin acoplar los servicios al formato del JWT.
- **No mete una query a DB por request** (devuelve el id, no el usuario). Decisión correcta.
- **Dos variantes con semántica clara**: `require*` lanza (default para rutas privadas),
  `get*` devuelve `null` (rutas con comportamiento de invitado). Nada de un booleano ambiguo.
- `setSessionCookie<T extends NextResponse>` genérico y encadenable: no se pierde el tipado
  del body al hacer `setSessionCookie(NextResponse.json({user}), token)`.
- Usa `await cookies()` de `next/headers` (Next 16: async). Correcto.

**Nota de diseño para el leader (no bloqueante, pero sale barato arreglarlo ahora y caro
en la feature #10):** `requireSessionUserId()` vive en `shared/lib/auth/session.ts` pero
lanza `InvalidSessionError`, que se exporta desde `shared/lib/auth/jwt.ts`. Eso obliga a
cada Route Handler privado a **dos imports de módulos distintos** y a repetir el mismo
`try/catch -> 401`. Ver `me/route.ts:4-5, 13-16`. Con ~25 endpoints privados por venir
(#6-#10), eso son ~25 copias del mismo boilerplate y ~25 oportunidades de olvidar el mapeo
a 401. Sugerencia para cuando arranque #6: reexportar `InvalidSessionError` desde
`session.ts` y añadir un `withSession(handler)` o un `sessionErrorResponse(error)` en
`shared/lib/http.ts`. **No es motivo de rechazo de esta feature**: el contrato actual es
correcto, solo es verboso.

### 5. Validación zod en cada endpoint — [x]

`src/features/auth/validation.ts`, un esquema por endpoint (`registerSchema`, `loginSchema`),
en la ubicación que manda `conventions.md`. Los handlers usan `safeParse` sobre el body y
cortan con 400 antes de tocar la lógica (`register/route.ts:17-20`, `login/route.ts:13-16`).
`readJsonBody` devuelve `undefined` ante JSON malformado y deja que zod produzca el 400
(nada de un 500 por `request.json()` reventando). `/logout` y `/me` no reciben input, así que
no hay nada que validar: correcto, no es una omisión.

Calidad de los esquemas, por encima del mínimo:
- Email normalizado (`trim().toLowerCase()`) **antes** de validar formato y de tocar la DB
  (`validation.ts:10-15`), de forma que la unicidad de `User.email` (PRD §4.1) no depende del
  casing. Testeado end-to-end: se registra `"Tejedora@Example.com"` y se persiste
  `"tejedora@example.com"` (`auth-routes.test.ts:93`).
- `password.max(72)` derivado de `PASSWORD_MAX_LENGTH` en `password.ts`: correcto y necesario,
  bcrypt trunca a 72 bytes y sin ese tope dos passwords distintas colisionarían en silencio.
  Buen detalle que la constante viva junto al hashing y no duplicada.
