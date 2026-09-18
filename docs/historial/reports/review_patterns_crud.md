# Review — feature #9 `patterns_crud`

**Veredicto:** APPROVED

Revisión hecha verificando yo mismo (no copiando el informe del implementer).
`bash ./init.sh` exit 0; `pnpm build` OK con las 2 rutas nuevas registradas.

## Checkpoints
- C1: [x] Archivos base del arnés presentes; los 3 docs de `docs/harness/` existen; `bash ./init.sh` termina exit 0 ([OK] Entorno listo).
- C2: [x] Solo la feature #9 en `in_progress` (el implementer NO la marcó `done`); features `done` con tests verdes; `progress/current.md` describe la sesión activa de #9.
- C3: [x] Capas respetadas (ver detalle abajo); feature-first; sin deps nuevas (`package.json`/`pnpm-lock.yaml` sin cambios); sin `console.log`/TODO en `patterns/**` ni `app/api/patterns/**`; sin secretos hardcodeados.
- C4: [x] Cada módulo con lógica tiene test; lint + typecheck verdes; 242/242 tests verdes (25 archivos).
- C5: [x] Sin artefactos sospechosos sin trackear; feature reflejada en su estado correcto (`in_progress`, pendiente de cierre por el leader tras esta aprobación).

## Verificación ejecutable (yo mismo, con pnpm)
- `bash ./init.sh`: lint [OK], typecheck [OK], **Test Files 25 passed (25) / Tests 242 passed (242)** [OK]. Coincide con lo declarado (219→242, +23; 0 rotos).
- `pnpm build`: `✓ Compiled successfully`; rutas registradas: `ƒ /api/patterns` y `ƒ /api/patterns/[id]`.

## Capas (architecture.md)
- Route handlers finos: `route.ts` y `[id]/route.ts` solo parsean, validan con zod (`patternFiltersSchema`/`createPatternSchema`/`updatePatternSchema`), delegan en el servicio y serializan. Sin Drizzle ni lógica de negocio.
- Lógica en `features/patterns/api/` (create/list/get/update/delete). Drizzle SOLO en `api/store.ts`.
- Zod por endpoint: body (create/update), query (`patternFiltersSchema`), params (`patternIdSchema`). Query vacía = sin filtro (`readQuery` filtra strings vacías; test `?type=&inLibrary=` → `lastFilters {}`).
- Scoping por `userId` en TODA query del store (`list`/`findById`/`update`/`remove` aplican `eq(patterns.userId, userId)`). Recurso ajeno/inexistente → 404 (nunca 403).
- S1 respetado: `patterns/schema.ts` importa `@/features/auth/schema` directo + `@/shared/db/enums`, nunca el barrel. Añadir `./api` a `patterns/index.ts` no introdujo ciclo (build + typecheck + tests verdes).

## Costura del borrado (`set null`) — auditada explícitamente
- `DELETE /api/patterns/:id`: 404 si ajeno/inexistente; si existe → **204** (test de ruta l.266-277 y de servicio).
- **Sin limpieza manual:** `delete-pattern.ts` solo hace `findById` + `remove`; `store.remove` (producción) ejecuta un único `delete` sobre `patterns` y NO toca `projects`. El `set null` lo hace la FK `projects.pattern_id → patterns` (S2).
- **Fidelidad del doble:** `createInMemoryPatternStore(projects)` comparte el `InMemoryProjectStore` real; `remove` recorre `projects.rows` y hace `project.patternId = null` **in-place** (no reasigna el array). `store.projects.create` empuja al mismo `rows`, así que el test observa el estado compartido real.
- **Test honesto, no tautológico:** crea proyecto con `patternId = X`, borra X, y comprueba que el proyecto **sigue existiendo** (`surviving` defined) con `patternId === null`. Existe a nivel servicio (`pattern-service.test.ts` l.156-175) y a nivel ruta (`patterns-routes.test.ts` l.281-299, además verificando 204).
- Confirmado: **NO** hay 409, **NO** hay `?force`, **NO** hay aviso de N proyectos afectados. Correcto según PRD §11 / FK `set null`.

## Resto del acceptance
- Filtros `?type=` (CraftType) y `?inLibrary=` (booleanFlag `"true"/"false"` → bool) con query vacía = sin filtro. Tests de ambos filtros a nivel servicio y ruta; filtro inválido → 400 (`?type=sewing`, `?inLibrary=maybe`).
- `instructions`/`metadata` validados como arrays ordenados de `{key,value}` (`keyValueSchema`: key trim min 1 / max 200, value max 5000; instructions max 1000, metadata max 200). El orden del array se preserva.
- `inLibrary` default `false` (embebido) tanto en el schema como en el doble; test distingue biblioteca (`true`) vs embebido (`false`) por separado.
- Sin "completado de pasos" en el patrón: no existe campo de steps; sigue en `Project.completedSteps`.
- `image` = URL string (`z.url().nullable().optional()`), Cloudinary NO cableado (PRD §11.7).

## Fuera de scope (respetado)
- `patterns/schema.ts` sin tocar (no aparece en el diff); sin migración nueva para #9.
- Footprint de #9 confinado: `patterns/index.ts` (M) + `patterns/api/**`, `patterns/types.ts`, `patterns/validation.ts` (nuevos) + `app/api/patterns/**` (nuevo) + `progress/`. No se tocaron projects/yarns/time-tracking por #9.

## Riesgo no bloqueante (deuda #6, ya conocida)
- El `set null` real solo está probado contra el doble que lo imita; la app aún no ha hablado con Neon. Confirmar en el primer smoke contra DB real. El store de producción delega correctamente en la FK (no simula nada), que es lo correcto por S2.

## Cambios requeridos
Ninguno.
