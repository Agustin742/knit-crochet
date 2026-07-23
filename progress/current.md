# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** _ninguna_ (última cerrada: #8 `yarns_catalogs` → done, con DELETE de marca/tipo incluido)
- **Última tarea:** ampliación de #8 (DELETE marca/tipo) → **cerrada y aprobada**
- **Inicio:** _—_
- **Agente:** _—_

## Plan

_Describe en 3-5 bullets qué vas a hacer antes de tocar código._

## Bitácora

- #1-#8 cerradas (incl. DELETE de marca/tipo) + tarea de arquitectura de la capa de schema
  (ver `history.md`). Quedan 3 features: #9, #10, #11.
- `bash ./init.sh` verde: lint, typecheck, **219 tests** en 23 archivos. `pnpm build` OK.
- Migración vigente: **`drizzle/0000_cold_ben_urich.sql`** (sin aplicar aún a Neon).
- Confirmado por el usuario: el cloud name de Cloudinary (`dd1zea1lo`) es correcto.
- Nota del entorno: **context7 no está disponible**; para research usar el código fuente
  instalado en `node_modules/` + doc oficial + verificación empírica.

## Reglas de arquitectura vigentes (leer antes de #9)

Están en `docs/harness/architecture.md` §"Capa de schema". Resumen operativo:

- **S1** — un `features/<x>/schema.ts` importa tablas de otra feature por su
  `schema.ts` directo, **nunca** por el `index.ts` (el barrel arrastra `./api` y crea
  un ciclo). `patterns/index.ts` hoy solo exporta `./schema`; al añadir `export * from "./api"`
  en #9, esta regla es lo único que evita el ciclo (igual que ocurrió sin problemas en #8).
- **S2** — la cascada de borrado la declara la FK (`onDelete`), no el servicio.
  **No escribas métodos de limpieza manual en los stores.** Si un borrado necesita
  lógica (advertencia, `?force=true`, recálculo de un cache), eso sí va en el servicio.

## Aprendizaje de proceso (#6 → #7 → #8, confirmado)

Identificar la costura **ANTES** de lanzar al implementer y **asignarla por escrito** en el
brief evita el bug de frontera que rechazó #6. Aplicado en #7 y #8 → ambas aprobadas a la
primera. **Repetir en #9.**

## Próximo paso — #9 `patterns_crud`

- CRUD `/api/patterns` con filtros `?type=&inLibrary=`; `instructions` y `metadata` como
  arrays ordenados `{ key, value }`; `inLibrary` distingue biblioteca vs embebido (un patrón
  de biblioteca enlaza a varios proyectos, 1→N). El completado de pasos **no** vive en el
  patrón (vive en `Project.completedSteps`).
- **Costura a decidir en el brief:** ¿qué pasa al borrar un patrón referenciado por proyectos?
  La FK `projects.patternId → patterns` es **`set null`** (S2), así que Postgres deja el
  proyecto con `patternId = null` en silencio — no da 500. Decidir si #9 debe avisar
  (contar proyectos afectados) o si el `set null` silencioso es aceptable. El reviewer de la
  tarea de arquitectura lo dejó como pregunta abierta.
- `Pattern.image` = URL string (como en projects/yarns), **sin** cablear upload de Cloudinary
  (consistente con lo hecho hasta ahora).

## Deuda técnica acumulada

1. ~~**Boilerplate de sesión** (#4)~~ → saldada en #6.
2. **Orden de firma de Cloudinary** (#5): `upload.ts:59` usa `localeCompare` (sensible a
   locale/ICU). Migrar a comparador binario si se añaden más params firmables.
3. **Sanitización al cablear Cloudinary** (#5): `folder`/`publicId` desde constantes o
   del `userId` del JWT, validados con zod, **nunca del body crudo**. Aplica cuando se
   cablee el upload de verdad (no se ha cableado en #6/#7/#8; `image` es URL string).
4. **`tsconfig.tsbuildinfo` trackeado en git** (pre-existente): añadir a `.gitignore`.
5. **`GET /api/projects/:id` no devuelve las lanas enlazadas** (#6): decidir al cablear la UI.
6. **La app nunca ha hablado con una DB real**: todo se valida contra el doble en memoria
   y la migración sigue sin aplicarse a Neon. Las cascadas `ON DELETE` de S2 y la detección
   de duplicado `(brandId, colorCode)` → 409 (#8) solo están probadas contra dobles que las
   *imitan*. Confirmar en el primer smoke real contra Neon.
7. **Borrado de sesión individual** (futuro): si #10/#11 lo añaden, deberá recalcular
   `Project.time` en la misma operación.
