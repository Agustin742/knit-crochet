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
