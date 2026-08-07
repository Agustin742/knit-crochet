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

## 2026-07-24 — Feature #13 `ui_shell_nav` (DONE) — el caparazón de la app
- **Agente:** leader (exploración propia: forma de /auth/me + PublicUser + proxy + rutas; brief con costuras
  fijadas) → implementer → reviewer (**APROBADO** a la primera, sin cambios requeridos).
- **Qué:** shell + navegación. `src/shared/ui/layout/` con **AppShell** (header + main + BottomNav + slot 3D
  `--z-bg-3d` placeholder de #14) + **ArchiveNav** (≥ tablet, 6 carpetas `.kc-folder` dark-on-dark) + **BottomNav**
  (< tablet, táctil ≥ `--touch-target`), **presentación pura**. Activa por RUTA (`usePathname` → `aria-current`).
  Route groups `(app)` (envuelto por shell) y `(auth)` (limpio); home movida a `(app)/page.tsx`.
- **Costura arquitectónica (clave):** el fetch de `/auth/me` y el logout NO viven en `shared/ui` (pureza SDD §2)
  → nueva capa `src/features/auth/ui/AppShellClient.tsx` (Client) hace `GET /auth/me`, `POST /auth/logout` +
  `useRouter().push("/login")`, y compone el AppShell pasándole `user`+`onLogout`. `features/` → `shared/ui`, nunca al revés.
- **Deuda #12 saldada:** namespace `--breakpoint-*` en `@theme` (literales; las media queries no resuelven `var()`;
  comparten valores con `--bp-*`) → variantes responsive `tablet:` token-first. Sin pisar tokens de #12.
- **Cero hardcode:** `no-hardcode.test.ts` extendido a los 5 archivos de `layout/`. a11y: 2 navs con
  `aria-label` distinto (evita `landmark-unique` de axe), `aria-current="page"`, prefijo `.knit` `aria-hidden`.
- **Respetado:** `src/proxy.ts` y backend **intactos** (verificado por el reviewer con git diff); `<ascii-yarn>`
  (feature 14) y las 5 páginas de contenido (19-30) + login/register NO se construyeron (fuera de alcance).
- **Verificación:** `bash ./init.sh` VERDE — **338 passed | 6 skipped** (37 archivos; antes 312 → +26, 0 rotos).
  `pnpm build` OK (Next 16 valida route groups + límites client/server).
- **Informes:** `progress/reports/impl_ui_shell_nav.md`, `review_ui_shell_nav.md`.
- **Informe de síntesis:** `progress/informs/4.informe-ui_shell_nav.md`.
- **Próximo:** feature #14 `ascii_yarn` (web component `<ascii-yarn>`, three.js AsciiEffect, client-only,
  reduced-motion; llena el slot 3D del AppShell y es el loader global).
- **Deuda anotada:** (a) `proxy.ts` `/` público vs. Dashboard privado por RFC — resolver al cablear auth↔dashboard.
  (b) No hay feature explícita para páginas login/register — decidir si se agrega slice.

## 2026-07-25 — Feature #14 `ascii_yarn` (DONE) — la escena signature en ASCII
- **Agente:** leader → **3 exploradores en paralelo** (contrato SDD/RFC, técnica three/AsciiEffect, slot del
  AppShell) → **decisiones D1/D2/D3 cerradas con el usuario** → implementer → reviewer (**APROBADO** a la
  primera, sin hallazgos bloqueantes ni mayores).
- **Por qué exploración previa:** los RFC/template pedían un web component y el SDD §3/§6 pedía R3F+CanvasHost.
  Dos fuentes de verdad en contradicción → RFC-00 §6 obliga a resolverlas antes de salir de `pending`.
- **Decisiones cerradas (asentadas en RFC-01 §3 como tabla D1/D2/D3 + SDD §3 + description de #14):**
  **D1** componente React `AsciiYarn`, NO custom element (AsciiEffect reemplaza el DOM del canvas; Shadow DOM
  rompería los tokens). **D2** se mantiene `three` + R3F + `drei`: el ASCII va por `<AsciiRenderer />` y el giro
  por `<OrbitControls>` — eso justifica drei como dependencia en vez de cablear AsciiEffect a mano. **D3** con
  `prefers-reduced-motion` se apaga la auto-rotación pero **el arrastre sigue** (movimiento pedido ≠ impuesto).
- **Qué:** `src/shared/ui/three/ascii-yarn/` — `AsciiYarn` (barrera `"use client"` con `dynamic ssr:false`,
  host con las reglas duras del ASCII y gate mobile), `AsciiYarnScene` (Canvas + luces + controls + renderer,
  **único archivo del repo que importa `three`**), `YarnMesh` (esfera + 6 toros + 2 agujas), 2 hooks
  (`usePrefersReducedMotion`, `useViewportSupports3d`) con `useSyncExternalStore`.
- **Slot lleno:** `AppShell` gana prop `background?: ReactNode` (sigue SIN importar `three`, presentación pura);
  quien conoce la capa 3D es `AppShellClient` (feature layer, ya cliente). El ovillo se ve en todas las privadas.
- **Hallazgos no obvios (verificados contra `node_modules`, no inventados):** `enabled={false}` en OrbitControls
  apagaría también la auto-rotación → el gate va por `pointer-events`, con **doble candado** porque R3F escribe
  `pointerEvents:'auto'` inline. El fondo de escena debe ser **negro opaco**: con canvas transparente AsciiEffect
  fuerza brillo 1 y, con `invert`, pinta la pantalla entera de `@`. `fgColor="var(--accent)"` es la vía token-first
  (drei lo asigna como CSS string inline).
- **Degradación mobile = OMITIR** (de las 3 opciones del SDD §7), leyendo el token `--bp-tablet` con `matchMedia`:
  `tablet:` solo escondería la escena, seguiría montada consumiendo CPU. **Falla abierto** (si no hay token, monta).
- **Tests:** 9 nuevos con mocks **en el borde** (solo R3F y drei; `YarnMesh` y los intrínsecos de three se
  renderizan de verdad). `matchMedia` real de happy-dom vía `window.happyDOM.settings.device`. Sin tests de píxeles.
- **Verificación (ejecutada por el reviewer, no copiada):** `bash ./init.sh` exit 0 — **356 passed | 6 skipped**
  (antes 338 → +18: 9 ascii-yarn + 1 layout + 8 de no-hardcode; 0 rotos). `pnpm build` exit 0, 12/12 páginas.
  **El chunk con `WebGLRenderer` no aparece en ningún manifiesto inicial ni en el HTML prerenderizado.**
  `grep` de imports de three/R3F en `src/` = exactamente 2 líneas, ambas en `AsciiYarnScene.tsx`.
- **Stack nuevo (pnpm):** `three@0.185.1`, `@react-three/fiber@9.6.1`, `@react-three/drei@10.7.7`;
  dev `@types/three@0.185.1`. `next.config.ts` NO se tocó (three publica ESM ya compilado).
- **Informes:** `progress/reports/explore_ascii_yarn_contrato.md`, `explore_three_asciieffect.md`,
  `explore_slot3d_appshell.md`, `impl_ascii_yarn.md`, `review_ascii_yarn.md`.
- **Informe de síntesis:** `progress/informs/5.informe-ascii_yarn.md`.
- **Próximo:** feature #15 `uploads_image` (POST /api/uploads/image cableando el helper Cloudinary de #5;
  aplica la deuda 3: folder/publicId desde el userId del JWT validados con zod, nunca del body crudo).
