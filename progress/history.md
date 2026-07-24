# Bitácora histórica (append-only)

> Cada vez que se cierra una sesión, su resumen se añade aquí.
> No edites entradas anteriores. Solo añades al final.

---

## 2026-07-20 — Bootstrap del arnés
- **Agente:** Claude (setup del sistema multi-agente)
- **Cambios:** estructura del arnés adaptada a Next.js/TS (AGENTS.md, CLAUDE.md,
  CHECKPOINTS.md, init.sh, feature_list.json, docs/harness/{architecture,
  conventions,verification}.md, .claude/agents/, .claude/settings.json).
- **Estado del proyecto:** greenfield, sin código todavía (feature 1 = scaffold pendiente).
- **Próximo:** implementar feature 1 (`project_scaffold`).

## 2026-07-20 — Reorganización de docs + alineación con el PRD
- **Agente:** Claude.
- **Cambios:** `docs/` reorganizado en `docs/harness/` (architecture, conventions,
  verification) y `docs/product/` (PRD-01). Docs del arnés alineados a la
  arquitectura feature-first del PRD (src/{app,features,shared}, proxy.ts, zod,
  Next 16). `feature_list.json` reconstruido con 11 features derivadas del §12 del
  PRD (con `prd_ref`). PRD ampliado con §0 (proceso de agentes) y §12 mapeado a
  feature IDs. Todas las referencias de rutas actualizadas; `bash ./init.sh` verde.
- **Próximo:** implementar feature 1 (`project_scaffold`).

## 2026-07-20 — Feature #1 `project_scaffold` (DONE)
- **Agente:** leader (orquesta) → implementer → reviewer (APROBADO).
- **Cambios:** scaffold Next.js 16 (App Router, TS strict); scripts
  dev/build/lint/typecheck/test; estructura feature-first
  `src/{app,features,shared/{db,lib,config,ui}}` versionada con `.gitkeep`; Zod
  instalado; **Vitest** como runner (2 smoke tests verdes); `.gitignore` +
  `.env.example`. `eslint-config-next` v16 usa flat config nativo (FlatCompat
  rompía). `bash ./init.sh` y `npm run build` verdes.
- **Informes:** `progress/reports/impl_project_scaffold.md`,
  `progress/reports/review_project_scaffold.md`.
- **Cambio de proceso:** los informes de subagentes ahora viven en
  `progress/reports/`; se añade entrada a `history.md` al cerrar **cada feature**,
  no solo al cerrar sesión.
- **Próximo:** feature #2 `db_setup_drizzle_neon`.

