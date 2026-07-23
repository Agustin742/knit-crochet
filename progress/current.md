# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** _ninguna_ (última cerrada: #7 `time_tracking` → done)
- **Última tarea:** arquitectura de la capa de schema (S1 + S2) → **cerrada y verificada**
- **Inicio:** _—_
- **Agente:** _—_

## Plan

_Describe en 3-5 bullets qué vas a hacer antes de tocar código._

## Bitácora

- #1-#7 cerradas + tarea de arquitectura de la capa de schema (ver `history.md`).
  Quedan 4 features: #8, #9, #10, #11.
- `bash ./init.sh` verde: lint, typecheck, **169 tests** en 20 archivos. `pnpm build` OK.
- Migración vigente: **`drizzle/0000_cold_ben_urich.sql`** (regenerada; la anterior
  `0000_cold_marrow.sql` ya no existe).
- Confirmado por el usuario: el cloud name de Cloudinary (`dd1zea1lo`) es correcto.
- Nota del entorno: **context7 no está disponible**; para research usar el código fuente
  instalado en `node_modules/` + doc oficial + verificación empírica.

## Reglas de arquitectura vigentes (leer antes de #8)

Están en `docs/harness/architecture.md` §"Capa de schema". Resumen operativo:

- **S1** — un `features/<x>/schema.ts` importa tablas de otra feature por su
  `schema.ts` directo, **nunca** por el `index.ts` (el barrel arrastra `./api` y crea
  un ciclo). Al añadir `export * from "./api"` a `yarns/index.ts` en #8, esta regla es
  lo único que evita el ciclo.
- **S2** — la cascada de borrado la declara la FK (`onDelete`), no el servicio.
  **No escribas métodos de limpieza manual en los stores.** Si un borrado necesita
  lógica (advertencia, `?force=true`, recálculo de un cache), eso sí va en el servicio.

## Aprendizaje de proceso (#6 → #7, funcionó)

En #6 el bloqueante apareció **en la costura** entre sub-tareas: lo anotaron los dos
implementers y ninguno lo corrigió. En #7 la frontera equivalente se **nombró en el
brief y se asignó a la feature** → resuelta de entrada y aprobada a la primera.
**Repetir: identificar la costura ANTES de lanzar al implementer y asignarla por escrito.**

## Próximo paso — #8 `yarns_catalogs`

- Catálogos jerárquicos Brand→YarnType + CRUD Yarn con filtros + borrado seguro.
- **Frontera ya identificada y decidida** (asignarla en el brief):
  - `DELETE` de lana referenciada por un proyecto → **409 + advertencia**, y con
    `?force=true` se borra (está en el acceptance, viene del PRD §4.5). La FK
    `project_yarns → yarns` es `no action` **a propósito** para que este 409 exista.
  - `DELETE` de marca o tipo con hijos → **409 (bloquear)**. Decisión de producto
    tomada por el usuario el 2026-07-22. Las FKs `yarn_types→brands`, `yarns→brands`
    y `yarns→yarn_types` son `no action` a propósito, pero **la lógica del 409 no
    existe todavía: la escribe #8**. Sin ella, esos borrados darán 500.
- `Yarn.image` es la primera entidad con imagen que se cablea → aplica la deuda 3
  (sanitización de `folder`/`publicId` de Cloudinary).

## Deuda técnica acumulada

1. ~~**Boilerplate de sesión** (#4)~~ → saldada en #6.
2. **Orden de firma de Cloudinary** (#5): `upload.ts:59` usa `localeCompare` (sensible a
   locale/ICU). Migrar a comparador binario si #8/#9 añaden más params firmables.
3. **Sanitización al cablear Cloudinary** (#5): `folder`/`publicId` desde constantes o
   del `userId` del JWT, validados con zod, **nunca del body crudo**. **Aplica ya en #8.**
4. **`tsconfig.tsbuildinfo` trackeado en git** (pre-existente): añadir a `.gitignore`.
5. **`GET /api/projects/:id` no devuelve las lanas enlazadas** (#6): decidir al cablear la UI.
6. **La app nunca ha hablado con una DB real**: todo se valida contra el doble en memoria
   y la migración sigue sin aplicarse a Neon. Las queries Drizzle están verificadas por
   tipos, no por ejecución. **Ahora hay un motivo extra para hacer el smoke pronto:** las
   cascadas `ON DELETE` de S2 solo están probadas contra un doble que las *imita*.
   Confirmar también que `coalesce(sum(...), 0)` (numeric → string por el driver) se
   maneja bien; `sumDuration` ya hace `Number(...)` explícito.
7. **Borrado de sesión individual** (futuro): si #10/#11 lo añaden, deberá recalcular
   `Project.time` en la misma operación.