- **Deuda anotada:** `frameloop="always"` re-asciifica cada frame incluso con reduced-motion (coste de batería
  continuo en todas las privadas) → candidata a `frameloop="demand"`. Las 3 decisiones que #19 debe tomar antes
  de empezar (fondo vs. hero, a11y de teclado del modo interactive, fps) quedaron escritas en su `description`.

## 2026-07-25 — Bugfix + hardening: un informe `.md` rompía el CSS de toda la app
- **Agente:** usuario reporta el crash → leader diagnostica + fix inmediato → implementer construye el
  guardrail → leader verifica. (No es una feature: no se tocó ningún `status` de `feature_list.json`.)
- **Síntoma:** `pnpm dev` con `Parsing CSS source code failed … var(--dur-*) … Unexpected token Delim('*')`
  apuntando a `src/app/globals.css`; la app devolvía 500 en todas las rutas.
- **Causa raíz (el archivo culpable NO era el que señalaba el error):** `progress/reports/impl_ui_shell_nav.md:69`
  (informe de #13) documentaba una convención escribiendo `duration-[var(--dur-*)]`, con `*` como abreviatura
  humana de "cualquier token `--dur-`". **Tailwind v4 escanea TODO el repo buscando clases, incluidos los `.md`**,
  lo tomó por una clase real y generó `transition-duration: var(--dur-*)` — CSS inválido que tumbaba el archivo entero.
- **Fix inmediato (leader):** reescrita esa línea sin sintaxis de clase con comodín + nota para que nadie la
  "corrija" de vuelta. Verificado compilando el CSS aparte con postcss (sin tocar el `pnpm dev` del usuario,
  que tenía tomada `.next`): 0 líneas inválidas.
- **Guardrail (implementer), en `src/app/globals.css`:** `@import "tailwindcss" source("../")` (acota la detección
  automática a `src/`) + `@source not` para `progress/`, `docs/` y `template/`. Sintaxis verificada **contra el
  parser real de `node_modules/tailwindcss` 4.3.3** (prefijo `not ` con espacio, ruta entre comillas, base = el
  directorio del CSS), no de memoria.
- **Prueba de que el guardrail funciona** (una directiva mal escrita fallaría en silencio): carnadas sembradas en
  las 3 carpetas + 4 escenarios. Sin exclusiones las 3 aparecen en el CSS **y el veneno original reproduce el bug
  exacto**; con el guardrail puesto y el veneno aún en `progress/`, cero carnadas y cero inválidos, con las clases
  reales de `src/**` intactas. Control negativo del test: comentando las directivas, 3 de 6 tests fallan.
- **Hallazgo de paso:** el CSS generado **adelgaza 2,7 kB** (30976 → 28273 bytes). `docs/`/`template/`/`progress/`
  YA estaban inyectando utilidades basura en el CSS de producción; el `*` inválido fue solo la primera que reventó
  en vez de colarse en silencio.
- **Test de regresión:** `src/app/globals-css.test.ts` (6 tests) — compila el CSS de verdad, aserta que no hay
  `var(--…*)`, que siguen apareciendo utilidades reales de `src/**`, y que las 3 carpetas no se escanean (carnadas
  temporales borradas en `afterAll`). Robusto al cwd vía `import.meta.url`.
- **Verificación:** `bash ./init.sh` VERDE — **362 passed | 6 skipped** (antes 356 → +6, 0 rotos), verificado por
  el leader además del implementer. `pnpm build` OK + inspección del CSS realmente emitido por el build.
- **Informes:** `progress/reports/impl_tailwind_source_guardrail.md`.
- **Informe de síntesis:** `progress/informs/6.informe-bugfix-tailwind_source_guardrail.md`.
- **Deuda:** el test importa `postcss` sin declararlo en `package.json` (dependencia dura de Next/Vite, hoisteada
  y pinneada por el `overrides` de `pnpm-workspace.yaml`); si algún día falla con "Cannot find package 'postcss'",
  añadirlo como devDependency explícita.
- **Regla nueva para todos los agentes:** no citar clases de Tailwind con comodines ni inventadas en los informes.

## 2026-07-25 — Port fiel del ovillo + sintaxis canónica de Tailwind (dos tareas encadenadas)
- **Agente:** usuario reporta "se ve horrible y distinto al template" → leader (diagnóstico + decisión con el
  usuario) → implementer (port) ; luego usuario reporta warnings de IntelliSense → leader (convención) →
  implementer → reviewer (**APROBADO**). Ninguna es feature: no se tocó ningún `status`.

### (a) Port fiel de `template/ascii-yarn.js` — corrección de #14
- **Premisa que cambió:** el usuario **entregó `template/ascii-yarn.js`**, la implementación de referencia que
  el explorador dio por inexistente (el template solo mostraba la etiqueta como texto y el `.js` "en la raíz"
  nunca se había entregado). Con eso, D2 (drei `AsciiRenderer`) quedó obsoleta.
- **D2-bis (nueva, con el usuario):** motor de **`three` puro** portando el algoritmo del template — render a
  un `WebGLRenderTarget` de `cols × rows` (**1 píxel = 1 carácter**), `readRenderTargetPixels`, luminancia →
  rampa de 13 caracteres, escritura a un `<pre>`. **Sin `AsciiEffect`, sin drei, sin R3F** (ambos paquetes
  desinstalados, −45 dependencias). Razón: `AsciiEffect` promedia bloques a resolución completa y emite su
  propia `<table>` con `letter-spacing`; **por construcción no puede dar el mismo resultado visual**.
- **Fidelidad 1:1 auditable** (tabla completa en el report): 18 anillos con el LCG de semilla 42 (no
  `Math.random`), esfera 0.98, `MeshPhong 0xd8d8d8`, agujas cilindro+cono+perilla, cámara fov 34 con
  **aspect `(cols*0.6)/rows`** (compensa que el carácter es más alto que ancho), 3 luces, paso 0.006,
  arrastre 0.01/0.008 con clamp ±1.2, retícula 96×44.
- **Desvíos deliberados:** `three` del paquete instalado y no del CDN; literales CSS a token (`11px` →
  `text-xs`, que **ya valía 11px**; `currentColor` heredado de `text-accent` en el host); `glow` mapeado a
  `--shadow-glow` (mismo rosa, radio/alfa distintos — no se inventó token).
- **Deuda 8 SALDADA:** con `prefers-reduced-motion` se dibuja **un frame y no se arranca el rAF**; el arrastre
  redibuja a demanda. Se acabó el consumo continuo de CPU en todas las páginas privadas.
- **Verificación:** `init.sh` 368 passed | 6 skipped. `pnpm build` OK. **La validación visual la hace el
  usuario** — es el criterio de aceptación real (SDD §9) y quedó pendiente.
- **Report:** `progress/reports/impl_ascii_yarn_port.md`.

### (b) Sintaxis canónica de variables en Tailwind v4
- **Disparador:** warnings `suggestCanonicalClasses` de IntelliSense. El usuario pidió asentarlo en las
  convenciones y arreglar lo existente. El inventario real eran **60 ocurrencias en 12 archivos**, no las 3
  que reportaba el IDE (solo veía los archivos abiertos).
- **Convención nueva** en `docs/harness/conventions.md`: forma corta `p-(--space-6)` en vez de
  `p-[var(--space-6)]`, con tabla (incluye el hint de tipo `border-(length:--border-width)` y la propiedad
  arbitraria `[z-index:…]` → `z-(--z-nav)`) y **excepciones explícitas**: valores compuestos y `calc()` **no**
  se convierten porque la forma corta acepta **una sola variable** y perdería valores en silencio.
- **Criterio de corrección = equivalencia del CSS**, no "compila y pasan los tests". Verificado por el
  implementer (47 pares en aislamiento: 43 SAME + 4 controles negativos DIFF) y **reproducido por el
  reviewer**, que además **reconstruyó el estado previo revirtiendo las 70 ocurrencias en una copia fuera del
  repo**: CSS completo **idéntico** (204 bloques, 0 diferencias).
- **Incoherencia saldada:** z-index estaba escrito de dos formas (`z-[var(--z-base)]` y `[z-index:…]`) y
  **emitía reglas CSS duplicadas**; ahora emite una.
- **Guardrail nuevo** `src/shared/ui/canonical-tailwind-classes.test.ts`: barre `src/**` **por recorrido de
  directorios, no por lista fija** (a diferencia de `no-hardcode.test.ts`), con 14 de sus 17 tests dedicados a
  probar que el regex no tiene falsos positivos con las excepciones.
- **REGLA NUEVA derivada de un tropiezo del propio refactor:** la primera versión de ese test escribía las
  clases de ejemplo literales y **Tailwind, que también escanea los `.test.ts`, las convirtió en utilidades
  reales** (`.border`, `.transition`, `.shadow-paper` fantasma) — misma familia del bug del `--dur-*`. Ahora
  las muestras se arman por concatenación en runtime. Asentado en `conventions.md`.
- **Verificación:** `init.sh` **385 passed | 6 skipped** (+17 = exactamente los del guardrail). `pnpm build` OK.
  Reviewer: cero utilidades fantasma (207 reglas compilando con y sin los 40 tests), `twMerge` sin cambios en
  17 cadenas reales, guardrail marca 70/70 sobre el estado previo y 0 sobre el actual.
- **Reports:** `progress/reports/impl_canonical_tailwind_syntax.md`, `review_canonical_tailwind_syntax.md`.
- **Deuda nueva:** (13) **defecto real preexistente**: `leading-tight` se pierde en `buttonVariants` porque
  `twMerge` la descarta contra el `text-base` de la variante de tamaño — el interlineado del botón no es el
  que dice el código. (14) el guardrail es ciego a utilidades negativas y a la forma de propiedad arbitraria.
  (15) `no-hardcode.test.ts:12-15` cita clases literales en un comentario.

## 2026-07-27 — Corrección de #13 `ui_shell_nav`: `ArchiveNav` al modelo fichero

- **Origen:** el usuario reportó que el nav "no se ve como un organizador". Diagnóstico del leader con
  el **MCP de Chrome**: el `.kc-folder` del template y su port a `src/` implementaban **una fila de
  pestañas solapadas**, no un archivero.
- **Causa raíz — la fuente estaba mal, no la implementación.** `SDD-01` §0 admite que la referencia del
  archivero (`softglossary.space`) *"no respondió al fetch"* y se reconstruyó **de capturas**. Nadie había
  visto nunca su CSS. Se abrió en vivo y se midió: el modelo real es un **stack vertical de hojas
  full-bleed** de 10px de canto, con escalonado que sale del apilamiento, offsets horizontales por
  pestaña, hover que **encoge** la hoja (10→2px) y la despega 8px, y sombra hacia **arriba**. Volcado
  verbatim en `progress/reports/explore_softglossary_register.md`.
- **Decisión nueva D4** en `docs/design/rfc/RFC-01-shell.md` §3, con 10 invariantes. **Deroga el
  `.kc-folder` para `src/**`.** Por decisión del usuario `template/template-src.html` **NO se tocó**:
  template y `src/` ya no coinciden, y para `src/` manda D4 (mismo criterio que `<ascii-yarn>` en D1).
- **Reviewer RECHAZÓ la 1ª ronda por contrato, no por calidad** (init.sh y build verdes): 3 de los 10
  invariantes no se cumplían. Dos eran decisiones del usuario, no del implementer.
- **Tres enmiendas E1/E2/E3 a D4**, escritas en el RFC con su porqué para que nadie las revierta:
  - **E1** — el cajón **no se reordena al navegar** (decisión del usuario): reordenar mueve las 6
    pestañas en cada clic y destruye la memoria espacial. Arrastra que la activa ya **no** puede pintar
    la hoja en tono de página (en mitad del cajón se lee como un agujero): el tono va en la **pestaña**.
  - **E2** — "las 6 etiquetas enteras" rige **desde 768px**, no sólo en desktop. El reviewer midió que a
    768px se recortaban **3 de las 6**, y `--bp-tablet` es el ancho donde el archivero se enciende.
  - **E3** — la profundidad la reparten sombra hacia arriba **+ filo de 1px**; lo prohibido es el escalón
    tonal entre hojas.
- **El contraste era imposible de portar:** sobre el espresso, **ni una sombra negra opaca** pasa de
  1.41:1. Se recalibró la sombra del **6% al 55%** y el filo lo lleva a 2.79:1. Los tres ratios están
  **clavados en tests** (`archive-nav.tokens.test.ts`), calculados con luminancia WCAG y **reproducidos
  por el reviewer**.
- **"CALCULADORAS" no entraba en una línea a ningún ancho del rango** (~152px de columna contra ~160px
  disponibles): se resolvió con el lockup **en dos líneas**, que además es la forma de la referencia.
  Más monograma y nombre de usuario oculto bajo desktop.
- **Verificación:** `init.sh` **408 passed | 6 skipped** (baseline 385, **+23, ninguno eliminado**),
  `pnpm build` OK. Guardrails intactos y verdes sin tocarlos — el de cero-hardcode **cazó al implementer
  en caliente** al escribir un ancho literal en un comentario. Validación visual del leader en navegador:
  a 768px las 6 etiquetas con `scrollWidth === clientWidth`, cero solapes, 74px de holgura.
- **Reports:** `explore_softglossary_register.md`, `explore_archivenav_blast_radius.md`,
  `explore_archivenav_tailwind_expresion.md`, `impl_archive_nav_fichero.md`,
  `review_archive_nav_fichero.md`, `review_archive_nav_fichero_r2.md`.
  **Informe de cierre:** `progress/informs/7.informe-archive_nav_fichero.md`.
- **Deuda nueva:** (16) `--shadow-paper` sin consumidor. (17) variante fantasma de `Button` ilegible
  sobre superficies oscuras (el nav sólo la parchea). (18) los dos juegos de tokens de breakpoint no
  están sincronizados por ningún test, y ahora sostienen la garantía de E2. (19) en tablet no se muestra
  el nombre de usuario. (20) la garantía de ancho cubre las 6 páginas de la app, no listas de ítems
  arbitrarias.
- **#13 sigue `done`** (no se reabrió), igual que en la corrección de #14.

---

## 2026-08-01 — Lote de higiene: deudas 21, 17, 13 y 4 (NO es una feature)

- **Cadena:** leader → implementer → reviewer (**CAMBIOS REQUERIDOS**, 2 bloqueantes) → implementer (2ª
  vuelta) → reviewer (**APROBADO**). `feature_list.json` **no se tocó**: esto no es una feature.
- **Decisión del usuario cerrada en esta sesión:** el tamaño de etiqueta del archivero se queda en **18px**
  (`--text-nav-tab`), y con él `--bp-archive: 1180px`. Se descartaron 24px (desaparecería de los portátiles
  de 1280-1366px) y los 36px de la referencia (sólo monitores grandes). **No se reabre.** El usuario también
  decidió que **#15 `uploads_image` no arranca todavía**.
- **Criterio de selección de las 4 deudas:** son las que **se multiplican con cada consumidor nuevo**, y
  #15-#31 van a instanciar botones y páginas en masa.
- **Saldadas: 21, 17, 13, 4 y 32** (esta última nació dentro del lote y se saldó en la 2ª vuelta).
  - **21** — el caparazón pedía `GET /api/auth/me` en cada navegación, el nav lo descartaba y el `setUser`
    re-renderizaba el shell entero; `handleLogout` era código inalcanzable desde E7 y su test se fabricaba su
    propio sujeto (un botón "Salir" que sólo existía dentro del test). Fuera todo; JSDoc mentiroso corregido;
    firma pública de `AppShell` intacta (la usa #31); endpoint sin tocar. Gate nuevo: montar el shell no
    dispara **ningún** fetch.
  - **17 + 32** — la variante fantasma de `Button` era **invisible** (contraste **1.00**, no "ilegible") sobre
    el fondo de la app. Pasa a **heredar** el primer plano; y `Card` pasa a **declararlo** junto a su fondo,
    que es de donde hereda. Las 4 superficies quedan legibles (12.83 / 14.65 / 13.84).
  - **13** — `twMerge` descartaba el interlineado porque el tamaño de letra llega después y trae el suyo.
    Medido en CSS compilado: el botón se pintaba a **1.5** (y ~1.556 el de icono) contra el **1.1** declarado.
    Arreglado uniendo tamaño e interlineado en la misma clase.
  - **4** — `tsconfig.tsbuildinfo` fuera del índice + `.gitignore`. Deja una **eliminación preparada en el
    índice**: entra en el próximo commit, el archivo sigue en disco.
- **Por qué se rechazó la 1ª vuelta (lo instructivo):** (1) el arreglo de la 17 **movió** el defecto de 1
  superficie a 3 (las claras caían a 1.14 / 1.08 / 1.13) y se archivó como ficha tachada — el reviewer
  distinguió lo preexistente (párrafo dentro de `Card` = deuda 32) de la **regresión introducida** (el botón
  fantasma dentro de `Card`, que antes se leía a 14.65); (2) el test escrito para probar el arreglo medía un
  par de tokens **que ningún camino del código produce** y por eso tapaba en verde el caso roto — el patrón
  de las deudas 18/22/23 reproducido dentro del lote que venía a limpiarlo.
- **Cómo se cerró el bloqueante 2 (transferible):** el par de contraste **se deriva del código** —lee la
  regla `body` de `globals.css` y llama a `cardVariants` de verdad— en vez de elegirse a mano, así que no
  puede quedar verde por el motivo equivocado. Y se exigió **condición doble** como criterio de aceptación:
  sin el arreglo de `Card` el test cae en **rojo** (1.1424 / 1.0787); con él, **verde** (14.65 / 13.84).
  Ejecutada por el implementer y **reproducida por el reviewer**.
- **Verificación:** `bash ./init.sh` **435 passed | 6 skipped** (baseline 420, **+15, ninguno eliminado sin
  justificar**), `pnpm build` OK, `globals-css.test.ts` 6 passed. Corrido por el reviewer por su cuenta en
  las dos vueltas. Validación visual no procede: ni la variante fantasma ni `Card` tienen consumidor montado
  en ninguna ruta (`/` es la única que existe); la sustituye la medición sobre tokens y clases reales.
- **Reports:** `impl_deudas_21_17_13_04.md`, `review_deudas_21_17_13_04.md`,
  `impl_deudas_21_17_13_04_r2.md`, `review_deudas_21_17_13_04_r2.md`.
  **Informe de cierre:** `progress/informs/9.informe-deudas_21_17_13_04.md`.
- **Deuda nueva (29-34):** (29) #31 tiene que **reescribir** el gate del shell, no sólo añadir código.
  (30) `"use client"` sobrante en `AppShellClient`, diferido a #31. (31) anillo de foco por debajo de 3:1 en
  dos superficies claras (la elevada, por defecto, sí pasa con 3.13). (33) `twMerge` clasifica el tamaño de
  etiqueta del archivero como color, no como talla — **acoplada con la 13**: esa misma clasificación errónea
  es hoy lo que *protege* su interlineado. (34) el gate de la 13 no cubre el eje del llamador vía `className`.
- **Fichas corregidas:** la **17** (decía que el archivero la parcheaba — falso desde E7; y decía "ilegible"
  cuando era invisible) y la **31** (alcance más alarmista de lo real).

---

## 2026-08-01 — #31 `auth_ui` DONE (páginas de login y register)

- **Cadena:** leader → **3 exploradores en paralelo** → implementer → reviewer (APROBADO) → implementer
  (deudas 37/38) → reviewer (APROBADO) → implementer (método de envío) → reviewer (APROBADO). **3 rondas de
  review, ningún bloqueante en ninguna.**
- **#31 se adelantó al orden por id** (le tocaba después de #15-#30) por una **restricción dura**: el proxy
  manda a `/login` y esa ruta **no existía** (404), así que en cuanto #19 volviera privado el Dashboard —su
  criterio de aceptación— la app entera habría quedado inalcanzable en el navegador.
- **Alcance acotado por decisión del usuario a las dos páginas.** Había pedido primero que #31 devolviera el
  logout al archivero; **cambió de decisión al ver la medición**: 30.88px de holgura contra los 168px que
  reservaba la banda de utils, subir el ancho de nacimiento a ~1269-1317px reabría una decisión cerrada el día
  antes, y un control a la derecha **se solaparía con la pestaña de la columna 6 en 4 de las 6 rutas sin que
  ningún test lo detectara**. → **feature #32 `account_menu`** creada (`pending`), bloqueada hasta una
  enmienda E11 del RFC-01 con tres decisiones tomadas. Deudas 29 y 30 mudadas ahí.
- **Lo entregado:** `/register` crea la cuenta e inicia sesión de una vez; `/login` autentica y devuelve al
  destino guardado. Ovillo ASCII sólo en login (RFC-01 §2), con test que impide moverlo al layout.
- **Seguridad — se cerró un redirector abierto que nacía con la feature.** El `?next=` del proxy **no tenía
  ninguna validación en el repo**. El reviewer no la leyó: la **atacó** con 61.440 casos de fuerza bruta + 45
  clásicos a mano, y en la 2ª ronda repitió el ataque **por el camino nuevo** (servidor→cliente) añadiendo
  parámetro repetido, prototipo contaminado, getters hostiles y objetos con conversión a texto envenenada.
  **Cero fugas en las dos rondas.**
- **Ronda 2 — deudas 37 y 38, cerradas por decisión del usuario** en vez de dejarlas fichadas:
  - **37**: `/login` se servía **sin formulario en el HTML** (frontera de Suspense con relleno nulo). Se
    resolvió leyendo el destino en el servidor; la frontera desaparece. **Precio declarado:** `/login` pasa de
    estática a dinámica.
  - **38**: los errores tardíos de campo no se anunciaban con lector de pantalla. Se resolvió **moviendo el
    foco al primer control inválido**; `Field` ya cablea las asociaciones, así que no se tocó el design system.
- **Ronda 3 — hallazgo del reviewer, cerrado en su versión mínima.** Los dos formularios se servían **sin
  `action` ni `method`**, así que el envío nativo del navegador era un **GET con la contraseña en la URL**
  (CWE-598) — verificado contra un servidor real, no por lectura. **El escenario lo habilitó el arreglo de la
  37**: ahora el formulario se ve antes de hidratar, así que se puede enviar antes de que React enganche.
  Defecto **previo** (`/register` lo tenía desde el principio; el reviewer admitió que se le pasó en su primera
  review). Se declaró POST: saca el secreto de la URL, que era **lo irreversible**.
- **⚠️ CORRECCIÓN AL REGISTRO:** este arnés afirmó dos veces que declarar POST convertía el peor caso en "un
  405 inofensivo". **Es falso: Next 16 responde 200 a un POST a una página del App Router.** Lo midió el
  implementer, corrigió al reviewer y al leader, y el reviewer lo reprodujo y lo aceptó. Seguridad igual;
  experiencia no: queda un envío **silencioso** → deuda 39.
- **Verificación:** `bash ./init.sh` **481 passed | 6 skipped** (baseline 435, **+46, ninguno borrado sin
  justificar**; 1 reescrito conservando entera su garantía original). `pnpm build` OK. **Condición doble en
  todos los gates nuevos**, ejecutada por el implementer y **reproducida por el reviewer** (la de la guarda del
  destino da 17 rojos clavados). Los dos gates del caparazón intactos y verdes en las tres rondas.
  **Los dos defectos más serios se detectaron levantando un servidor real, no leyendo código.**
- **Reports:** `explore_auth_endpoints_contract.md`, `explore_auth_ui_designsystem.md`,
  `explore_auth_shell_blast_radius.md`, `impl_auth_ui_paginas.md`, `review_auth_ui_paginas.md`,
  `impl_auth_ui_deudas_37_38.md`, `review_auth_ui_deudas_37_38.md`, `impl_auth_forms_post.md`,
  `review_auth_forms_post.md`. **Informe de cierre:** `progress/informs/10.informe-auth_ui.md`.
- **Deuda nueva 35-43**, saldadas 37 y 38. Destacan: **39** (el acceso sigue dependiendo de JS; la salida es
  Server Action), **40** (el gate de la 37 no ve dentro de los componentes cliente) y **43** (**tercera**
  aparición del patrón "lista fija" en el repo, y la primera en la que lo que se escapa es una credencial —
  conviene taparla junto con la 40, con el mismo barrido por directorios).
- **Lección operativa del arnés:** los subagentes `Explore` son de **solo lectura** y **no pueden escribir su
  informe**. Los tres exploradores bloquearon al intentarlo y el leader tuvo que volcarlos a mano a
  `progress/reports/`. Para la regla anti-teléfono-descompuesto hay que usar `general-purpose`.
- **Consecuencia visible del alcance:** hoy **no hay forma de cerrar sesión desde la interfaz** (esperado;
  llega con #32). La cookie caduca sola a los 7 días.

---

## 2026-08-03 — Diagnóstico de los bugs de navegador (deudas 44/45/46) + feature #32 `account_menu`

Sesión de dos mitades: primero **medir** los dos bugs que el usuario reportó tras probar la app, y después
construir lo que la propia medición señaló como el arreglo de fondo.

### Mitad 1 — el smoke real de auth (deuda 46) refutó la hipótesis, que es para lo que sirve

- **Cadena:** leader → 2 `general-purpose` de diagnóstico en paralelo (servidor / cliente) + 1 `implementer`
  (el smoke). Tarea de **verificación**: instrucción explícita de **no parchear nada**.
- **La ficha 45 apostaba** a que fallara la traducción del error UNIQUE de Postgres, por analogía con el bug
  de `isDuplicateColorCode` de las lanas. **El leader vio antes de lanzar nada que el paralelo no aplicaba**:
  `registerUser` hace `findByEmail` **antes** de insertar, así que nunca llega al error del driver.
- **Resultado medido contra Neon real:** `POST /api/auth/register` con email repetido devuelve **409**,
  también con distinta caja y con espacios. **5/5 verde.** Las tres hipótesis (traducción del UNIQUE,
  normalización del email, mapeo del status en el cliente) cayeron **con evidencia**, no por descarte.
- **Dato de la base que acota el síntoma:** había **una sola fila** en `users`. Un 201 espurio habría dejado
  dos → descartado. Un 500 también deja una → **no** descartado.
- **Deuda 46 saldada** (`src/__smoke__/auth.smoke.test.ts`, mismo flag `SMOKE_NEON` que el de lanas, skipped
  y sin abrir conexión en la corrida hermética). **Deuda 45 RECALIFICADA** como deuda de **presentación**:
  el 409 llega y se pinta bajo el campo email, pero nadie ha comprobado que sea **perceptible**. **Deuda 44
  resuelta como (b)**: la sesión sí se crea y el formulario sí navega — no se notaba porque nada en pantalla
  decía que había sesión, que es exactamente lo que #32 viene a arreglar.
- **Deudas nuevas 47 y 48**, ciertas aunque no causaran el síntoma: el store de auth **no traduce el 23505**
  (500 en vez de 409) y `registerUser` es un check-then-act con ventana de carrera. **La 47 primero**: con
  ella, la 48 degrada a un 409 correcto.
- **Decisión del usuario:** dar por buena la evidencia y **no** hacer la comprobación en navegador.

### Mitad 2 — E11 escrita y feature #32 `account_menu` cerrada

- **#32 estaba bloqueada por diseño**, no por código: exigía la enmienda **E11** del RFC-01 con tres
  decisiones tomadas. El leader las planteó con la medición delante (**30.88px** de holgura contra los
  **168px** que reservaba la banda histórica, y **48px** sólo de relleno lateral de un `Button` `md`) y el
  usuario eligió: **(a)** el control **fuera del `nav`**, en banda propia del `AppShell`, con el archivero
  intacto y **`--bp-archive` sin tocar** — o sea **sin reabrir** la decisión cerrada del tamaño de etiqueta;
  **(b)** esa banda rige **en todos los anchos**, sin tocar `BottomNav`; **(c)** gate obligatorio del
  extremo derecho con la ranura 6 como peor caso.
- **Cadena:** leader (E11) → 1 implementer → 1 reviewer. **APROBADO a la primera: 0 bloqueantes**, 7
  observaciones no bloqueantes.
- **⚠️ CORRECCIÓN AL RFC, hecha al cerrar:** E11(c) daba por supuesto que la banda **se superpondría** al
  archivero. **La implementación demostró que esa premisa era inviable:** el techo libre sobre la pestaña de
  la columna 6 en ranura 6 es de **10px en reposo y 2px con el puntero encima**, y la banda necesita **60px**.
  No hay forma de meter 60 en 2. La banda va **en el flujo**, antes del `header`, y la colisión deja de ser
  posible **por construcción**. El gate (c) sigue existiendo y ahora asegura **que la banda siga en el flujo**.
- **El usuario se resuelve en el layout servidor** de `(app)` (`getSessionUser`), que era la "opción de menor
  radio" del propio acceptance: así el gate de *"montar el caparazón no dispara ningún fetch de cliente"*
  **sigue siendo verdad** en vez de haberse borrado. `AppShellClient` recupera estado sólo para el logout →
  **deuda 30 saldada sola**.
- **`ArchiveNav` pierde las props `user`/`onLogout`**, que declaraba y tiraba desde E7: una promesa muerta
  menos. La banda **no monta nada** si falta el usuario **o** el callback — enseñar el nombre con un botón
  muerto es el error de E7 al revés.
- **Deuda 36 saldada en `src/proxy.ts`:** con cookie válida, `/login` y `/register` redirigen a `/`. **Sólo
  páginas, nunca los endpoints** (redirigir un POST rompería el propio alta), y **verificando la firma**, no
  la mera presencia de la cookie.
- **Verificación:** `bash ./init.sh` **515 passed | 11 skipped** (partida 481/11; **+34**, ninguno borrado) y
  `pnpm build` OK, **reproducidos por el reviewer con sus propios números**. **Tres condiciones dobles**
  ejecutadas en las dos direcciones. **Medido contra un servidor real** (`pnpm start` + `curl`): el redirect
  de la 36 en vivo (307 a `/`), el logout sin sesión (401), y **0 bandas** en el HTML anónimo.
- **Deudas: 19 corregida y saldada**, 22/23/24 recalibradas, **29/30/36 tachadas**; **nuevas 49** (si el
  logout falla no se avisa: el botón parece roto), **50** (`/` pasó de estática a dinámica; una lectura de
  la base por carga), **51** (la banda no se ha visto con sesión real), y del review **52** (el gate (c) se
  puede burlar **desde fuera**: misma familia que 22 y 40), **53** (la banda no tiene nombre accesible) y
  **54** (`GET /api/auth/me` se quedó **sin ningún consumidor**).
- **Reports:** `explore_auth_duplicate_email_server.md`, `explore_auth_register_client.md`,
  `impl_smoke_auth_neon.md`, `impl_account_menu.md`, `review_account_menu.md`.
  **Informe de cierre:** `progress/informs/11.informe-account_menu.md`.
- **Lección de método de la sesión:** el smoke acertó **refutando** su propia hipótesis, y el implementer
  **corrigió una premisa del RFC que había escrito el leader**. Las dos cosas salieron de medir en vez de
  razonar.

---

## 2026-08-05 — Feature #15 `uploads_image` (endpoint único de subida de imagen)

- **Cadena:** leader → 1 implementer → 1 reviewer (**CAMBIOS REQUERIDOS**, 2 bloqueantes) → implementer
  (corrección) → reviewer (**APROBADO**, 0 bloqueantes). Sin exploradores: el terreno estaba claro (helper
  de Cloudinary de #5, `withSession` y el patrón de Route Handler ya establecidos).
- **Qué entra:** `POST /api/uploads/image`, **puerta única y compartida** por los formularios de Proyecto
  (#22), Lana (#25) y Patrón (#28) — **no un endpoint por entidad**. Recibe `multipart`, sube a Cloudinary y
  devuelve `{ url }` con **201**. Verificado que no hay ni una mención a proyecto/lana/patrón en el código
  nuevo. Hasta hoy existía la pieza que sabe hablar con Cloudinary (#5) pero **no había puerta por la que
  entrara un archivo**: un teléfono sin línea.
- **Deuda 3 SALDADA:** `folder`/`publicId` salen **sólo** del `userId` del JWT; del formulario se lee **un
  único campo**, `file`. No se dio por buena leyendo: el reviewer intentó romperla haciendo que la carpeta
  saliera del formulario y la suite se puso en rojo.
- **Contrato cerrado antes de escribir código** (PRD **§11.9**, nueva): lista blanca `image/jpeg`/`png`/
  `webp` (lo no enumerado se rechaza), tope **4 MB**, **ambas comprobaciones antes** de llamar a Cloudinary
  (un archivo rechazado no consume red ni cuota, y hay test dedicado), y **`publicId` único por subida**.
- **⚠️ EL TOPE SE CERRÓ EN 5 MB Y ESTABA MAL — no mal implementado, mal DECIDIDO.** El reviewer contrastó el
  valor contra la plataforma: **Vercel limita el cuerpo de petición a 4,5 MB a nivel de infraestructura**, no
  configurable, y lo que lo excede muere con un **413** *antes de que el handler exista*. Había un test
  *"acepta un archivo justo en el límite"* **en verde certificando un caso que en producción falla siempre**.
  Se elevó al usuario —contradecía una decisión suya tomada con información incompleta— y **bajó a 4 MB**.
  **Ningún test podía encontrarlo: los tests miden el código contra el contrato, y aquí fallaba el contrato
  contra la plataforma.** Regla derivable: **al cerrar un valor numérico de un contrato, contrastarlo contra
  los límites de la plataforma antes de anclarlo en un test**; si no, el test consagra lo imposible.
- **Por qué el `publicId` es único** (decisión del leader, registrada y no implícita): las entidades guardan
  la **URL**, así que un `publicId` determinista haría que la segunda foto **sobrescribiera** la primera y
  rompiera **en silencio** las URLs ya persistidas en filas anteriores. Precio aceptado y fichado: las
  imágenes reemplazadas quedan huérfanas (**deuda 61**).
- **Lo que bloqueó, y es sutil:** el implementer hizo bien la mitad difícil (los tests de frontera **derivan**
  de la constante), pero **al derivarlo todo el valor del contrato se quedó sin ancla**. *"Acepta `MAX` y
  rechaza `MAX+1`"* sigue verde **sea cual sea `MAX`**: se podía decuplicar el tope y abrir la lista blanca a
  SVG y PDF con **27/27 en verde**. Es la familia de las deudas **18/22/23/33/40/43 en su forma espejo** —
  *el test mide lo que el código diga, sea lo que sea*. El patrón correcto tiene **dos piezas**: **(a)** *un*
  test que ancla la constante al literal (único sitio donde el literal se justifica, porque **ahí el literal
  ES el contrato**) y **(b)** el resto derivando. Sólo estaba (b).
- **Se avisó del riesgo de "arreglarlo" mal** (convertir (b) a literales = crear la deuda 18/22/23 de cero).
  El reviewer verificó por `diff` que los dos archivos de test anteriores quedaron **byte a byte idénticos**.
  No picó.
- **Lo mejor que salió, y no se pidió:** el implementer no sólo ancló el número — escribió un test que ata el
  tope a **estar por debajo del límite de la plataforma**, convirtiendo la deuda 55 de un párrafo del PRD en
  un **invariante ejecutable**. Cubre el riesgo que el ancla no cubre: no que alguien suba el tope, sino que
  **suba el tope y "arregle" el test que se le pone rojo** — que es literalmente cómo nació este defecto.
  El reviewer verificó que tampoco es decorativo, separándolo del ancla con una mutación propia.
- **`src/shared/lib/http.ts` tocado** (única modificación fuera del feature, y la de más riesgo: la usan
  todos los endpoints). El reviewer enumeró los **28 archivos** que lo importan y verificó que el cambio es
  **puramente aditivo**: `readFormData`, hermana de `readJsonBody`. Ninguna respuesta de ningún endpoint
  anterior cambia.
- **Método del review, que es lo que lo hizo valer:** **10 mutaciones deliberadas** (6 + 4), revertidas desde
  copia y verificadas con `diff -r`. No leyó el código: lo rompió y miró qué tests se enteraban. Las dos
  anclas nuevas se comprobaron **en las dos direcciones** (añadir un tipo **y quitar uno**: un `toContain`
  habría pasado la segunda; escribió igualdad exacta).
- **Verificación:** `bash ./init.sh` **547 passed | 11 skipped** (52 archivos + 2 skipped); partida 515,
  **+32 tests, ninguno borrado**. `pnpm build` OK con `/api/uploads/image` como ruta dinámica. **Verificado
  por el leader ejecutándolo**, y reproducido por el reviewer con sus propios números en las dos rondas, sin
  discrepancias entre los tres.
- **Deudas: nuevas 55-62.** La **55 nace tachada** (saldada en el acto al bajar a 4 MB). La más viva es la
  **59**: nadie ha subido todavía un archivo a una cuenta **real** de Cloudinary — hermana de la **deuda 6**,
  que se saldó así contra Neon y **destapó un bug de producción**.
- **Reports:** `impl_uploads_image.md`, `review_uploads_image.md` (las dos rondas, la primera conservada como
  registro de por qué se rechazó).
  **Informe de cierre:** `progress/informs/12.informe-uploads_image.md`.
- **Lección de método de la sesión:** el hallazgo más valioso **no lo encontró ningún test, y no podía**.
  Salió de que un reviewer fuera a contrastar un valor ya cerrado contra el entorno real de despliegue. Y se
  **elevó al usuario en vez de enterrarse como ficha de deuda**, porque contradecía una decisión suya — una
  ficha habría dejado el error vivo con apariencia de estar gestionado.

## 2026-08-06 — #16, #17, #18 y #33 DONE + deuda 59 (ENTRADA RETROACTIVA)

> ⚠️ **Esta entrada se escribió el 2026-08-07, al cerrar #19.** Faltaba: el cierre de sesión de `AGENTS.md`
> §5 tiene cuatro pasos y el de `history.md` es el que se salta, porque **nada lo verifica** (`init.sh`
> valida `feature_list.json`, no el historial). Lo levantó el reviewer de #19 como C5 en sus dos rondas.
> Fichado como deuda **115**. Se reconstruye desde `progress/current.md` y los informes 13-17.

- **Deuda 59 SALDADA** — primera subida real a Cloudinary por la cadena completa: **201**, y el `GET` de la
  URL devolvió la imagen. **La firma funcionó a la primera**, a diferencia de su hermana la deuda 6, que al
  medirse contra Neon destapó un bug de producción. Informe: `13.informe-deuda59-smoke_cloudinary.md`.
- **#16 `dashboard_comparison_3metrics` DONE.** `comparison` pasa a ser un **mapa** de las 3 métricas;
  `referenceMeters` **desaparece** — breaking a propósito, y se hizo entonces porque **no lo consumía nadie**.
  Informe: `14.informe-dashboard_comparison_3metrics.md`.
  **Lo más valioso no fue el código:** el test que protegía la conversión de unidades **pasaba en falso**
  (derivaba de la lista ya convertida, así que se movía *con* el bug). Lo destapó la **regla 3**.
- **#17 `projects_detail_yarns` DONE**, y con ella la **deuda 5 saldada**. Informe:
  `15.informe-projects_detail_yarns.md`. El implementer **no se conformó con el doble en memoria** y ancló
  el **SQL realmente emitido** por Drizzle. Precio fichado como deuda 77.
- **#18 `patterns_used_by` DONE — última slice de backend.** Informe: `16.informe-patterns_used_by.md`.
  **Midió por qué hace falta ese patrón, y el número da miedo:** al borrar el filtro **de producción**, la
  suite quedó en `2 failed | 600 passed`. Los 32 tests de ruta **siguieron verdes**, porque el doble
  implementa el filtro por su cuenta. → **REGLA 7** y deuda 81.
- **#33 `ui_primitives_2` DONE — slice NUEVA**, abierta ese día: la ficha de #19 asumía seis piezas del
  SDD §6 que **no existían**. Informe: `17.informe-ui_primitives_2.md`. **+154 tests.** Saldó además, sin
  que nadie se lo pidiera, el guardrail de no-hardcode: de **lista fija de 18 archivos** a **barrido por
  directorios** (medicina de las 40/43/71).

## 2026-08-07 — Lote de deudas 86/87/90/94 + Feature #19 `dashboard_ui` DONE

**Lote de deudas 86/87/90/94** (enablers de #19, **no es una feature**). Informe:
`18.informe-deudas_86_87_90_94.md`. El `Dialog` pasa a bloquear el scroll del fondo solo y a aceptar
`initialFocusRef`; el `Skeleton` anima con el shimmer del template, todo por token.
**Su único bloqueante fue un DATO INVENTADO en el libro mayor**: el informe afirmaba como medido que
happy-dom enfoca un `input` deshabilitado. Es falso. El código era correcto; **lo que estaba mal era la
justificación**.

**Feature #19 `dashboard_ui` DONE.** La primera página de contenido del proyecto. Cadena:
leader → **3 exploradores en paralelo** → implementer → reviewer (**CAMBIOS REQUERIDOS, 1 bloqueante**) →
ronda 2 → **APROBADO**. Informe de cierre: `progress/informs/19.informe-dashboard_ui.md`.

- **Verificación:** `bash ./init.sh` exit 0 — **1200 passed | 13 skipped** en **69 archivos** (partida:
  788/13 en 62). **+412 tests.** `pnpm build` OK. Verificado por los tres (leader al arrancar, implementer,
  reviewer ×3) sin discrepancias.
- **Ocho decisiones de scope cerradas ANTES de empezar**: las cinco de la enmienda **E1** y las tres de la
  **E2**, escrita en esta sesión (§7-ter del RFC-02). E2.1 la card de proyecto la crea #19 y #20 la reusa ·
  E2.2 el orden se apoya en `updatedAt` **pero la etiqueta deja de decir "último tejido"** · E2.3 el
  guardrail de no-hardcode se amplía a `src/`.
- **Medido contra servidor real** (regla 4), y reproducido por el reviewer: sin sesión `/` → 307 a
  `/login?next=%2F`; con sesión → 200, **un solo host de ovillo** (el hero, con captura de puntero) y el
  slot de fondo del caparazón **vacío**.
- **Deuda 1 SALDADA** (`/` deja de ser pública), y lo que la salda de verdad **no es la línea del proxy sino
  el gate positivo**: el reviewer midió que, devolviendo `/` a la lista, el test que *enumera* públicas
  **sigue verde**.
- **El guardrail de no-hardcode pasa de 55 a 216 archivos**, sin perder cobertura, sin allowlist y con su
  seguro anti-barrido-roto ampliado. Auditado con inyección de hardcode en un archivo nuevo y uno viejo.
- **Deudas: nuevas 104-115.** Una **nació saldada** (los cuatro pares de breakpoints).
- **Lección de método, la tercera de la misma familia en dos sesiones:** el único bloqueante **no fue un
  bug**, fue un comentario de producción que afirmaba que un test ya existía. No existía. Se resolvió por la
  vía que **convierte la afirmación en verdad** en vez de borrarla.