## 2026-07-20 — Corrección de tooling: migración npm → pnpm (DONE)
- **Agente:** leader → implementer → reviewer (APROBADO).
- **Motivo:** regla dura del usuario — el proyecto usa SIEMPRE **pnpm**, NUNCA
  npm/npx. El scaffold (#1) se hizo con npm por error. Guardado en memoria.
- **Cambios:** borrado `package-lock.json`; `pnpm install` → `pnpm-lock.yaml`;
  `package.json` con `"packageManager": "pnpm@11.9.0"`. Migrados a pnpm:
  `init.sh`, `docs/harness/verification.md`, `CHECKPOINTS.md`,
  `.claude/settings.json` y el `acceptance` de la feature #1 en `feature_list.json`
  (status de #1 intacto = done). Workarounds: override `postcss: 8.4.31` en
  `pnpm-workspace.yaml` (vite 8 exigía postcss no publicado en el registry del
  entorno) y aprobación de build scripts `sharp` + `unrs-resolver`.
- **Informes:** `progress/reports/impl_pnpm_migration.md`,
  `progress/reports/review_pnpm_migration.md`. `bash ./init.sh` verde.
- **Próximo:** feature #2 `db_setup_drizzle_neon`.

## 2026-07-20 — Feature #2 `db_setup_drizzle_neon` (DONE)
- **Agente:** leader (research con context7) → implementer → reviewer (APROBADO).
- **Research:** el leader consultó **context7** (`/drizzle-team/drizzle-orm-docs` +
  `/neondatabase/serverless`) contra el stack real (Next 16.2, TS 5.9, ESM, pnpm) →
  `progress/reports/research_drizzle_neon.md`, usado como fuente por el implementer.
- **Cambios:** deps `drizzle-orm` + `@neondatabase/serverless`, dev `drizzle-kit`
  (todo con pnpm). Cliente Drizzle `neon-http` en `src/shared/db` (lazy Proxy +
  `MissingDatabaseUrlError` si falta `DATABASE_URL`), barrel `shared/db/schema.ts`
  vacío (entidades reales = #3), `drizzle.config.ts` (dialect postgresql, schema
  feature-first, out `./drizzle` versionado), `DATABASE_URL` en `.env.example`,
  scripts `db:generate`/`db:migrate`. Test Vitest (init con env + error nombrado).
  Workaround: `onlyBuiltDependencies`/`allowBuilds` en `pnpm-workspace.yaml` para
  el build script de esbuild bajo pnpm 11.
- **Verificación:** `bash ./init.sh` verde (6 tests); `pnpm exec drizzle-kit
  generate` EXIT 0; aislamiento de Drizzle confirmado (nada fuera de shared/db lo
  importa). Sin invadir #3.
- **Informes:** `progress/reports/impl_db_setup_drizzle_neon.md`,
  `progress/reports/review_db_setup_drizzle_neon.md`.
- **Próximo:** feature #3 `db_schemas`.

## 2026-07-21 — Feature #3 `db_schemas` (DONE)
- **Agente:** leader (orquesta) → implementer → reviewer (APROBADO).
- **Cambios:** enums globales en `src/shared/config` (`CraftType`, `ProjectStatus`,
  `ColorFamily`) como arrays `as const` + tipos TS (fuente única de valores);
  `pgEnum` en `src/shared/db/enums.ts` construidos desde esos arrays. 8 entidades
  del PRD §4 en `src/features/<x>/schema.ts`: User (auth), Project + ProjectYarn
  (projects), Pattern (patterns), Brand + YarnType + Yarn (yarns), CraftSession
  (time-tracking). Constraints §4/§5: FKs por `userId`, `ProjectYarn` PK compuesta
  `(projectId, yarnId)`, `Yarn` único `(brandId, colorCode)`, `User.email` único,
  `patternId` nullable FK→Pattern; cadenas Brand→YarnType→Yarn y Project→CraftSession.
  Barrel `src/shared/db/schema.ts` re-exporta todos los schemas + `index.ts` por feature.
- **Verificación:** `bash ./init.sh` verde (lint, typecheck, 26 tests). `pnpm
  db:generate` → 8 tablas en `drizzle/0000_cold_marrow.sql`. Aislamiento de Drizzle
  intacto. Tests de forma/constraints con `getTableConfig`.
- **Informes:** `progress/reports/impl_db_schemas.md`,
  `progress/reports/review_db_schemas.md`.
- **Próximo:** feature #4 `auth_jwt`.

## 2026-07-21 — Feature #4 `auth_jwt` (DONE)
- **Agente:** leader (orquesta) → 2 exploradores en paralelo → implementer → reviewer (APROBADO).
- **Research:** context7 **NO estaba disponible** en el entorno; los exploradores lo
  sustituyeron por el código fuente de `next@16.2.10` instalado (`node_modules/next/dist`,
  incluidos los docs empaquetados) + doc oficial + verificación empírica de librerías.
  Informes: `progress/reports/research_next16_proxy.md`, `research_jwt_hashing.md`.
- **Hallazgos del research que definieron el diseño (verificados contra el código de Next):**
  1. `proxy.ts` corre SIEMPRE en runtime **Node.js** en Next 16 (`get-page-static-info.js`:
     "Proxy always runs on Node.js runtime"); exportar `runtime` = error de build **E1031**.
     Cae la restricción histórica de edge para hashing/JWT.
  2. El matcher **no puede usar route groups**: `(app)/**` no existe en la URL. Solución:
     matcher amplio (excluye assets) + **allowlist explícita en TS, fail-closed**.
  3. El `config.matcher` debe ser **literal inline**: se analiza estáticamente en build y una
     constante importada se ignora **en silencio**, dejando el proxy sin cobertura.
  4. En 16.2.10 el export real es `unstable_doesMiddlewareMatch` (no `unstable_doesProxyMatch`).
- **Cambios:** `pnpm add jose@^6.2.4 bcryptjs@^3.0.3`. Helpers en
  `src/shared/lib/auth/{jwt,password,session}.ts` + `src/shared/lib/http.ts`.
  Lógica en `src/features/auth/api/{store,errors,register,login,current-user}.ts` +
  `types.ts`/`validation.ts` (zod por endpoint). Route Handlers finos en
  `src/app/api/auth/{register,login,logout,me}/route.ts`. `src/proxy.ts` con matcher
  literal inline + allowlist fail-closed y respuesta diferenciada (`/api/**` → 401 JSON,
  páginas → redirect). JWT HS256 en cookie httpOnly SameSite=Lax; secret desde env
  (en `.env.example`, con error nombrado si falta, sin default hardcodeado).
- **Verificación:** `bash ./init.sh` VERDE (lint, typecheck, **60 tests** en 10 archivos,
  26 previos + 34 nuevos) y `JWT_SECRET=… pnpm build` VERDE (confirma que no salta E1031
  y que Next detecta el Proxy). El reviewer ejecutó ambos él mismo y probó vectores de
  bypass del matcher (prefijos tipo `/api/authfoo`, trailing slash, mayúsculas).
- **Deuda anotada para #6 (no bloqueante):** `requireSessionUserId()` vive en
  `shared/lib/auth/session.ts` pero lanza `InvalidSessionError` exportado desde
  `jwt.ts` → cada endpoint privado necesita 2 imports + el mismo `try/catch → 401`.
  Con ~25 endpoints privados por venir (#6-#10), conviene reexportar el error desde
  `session.ts` y añadir `withSession(handler)` / `sessionErrorResponse(error)` en
  `shared/lib/http.ts` **al arrancar #6**.
- **Informes:** `progress/reports/impl_auth_jwt.md`, `progress/reports/review_auth_jwt.md`.
- **Próximo:** feature #5 `cloudinary_upload`.

## 2026-07-21 — Feature #5 `cloudinary_upload` (DONE)
- **Agente:** leader (orquesta) → implementer → reviewer (APROBADO). Sin exploradores
  (feature pequeña y aislada: helper de `shared/lib` + tests).
- **Decisión técnica cerrada por el implementer:** **`fetch` directo con upload firmado**
  en vez del SDK `cloudinary`. Motivo: cero dependencias nuevas, compatible con Node y
  Edge, y borde mockeable sin red. `package.json` no cambió.
- **Cambios:** `src/shared/lib/cloudinary/{config,upload,index}.ts` + tests. Config desde
  env (documentada en `.env.example`) con errores nombrados `MissingCloudinaryConfigError`
  y `CloudinaryUploadError` (con `reason`). Devuelve la URL final; solo la URL se persiste.
  El `api_secret` nunca viaja en el body/query ni aparece en logs o mensajes de error.
- **Auditoría de la firma (lo más delicado de la feature):** el reviewer recomputó la
  firma con una implementación independiente (`node:crypto`) fuera del test y confirmó que
  el algoritmo coincide con el que exige Cloudinary (params en orden, `api_secret` al
  final, **SHA-1** hex minúscula). Firma **correcta**: descartado el riesgo de "falla solo
  en producción" que los tests mockeados no detectarían. El test no es tautológico (la
  constante es reproducible con cualquier implementación de SHA-1 ajena al repo).
- **Verificación:** `bash ./init.sh` VERDE — **70 tests en 12 archivos** (antes 60 en 10;
  +10 tests, ninguno roto). Alcance respetado: no se tocaron `src/features/**`,
  `src/app/**` ni schemas.
- **Informes:** `progress/reports/impl_cloudinary_upload.md`,
  `progress/reports/review_cloudinary_upload.md`.
- **Próximo:** feature #6 `projects_crud` (la más grande del PRD).

## 2026-07-21 — Feature #6 `projects_crud` (DONE)
- **Agente:** leader (orquesta) → implementer A → implementer B → reviewer
  (RECHAZADO → corrección → re-review APROBADO).
- **División:** feature muy compleja (~10 endpoints) → dividida en 2 sub-tareas
  **secuenciales** (no paralelas: ambas escriben en `src/features/projects/**`).
- **Sub-tarea A — cimientos + CRUD base:**
  - Saldó la deuda de #4: `withSession(route, handler)` + `sessionErrorResponse()` en
    `src/shared/lib/http.ts`, `InvalidSessionError` reexportado desde
    `shared/lib/auth/session.ts`, y `/api/auth/me` migrado sin cambiar su
    comportamiento observable. Se hizo aquí porque lo consumen ~25 endpoints de #6-#10.
  - `features/projects/{types,validation}.ts` + servicios + `ProjectStore`.
  - `calculateProgress`: `round(rounds/targetRounds*100)`, clamp 0..100,
    `targetRounds=0 → 0`. Se recalcula **en el servicio**; nunca se acepta `progress`
    del cliente.
  - Endpoints `GET/POST /api/projects` (filtros `?active=&type=&needle=&yarnId=&from=&to=`,
    validados con zod) y `GET/PATCH/DELETE /api/projects/:id`. 70 → **103 tests**.
- **Sub-tarea B — endpoints de acción:** `POST /:id/rounds` (delta negativo soportado,
  `rounds` nunca < 0, recalcula progress), `PATCH /:id/steps` (`completedSteps`
  normalizado como conjunto ordenado), `POST/DELETE /:id/yarns[/:yarnId]` (enlace N:N
  idempotente: 201 crea / 200 ya existía / 204; scoping cruzado proyecto+lana, ajeno →
  404). Reutilizó `calculateProgress` de A sin duplicarla. 103 → **131 tests**.
- **Rechazo del reviewer (defecto real, encontrado en la costura entre A y B):**
  `DELETE /api/projects/:id` devolvía **500** si el proyecto tenía lanas enlazadas. La FK
  `project_yarns_project_id_projects_id_fk` es `ON DELETE no action`; en cuanto B habilitó
  `POST /:id/yarns`, la secuencia *enlazar → borrar* pasó a violar la FK y `withSession`
  lo convertía en 500. Flujo de usuario corriente y `DELETE` está en el acceptance ⇒
  defecto de #6, no deuda para #7. **Ambos implementers lo anotaron en sus informes
  (A 5.11, B 6.1) y ninguno lo corrigió**: cada uno lo dio por ajeno a su mitad. Es
  exactamente el hueco que abre dividir una feature, y para lo que sirve el reviewer.
- **Corrección (implementer B, quirúrgica y sin migración** — el schema es de #3, ya
  cerrada): `deleteProject` comprueba propiedad con `findById`, borra los enlaces con el
  nuevo `store.removeYarnLinks(projectId)` y luego la fila; el 404 para ajeno/inexistente
  quedó intacto. `schema.ts` sin cambios y sin migración nueva en `drizzle/`. +3 tests:
  204 con lanas enlazadas, **enlaces de otros proyectos intactos** (el riesgo obvio: un
  `delete` mal filtrado se llevaría los enlaces de todos), y ajeno → 404 sin borrar nada.
- **Verificación final:** `bash ./init.sh` VERDE — **134 tests en 17 archivos** (desde 70
  en 12 al empezar la feature). `pnpm build` OK. El reviewer auditó el scoping por
  `userId` endpoint por endpoint (tabla en el informe) antes de aprobar.
- **Informes:** `progress/reports/impl_projects_crud_a.md`, `impl_projects_crud_b.md`,
  `review_projects_crud.md` (conserva el rechazo original + la sección "Re-review tras
  corrección").
- **Próximo:** feature #7 `time_tracking`.

## 2026-07-22 — Feature #7 `time_tracking` (DONE)
- **Agente:** leader (orquesta) → implementer → reviewer (APROBADO a la primera).
- **Cambios:** nueva feature `src/features/time-tracking/api/**` siguiendo el patrón ya
  asentado en #6 (store inyectable + doble en memoria + errores nombrados + zod) y 3 Route
  Handlers finos con `withSession`: `POST /:id/sessions/start`, `PATCH /:id/sessions/stop`,
  `GET /:id/sessions`.
- **Decisiones cerradas:**
  - Doble start → **reutiliza** la sesión abierta (200 vs 201 al crear).
  - Doble stop → **409** `NoActiveSessionError` (nunca 500).
  - `duration = max(0, floor((end - start)/1000))`, **siempre calculado en el servidor**;
    body estricto: mandar `end`/`duration` da 400. Mismo principio que `progress` en #6 —
    el cliente no manda valores derivados. Importa porque falsear `duration` falsearía
    las métricas del dashboard (#10).
  - `Project.time` se **recalcula** como Σ `duration` en vez de incrementarse por delta:
    auto-sana cualquier deriva.
- **Frontera asignada por escrito en el brief (lección de #6, aplicada con éxito):**
  `craft_sessions_project_id_projects_id_fk` también es `ON DELETE no action`
  (`drizzle/0000_cold_marrow.sql:107`), así que en cuanto existieran sesiones el
  `DELETE /api/projects/:id` habría vuelto a dar 500 — el mismo bug que rechazó #6. Esta
  vez se asignó explícitamente a #7 en el brief y **el implementer lo resolvió de entrada**:
  `ProjectStore.removeCraftSessions` llamado desde `deleteProject` (patrón `removeYarnLinks`),
  sin migración y sin tocar `schema.ts`. Con tests de la costura a nivel servicio y a nivel
  ruta (204 + cero sesiones huérfanas + sesiones de otros proyectos intactas).
  **Conclusión de proceso: nombrar la frontera en el brief evitó repetir el rechazo.**
- **Verificación:** `bash ./init.sh` VERDE — **169 tests en 20 archivos** (antes 134 en 17,
  +35, 0 rotos). `pnpm build` OK. El reviewer auditó explícitamente la frontera del DELETE
  (que no borre de más) y el scoping por `userId` de los 3 endpoints.
- **Observaciones no bloqueantes del reviewer (para el leader):**
  1. **Ciclo de imports** `projects` ↔ `time-tracking` a nivel schema: real pero benigno
     (las FKs de Drizzle son closures perezosas), verificado por build/typecheck/tests. Es
     una excepción consciente a "consume otros features por su `index.ts`". **Si se repite
     en #8/#9, decidirlo a nivel arquitectura y no feature a feature.**
  2. `removeCraftSessions` vive en `ProjectStore`: coherente con `removeYarnLinks`, pero el
     store de projects ya conoce dos tablas ajenas. **Si aparece una tercera FK hacia
     `projects`, toca un servicio de borrado en cascada explícito.**
  3. Deuda futura: si #10/#11 añaden borrado de sesión individual, deberá recalcular
     `Project.time` en la misma operación.
  4. `coalesce(sum(...), 0)` devuelve `numeric` (string por el driver); `sumDuration` ya
     hace `Number(...)` explícito (`store.ts:134`), pero confirmarlo en el primer smoke real.
- **Informes:** `progress/reports/impl_time_tracking.md`, `review_time_tracking.md`.
- **Próximo:** feature #8 `yarns_catalogs`.

## 2026-07-22 — Arquitectura: capa de schema (S1 + S2) — no es una feature
- **Agente:** leader (análisis + decisión con el usuario + doc) → implementer →
  verificación directa del leader (el reviewer se cortó por límite de sesión antes de
  escribir su informe; la verificación se rehízo en el hilo principal).
- **Origen:** el reviewer de #7 levantó dos observaciones no bloqueantes (ciclo de
  imports entre features a nivel schema; `ProjectStore` acumulando limpieza de tablas
  ajenas). Al analizarlas resultaron ser **el mismo problema** y estar **a punto de
  multiplicarse**: `yarns/index.ts` y `patterns/index.ts` solo exportaban `./schema`, así
  que en cuanto #8 y #9 les añadieran `./api` habrían aparecido dos ciclos nuevos.
- **Causa raíz identificada:** (a) los `schema.ts` importaban por el `index.ts` de otras
  features, que arrastra `./api` → ciclo; (b) #3 generó **todas** las FKs como
  `ON DELETE no action`, sin distinguir posesión de referencia — eso causó el rechazo de
  #6, amenazó a #7 y habría reaparecido en #8.
- **Decisión (documentada en `docs/harness/architecture.md` §"Capa de schema" y en la
  excepción de imports de `conventions.md`):**
  - **S1** — un `schema.ts` importa solo `schema.ts` de otras features, nunca el `index.ts`.
  - **S2** — la cascada la declara la FK, no el servicio. Tabla de `onDelete` por FK
    distinguiendo posesión (`cascade`) de referencia (`no action`/`set null`).
  - Corolario: se retira el patrón de limpieza manual en los stores
    (`removeYarnLinks`/`removeCraftSessions`).
  - **Decisión de producto del usuario:** borrar una marca con tipos/lanas colgando →
    **409 (bloquear)**, coherente con la regla del PRD §4.5 para lanas. Por eso
    `yarns`/`brands`/`yarn_types` quedan `no action` **a propósito**; la lógica del 409
    la implementa **#8**, todavía no existe.
- **Momento elegido:** la migración nunca se había aplicado a Neon ⇒ sin datos ⇒ se pudo
  regenerar en limpio a coste cero. Dentro de tres features habría sido una migración
  sobre datos reales.
- **Cambios:** 7 imports en 4 `schema.ts`; `onDelete` en las 12 FKs; migración inicial
  regenerada (`drizzle/0000_cold_ben_urich.sql` sustituye a `0000_cold_marrow.sql`, sin
  restos ni `0001_`); `removeYarnLinks`/`removeCraftSessions` eliminados del store Drizzle
  y del doble; el doble en memoria ahora **simula la cascada** en su `remove()`.
- **Verificación (hecha por el leader, no copiada del informe):**
  - Las **12 FKs del SQL generado coinciden celda por celda** con la tabla de
    `architecture.md`: `project_yarns→projects` y `craft_sessions→projects` cascade;
    `projects→patterns` set null; `project_yarns→yarns`, `yarn_types→brands`,
    `yarns→brands`, `yarns→yarn_types` no action; todas las `→users` cascade.
  - S1: ningún `schema.ts` importa un `index.ts` (grep limpio). Grafo acíclico.
  - Cero restos de `removeYarnLinks`/`removeCraftSessions` en `src/`.
  - **Fidelidad del doble** (el riesgo central: un doble que imita mal a Postgres deja
    pasar tests y rompe en Neon): `in-memory-store.ts:156-167` borra solo enlaces y
    sesiones de ESE `projectId`, y solo tras confirmar propiedad — así que un 404 por
    proyecto ajeno no borra nada. Fiel a las dos FKs declaradas `cascade`.
  - `bash ./init.sh` VERDE: **169/169 tests**, cero borrados. `pnpm build` OK.
- **Informe:** `progress/reports/impl_arch_schema_cascade.md` (el
  `review_arch_schema_cascade.md` no llegó a escribirse por el corte de sesión).
- **Próximo:** feature #8 `yarns_catalogs`.

## 2026-07-22 — Feature #8 `yarns_catalogs` (DONE)
- **Agente:** leader (orquesta, con las 3 costuras nombradas en el brief) → implementer →
  reviewer (APROBADO a la primera, sin cambios requeridos).
- **Cambios:** nueva feature `src/features/yarns/api/**` (store inyectable + doble en
  memoria + errores nombrados + zod por endpoint) siguiendo el patrón asentado en #6/#7.
  Endpoints: `GET/POST /api/brands`, `GET/POST /api/brands/:id/types`, `GET/POST /api/yarns`,
  `GET/PATCH/DELETE /api/yarns/:id`. `yarns/index.ts` pasa a exportar `./api`, `./types`,
  `./validation` (antes solo `./schema`).
- **Las 3 costuras (nombradas en el brief, lección de #7 — resueltas de entrada):**
  1. `DELETE /api/yarns/:id?force=`: referenciada sin `force` → **409** + `referencedBy`
     (no borra nada); con `?force=true` borra los `project_yarns` primero (FK `no action`)
     y luego la lana. El doble comparte de verdad el array `projectYarns` con el de
     projects (splice in-place); filtrado solo por `yarnId` → no arrastra enlaces ajenos.
  2. `unique(brandId, colorCode)` → **409** `DuplicateColorCodeError` (create y update),
     nunca 500. El doble simula la unicidad.
  3. Scoping cruzado create/update: `brandId` marca del usuario (404 si no); `typeId`
     existe **y pertenece a esa brand** (404 si no). `assert-yarn-refs.ts` centraliza el chequeo.
- **Fuera de scope (decisión del líder, respetada):** sin DELETE/PATCH de Brand/YarnType
  (el PRD §9 y el acceptance solo definen GET/POST) → el 409-bloqueo de borrado de
  marca/tipo queda diferido hasta que exista ese endpoint. `Yarn.image` = URL string (como
  `Project.image`), sin cablear upload de Cloudinary → la deuda 3 no aplica todavía.
- **Ciclo de imports:** añadir `./api` al barrel de yarns NO rompió nada (FKs de Drizzle son
  closures perezosas); `projects/api/store.ts` NO se tocó. Verificado con build+typecheck+tests.
- **Verificación:** `bash ./init.sh` VERDE — **204 tests en 23 archivos** (antes 169 en 20,
  +35, 0 rotos). `pnpm build` OK, 4 rutas nuevas registradas. El reviewer ejecutó la
  verificación él mismo y auditó las 3 costuras + el scoping por `userId` de cada endpoint.
- **Observaciones no bloqueantes del reviewer (para el leader):**
  1. Deuda #6 (heredada): la traducción del duplicado a `DuplicateColorCodeError` en el
     store real solo está probada contra el doble; `isDuplicateColorCode` es defensiva
     (code/constraint/mensaje). Cubrir en el smoke test al integrar DB real.
  2. `tsconfig.tsbuildinfo` sigue trackeado (deuda 4): conviene `.gitignore`.
- **Informes:** `progress/reports/impl_yarns_catalogs.md`, `review_yarns_catalogs.md`.
- **Ampliación (mismo día):** el usuario detectó que faltaba el **DELETE de marca/tipo** en el
  acceptance original. Se reabrió #8, se actualizó el acceptance y se añadió con 1 implementer +
  1 reviewer (APROBADO a la primera). `DELETE /api/brands/:id` y
  `DELETE /api/brands/:id/types/:typeId`: con hijos (tipos/lanas para la marca; lanas para el
  tipo) → **409 bloqueante, SIN force y SIN cascada** (decisión de producto del usuario
  2026-07-22, distinta del DELETE de lana que sí tiene `?force`); sin hijos → 204; ajeno/
  inexistente o tipo que no pertenece a la marca de la URL → 404. El conteo de hijos ocurre
  ANTES del delete porque las FKs son `no action` (si no, Postgres daría 500). Sin tocar
  `schema.ts` ni migración. **219 tests en 23 archivos** (+15 sobre 204). Informes:
  `progress/reports/impl_yarns_delete_catalogs.md`, `review_yarns_delete_catalogs.md`.
- **Nota de proceso:** el acceptance de una feature puede quedar incompleto; conviene contrastar
  contra el PRD §9 (endpoints) al redactar el brief. Aquí el DELETE de catálogos no estaba en el
  PRD §9 explícitamente (solo GET/POST), pero sí era una necesidad real del usuario → se añadió.
- **Decisión abierta registrada — cableado de Cloudinary:** se difiere a la fase de UI, como un
  **endpoint de subida único compartido** (`POST /api/uploads/image`), no per-entidad. Motivo:
  sin UI no hay archivo que subir; `image` como URL string es funcional para el alcance del PRD.
  Al cablearlo aplica la deuda 3 (folder/publicId desde el `userId` del JWT, validados con zod,
  nunca del body crudo).
- **Próximo:** feature #9 `patterns_crud`.

## 2026-07-23 — Decisiones asentadas en el PRD (Cloudinary + borrado de catálogos)
- **Agente:** leader (edición de docs, tarea propia — no toca código).
- A pedido del usuario, se **asentaron formalmente en el PRD** (fuente única de verdad) dos
  decisiones que hasta ahora solo vivían en memoria/bitácora:
  - **§11.7 — Cableado de Cloudinary diferido a la fase de UI**, como endpoint de subida único
    compartido (`POST /api/uploads/image`), no per-entidad; `image` = URL string es suficiente
    para la etapa funcional; al cablear, derivar `folder`/`publicId` del `userId` del JWT
    validados con zod, nunca del body (deuda 3).
  - **§11.8 — Borrado de `Brand`/`YarnType` = 409 bloqueante**, sin `?force` ni cascada (distinto
    del borrado de `Yarn` referenciada, que sí admite force).
- También se actualizó **PRD §9 (Yarns + catálogos)** para listar los `DELETE /api/brands/:id` y
  `DELETE /api/brands/:id/types/:typeId` que se implementaron en la ampliación de #8 (antes el
  PRD solo listaba GET/POST y quedaba desincronizado con el código).

## 2026-07-23 — Feature #9 `patterns_crud` (DONE)
- **Agente:** leader (orquesta, costura del borrado nombrada en el brief) → implementer →
  reviewer (APROBADO a la primera, sin cambios requeridos).
- **Cambios:** feature `src/features/patterns/**` (types + validation + `api/{errors,store,
  create,list,get,update,delete,index}` + doble en memoria) y route handlers finos
  `src/app/api/patterns/{route,[id]/route,params}`. CRUD completo con filtros `?type=&inLibrary=`.
  `patterns/index.ts` pasa a exportar `./api`, `./types`, `./validation`. Feature casi
  **autocontenida** (Pattern solo referencia a User; el store de producción solo importa su
  propio schema + shared/db).
- **Modelo:** `instructions` y `metadata` como arrays ordenados `{ key, value }`; `inLibrary`
  bool (default false = embebido; true = biblioteca, reusable 1→N vía `project.patternId`). El
  completado de pasos NO vive en el patrón (sigue en `Project.completedSteps`, #6).
- **Costura del borrado (decidida y asignada en el brief — resuelta de entrada):** la FK
  `projects.pattern_id → patterns` es `ON DELETE set null` (S2). `DELETE /api/patterns/:id` →
  **204**; los proyectos que lo usaban quedan con `patternId = null` **por la FK, no por el
  servicio** (sin limpieza manual — S2). **NO** 409, **NO** `?force`, **NO** aviso a nivel BFF
  (un aviso sería confirmación de UI, fuera del alcance del PRD). El doble en memoria simula el
  `set null` compartiendo `projects.rows` y mutándolo in-place; test honesto (servicio + ruta)
  que confirma que el proyecto sobrevive con `patternId = null`.
- **Verificación:** `bash ./init.sh` VERDE — **242 tests en 25 archivos** (antes 219 en 23,
  +23, 0 rotos). `pnpm build` OK, 2 rutas nuevas registradas. Sin tocar `schema.ts` ni migración;
  añadir `./api` al barrel no rompió S1 ni introdujo ciclo.
- **Observación no bloqueante (reviewer):** deuda #6 vigente — el `set null` real solo está
  probado contra el doble; confirmar en el primer smoke contra Neon.
- **Informes:** `progress/reports/impl_patterns_crud.md`, `review_patterns_crud.md`.
- **Próximo:** feature #10 `dashboard_metrics`.

## 2026-07-23 — Smoke test real contra Neon (deuda #6) + bugfix de #8
- **Agente:** leader (aplica migración + verifica esquema, ops) → implementer (smoke) →
  leader enruta el bug → implementer (fix) → reviewer (APROBADO).
- **Migración APLICADA a Neon por primera vez:** el líder confirmó que la DB estaba **vacía**
  (0 tablas), aplicó `drizzle/0000_cold_ben_urich.sql` con `pnpm db:migrate` (PostgreSQL 17.10),
  y verificó por lectura directa que el esquema real coincide con el diseño: **8 tablas + 12 FKs**
  con sus `ON DELETE` exactos (todos los `user_id`→CASCADE, `craft_sessions.project_id` y
  `project_yarns.project_id`→CASCADE, `projects.pattern_id`→SET NULL, `project_yarns.yarn_id`/
  `yarn_types.brand_id`/`yarns.brand_id`/`yarns.type_id`→NO ACTION) + UNIQUE en `users.email` y
  `yarns(brand_id, color_code)`. Esto valida la tarea de arquitectura S2 contra Postgres real.
- **Smoke de comportamiento:** `src/__smoke__/neon.smoke.test.ts`, guardado por flag `SMOKE_NEON`
  (en la corrida hermética queda **skipped**, 0 conexiones; los tests normales siguen verdes).
  Ejercita los **stores/servicios reales** inyectándoles el cliente Neon. **5/6 comportamientos
  confirmados** contra Postgres real: cascada `deleteProject` (sin huérfanos en `project_yarns`/
  `craft_sessions`), `set null` `deletePattern`, `numeric→number` en `sumDuration`,
  `deleteYarn(force)`, bloqueo 409 `deleteBrand`.
- **BUG DE PRODUCCIÓN destapado por el smoke (el valor de probar contra DB real):** la detección
  de UNIQUE `(brandId, colorCode)` **no funcionaba** contra el driver `neon-http`. La violación
  llega como `DrizzleQueryError` con `.code`/`.constraint` `undefined`; el `NeonDbError` real
  (`code "23505"`, constraint) viaja en **`error.cause`**, que `isDuplicateColorCode`
  (`yarns/api/store.ts`) NO desenvolvía → el BFF habría dado **500 en vez de 409** en `createYarn`
  y `updateYarn`. Los unit tests estaban **verdes en falso** porque el doble imitaba la forma
  *plana* del error. Es exactamente el punto flojo que el review de #8 marcó como no bloqueante.
- **Fix (reabrió #8 → in_progress → done):** `isDuplicateColorCode` ahora recorre la cadena
  `.cause` (guarda de profundidad 5, sin ciclos), conservando el match plano y la constante única
  del nombre de constraint. +7 tests **herméticos** que alimentan la forma anidada real
  `{ cause: { code, constraint } }` (lo que el doble no puede reproducir) + profundidad + ciclo +
  passthrough + `updateYarn`. `bash ./init.sh` VERDE (**249 tests**, +7). Smoke re-corrido con el
  flag → **6/6 passed**; DB dejada limpia (8 tablas a 0 filas).
- **Hallazgo del teardown:** borrar un `users` con catálogos NO va en un solo statement
  (`users→brands` es cascade, pero `brands→yarn_types`/`yarns` son `no action`): el teardown debe
  ir en orden yarns→yarn_types→brands→user. Anotado por si aparece un "delete user" futuro.
- **Deuda #6:** de "la app nunca ha hablado con una DB real" a **saldada**: esquema aplicado y
  6/6 comportamientos de la capa de datos confirmados contra Neon. El smoke queda como guardia
  viva (por flag) para re-verificar tras cambios de store.
- **Informes:** `progress/reports/smoke_neon.md`, `impl_fix_duplicate_colorcode.md`,
  `review_fix_duplicate_colorcode.md`.
- **Próximo:** feature #10 `dashboard_metrics`.

## 2026-07-23 — Nuevo paso de proceso: informe de cierre en `progress/informs/`
- **Agente:** leader (edición de arnés/docs, tarea propia — no toca código).
- A pedido del usuario: al **cerrar** cada implementación (post-review), el leader escribe un
  **informe de síntesis** en `progress/informs/N.informe-<impl>.md` (**N secuencial**, no el id de
  feature). Responde **qué/cómo/por qué/dónde**, en lenguaje técnico pero explicando cada término,
  como capa por encima de los `reports/` crudos de los subagentes.
- **Grabado en:** `progress/informs/README.md` (convención + plantilla), `.claude/agents/leader.md`
  (protocolo de cierre de 4 pasos) y `CLAUDE.md` (visible en arranque). Solo aplica post-review;
  sin informe retroactivo de #9.

## 2026-07-23 — Feature #10 `dashboard_metrics` (DONE)
- **Agente:** leader (recon + costura nombrada en el brief) → implementer → reviewer (APROBADO a la
  primera, sin cambios requeridos). **Primer cierre con el nuevo informe de síntesis.**
- **Cambios:** feature `src/features/dashboard/**` (types + validation zod + `api/{store,metrics,
  comparison,index}` + doble en memoria) y Route Handler fino `src/app/api/dashboard/metrics/route.ts`
  con `withSession`. `GET /api/dashboard/metrics?year=&type=` → `{ hours, projects, yarnMeters,
  comparison }`. Feature de **agregación/solo-lectura**, scoping por `userId`. Lista fija
  `YARN_COMPARISONS` añadida a `src/shared/config/index.ts` (+ test). Sin tocar `schema.ts` ni migración.
- **Reglas de cálculo (PRD §8):** `hours = Σ craft_sessions.duration` con `start` en el año (join a
  `projects` si hay `type`); devuelve el **crudo en segundos** (unidad de `Project.time`, sin dividir).
  `projects` = con `startDate` OR `endDate` en el año (+ `type`). `yarnMeters = Σ(usedQuantity × length)`
  **lifetime** (PRD §11.2): ignora `year` y `type` (las lanas no son craft-typed), solo `userId`.
  `comparison` = mayor referencia con `meters ≤ yarnMeters` (menor si ninguna cabe).
- **Costuras resueltas de entrada (nombradas en el brief):**
  1. **Trampa `numeric→string`** del driver `neon-http`: los 3 agregados (`sum(duration)`, `count`,
     `sum(usedQuantity*length)`) van envueltos en `Number(coalesce(...,0))`, igual que `sumDuration`.
     El reviewer verificó cada `sum` por archivo:línea.
  2. **Costura S1:** el `DashboardStore` lee de 3 features importando sus TABLAS por `schema.ts`
     directo (no barrels), sin llamar a stores ajenos ni duplicar lógica; sin ciclo (build/typecheck
     verdes) y sin nueva migración.
  3. **`yarnMeters` invariante** a year/type: con test dedicado.
- **Verificación:** `bash ./init.sh` VERDE — **266 tests en 28 archivos** (antes 249 en 26, +17,
  0 rotos). `pnpm build` OK, ruta `/api/dashboard/metrics` registrada.
- **Observación no bloqueante (reviewer):** los agregados SQL reales (`sum(usedQuantity*length)`,
  `innerJoin` de horas) solo están cubiertos por el doble fiel; convendría un caso en `neon.smoke.test.ts`
  para ejercerlos contra Neon (opcional, deuda #8 del harness).
- **Informes:** `progress/reports/impl_dashboard_metrics.md`, `review_dashboard_metrics.md`.
- **Informe de síntesis (nuevo):** `progress/informs/1.informe-dashboard_metrics.md`.
- **Próximo:** feature #11 `calculators` (última; lógica pura sin DB).

## 2026-07-23 — Feature #11 `calculators` (DONE) — última feature del PRD
- **Agente:** leader (brief con el string canónico y los casos borde nombrados) → implementer →
  reviewer (APROBADO a la primera, sin cambios requeridos).
- **Cambios:** feature `src/features/calculators/**` de **lógica pura** — sin DB, sin endpoints, sin
  `api/` ni `schema.ts`. `errors.ts` (`InvalidCalculatorInputError`, error nombrado), `types.ts`,
  `increases.ts` (`calculateIncreases → string`), `rule-of-three.ts` (`calculateRuleOfThree → number`),
  `index.ts` (barrel) + tests co-ubicados.
- **Aumentos (§7.1):** `base = floor(P/A)`, `remainder = P mod A`, `total = P + A`. Caso canónico
  `P=40, A=6` → `"Teje 7 p, aumenta 1 (×4); luego teje 6 p, aumenta 1 (×2). Total: 46 p."` fijado al
  carácter por un test (símbolo `×` = U+00D7, no la letra `x`). Casos borde con fraseo decidido y
  cubierto: `remainder=0` (un solo tramo, sin `×0`), `P<A`/`base=0` (omite "teje 0 p"), `(×1)` siempre
  explícito. Enteros positivos obligatorios; violación → error nombrado.
- **Regla de 3 (§7.2):** `skeinsB = Math.ceil(skeinsA × lengthB / lengthA)` (redondeo hacia arriba,
  test donde es decisivo). Validación de entradas `<=0` (incl. `lengthA=0` = división por cero) → error nombrado.
- **Verificación:** `bash ./init.sh` VERDE — **281 tests en 30 archivos** (antes 266 en 28, +15,
  0 rotos). `pnpm build` OK, sin rutas nuevas (feature pura). Sin imports de `@/shared/db`/Drizzle
  (confirmado por el reviewer con grep).
- **Informes:** `progress/reports/impl_calculators.md`, `review_calculators.md`.
- **Informe de síntesis:** `progress/informs/2.informe-calculators.md`.
- **Hito:** ✅ **Las 11 features del PRD-01 (estructura funcional) están DONE.** El alcance funcional
  del proyecto (datos, BFF, lógica) queda completo y verificado (281 tests + smoke real contra Neon).
  Lo que sigue está **fuera del PRD-01**: fase de UI/estilos/Three.js.
- **Próximo:** no hay más features en `feature_list.json`. Decisión del usuario sobre siguiente fase
  (commit del trabajo acumulado + arranque de la fase visual).

## 2026-07-24 — Feature #12 `ui_foundation` (DONE) — arranca la Fase 2 (UI)
- **Agente:** leader (exploración propia de tokens/template/RFC/estado + brief con costuras fijadas) →
  implementer → reviewer (**APROBADO** a la primera, sin cambios requeridos).
- **Qué:** base del design system. Tokens de `template/tokens.css` portados a `src/app/globals.css` vía
  **`@theme`** (Tailwind v4, sin `tailwind.config`); fuentes self-hosted con `next/font/google`
  (Instrument Serif display/emphasis, Archivo body, IBM Plex Mono mono) mapeadas a `--font-*`; helper
  `cn()` = `twMerge(clsx())`; y los 3 primitivos base del acceptance — **Button, Field/Input, Card** — en
  `src/shared/ui/primitives/` con variantes `cva` y estados focus-visible/disabled.
- **Costuras clave (fijadas en el brief, sin sorpresas):** (1) vitest default sigue `environment: "node"`
  → los 281 tests de backend intactos; los tests de UI usan pragma `// @vitest-environment happy-dom`.
  (2) Alias `--color-*: var(--<rol>)` para habilitar utilidades `bg-*/text-*` sin inventar valores.
  (3) Valores crudos del template snapeados a la escala de tokens (template = insumo adaptable, RFC-01).
- **Cero hardcode:** enforced por `no-hardcode.test.ts` (escanea los 6 archivos de componente/variantes,
  falla ante hex/`rgb()`/`px` crudos). Diferencias con `calc()`/`color-mix()` sobre tokens = aceptable.
- **Stack nuevo (pnpm):** `tailwindcss@4.3.3` + `@tailwindcss/postcss`, `class-variance-authority`,
  `tailwind-merge`, `clsx`; dev: `@testing-library/react` + `user-event` + `jest-dom`, `happy-dom`,
  `vitest-axe` (+ `axe-core`). `postcss.config.mjs` nuevo.
- **Verificación:** `bash ./init.sh` VERDE — **312 passed | 6 skipped** (35 archivos; antes 281 → +31,
  0 rotos). `pnpm build` OK (ejercita next/font + `@theme`). `axe` sin violaciones en los 3 primitivos.
- **Gotcha:** comentario con `bg-*/text-*` en `globals.css` cerraba el comentario CSS (`*/`) y rompía el
  build → reescrito. Registrado para no repetir.
- **Informes:** `progress/reports/impl_ui_foundation.md`, `review_ui_foundation.md`.
- **Informe de síntesis:** `progress/informs/3.informe-ui_foundation.md`.
- **Próximo:** feature #13 `ui_shell_nav` (AppShell + ArchiveNav + BottomNav + route groups (app)/(auth)).
  Nota: exponer breakpoints en namespace `--breakpoint-*` para variantes responsive de Tailwind.
