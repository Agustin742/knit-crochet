# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** _ninguna_ (última cerrada: #6 `projects_crud` → done)
- **Inicio:** _—_
- **Agente:** _—_

## Plan

_Describe en 3-5 bullets qué vas a hacer antes de tocar código._

## Bitácora

- #1-#6 cerradas (ver `history.md`). Infraestructura + el feature más grande del PRD.
- `bash ./init.sh` verde: lint, typecheck, **134 tests** en 17 archivos. `pnpm build` OK.
- Confirmado por el usuario: el cloud name de Cloudinary (`dd1zea1lo`) es correcto.
- Nota del entorno: **context7 no está disponible**; para research usar el código fuente
  instalado en `node_modules/` + doc oficial + verificación empírica.

## Aprendizaje del ciclo #6 (aplicar en features divididas)

Al partir una feature en sub-tareas, los defectos aparecen **en la costura**: el bug
bloqueante (`DELETE` de proyecto con lanas enlazadas → 500 por la FK) lo anotaron los
DOS implementers en sus informes y ninguno lo corrigió, porque cada uno lo dio por
ajeno a su mitad. Al dividir, hay que **asignar explícitamente la frontera a una de
las sub-tareas** o revisarla aparte. #7 vuelve a tocar `Project` (campo `time`), así
que ojo con la interacción con lo ya cerrado en #6.

## Próximo paso

- Siguiente en cola: **#7 `time_tracking`** (`CraftSession` start/stop + `Project.time`
  como suma cacheada + historial). Tamaño medio, 3 endpoints → 1 implementer + 1 reviewer.
  Depende de: `CraftSession` (schema de #3), `Project.time` y el patrón de servicios /
  `withSession` / store en memoria establecido en #6 (imitar, no reinventar).

## Deuda técnica acumulada

1. ~~**Boilerplate de sesión** (de #4)~~ → **saldada** en la sub-tarea A de #6
   (`withSession(route, handler)` en `shared/lib/http.ts`).
2. **Orden de firma de Cloudinary** (de #5): `upload.ts:59` usa `localeCompare`
   (sensible a locale/ICU). Correcto con las claves actuales; migrar a comparador
   binario si #8/#9 añaden más params firmables.
3. **Sanitización al cablear Cloudinary** (de #5): `folder`/`publicId` deben venir de
   constantes o del `userId` del JWT, validados con zod, **nunca del body crudo**.
4. **`tsconfig.tsbuildinfo` está trackeado en git** (pre-existente): es artefacto de
   build, añadir a `.gitignore` y dejar de versionarlo.
5. **`readProjectId` duplicado** (de #6, no bloqueante): existe en
   `src/app/api/projects/[id]/route.ts` y en las rutas hijas; unificar cuando se toque.
6. **`GET /api/projects/:id` no devuelve las lanas enlazadas** (de #6): quedó fuera del
   acceptance de #6; decidir si entra al cablear la UI.
