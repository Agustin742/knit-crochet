# Backlog de la fase de UI

> **Qué es esto.** El trabajo de interfaz que queda por hacer, con sus criterios
> de aceptación. Sustituye a `feature_list.json`, que era el registro de estado
> del arnés anterior y desapareció al migrar el repositorio a SDD.
>
> **Qué NO es.** No es un registro de estado. El estado de un trabajo en curso
> vive en `openspec/changes/<cambio>/` (proposal, spec, design, tasks). Este
> documento es la cola de entrada: de acá sale el tema de cada `/sdd-new`.

## Cómo se usa

1. Elegí una entrada de la tabla.
2. Abrí un cambio SDD con ese nombre: `/sdd-new <slug>`.
3. La fase de propuesta lee el RFC citado en la columna **RFC** y esta ficha.
4. Al archivar el cambio, tachá la entrada acá con `~~…~~` y dejá el enlace al
   cambio archivado. No la borres: la ficha explica qué se pedía.

## Jerarquía de verdad

El orden no cambió con la migración:

| Fuente | Qué decide |
|---|---|
| `docs/product/PRD-01-estructura-funcional.md` | Alcance funcional: datos, BFF, lógica |
| `docs/design/rfc/RFC-00-proceso.md` | Proceso de la fase de UI e índice de RFC |
| `docs/design/rfc/RFC-01…07-*.md` | Wiring de cada página: rutas, datos, decisiones |
| `docs/design/SDD-01-design-system.md` | Contrato del design system y su §9 de verificación |
| `docs/harness/architecture.md` · `conventions.md` · `verification.md` | Cómo construir y cómo demostrarlo |

> **Nota de nombres.** El `SDD-01` del design system significa *Software Design
> Document*. No tiene relación con SDD (*Spec-Driven Development*), el proceso
> de planificación que ahora gobierna el repositorio. Coinciden las siglas y
> nada más.

## Verificación común a todas las entradas

Cada entrada dice «verificación SDD-01 §9». Eso significa, como mínimo:

- tests de React Testing Library sobre el comportamiento descrito,
- auditoría de accesibilidad con `axe`,
- smoke manual del flujo en el navegador,
- `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` en verde.

El detalle está en `docs/harness/verification.md` y en `SDD-01 §9`.

---

## Entradas pendientes

| # | Slug | Título | RFC |
|---|---|---|---|
| 22 | `projects-form-ui` | Proyectos: crear/editar en modal | RFC-03 |
| 23 | `yarns-list-ui` | Lanas: lista + filtro jerárquico | RFC-04 |
| 24 | `yarns-detail-catalogs-ui` | Lanas: detalle + gestión de catálogos | RFC-04 |
| 25 | `yarns-form-ui` | Lanas: crear/editar en modal con tabs | RFC-04 |
| 26 | `patterns-list-ui` | Patrones: lista + filtros | RFC-05 |
| 27 | `patterns-detail-ui` | Patrones: detalle en drawer | RFC-05 |
| 28 | `patterns-form-ui` | Patrones: crear/editar en modal | RFC-05 |
| 29 | `calculators-ui` | Página Calculadoras | RFC-06 |
| 30 | `stash-ui` | Página Stash (hub) | RFC-07 |

---

### 22 · `projects-form-ui` — Proyectos: crear/editar en modal (form + foto + patrón)

**RFC-03.** Estaba a medias cuando se migró el arnés: el commit `996fbe4`
(«completar #22 y unificar el alta con el cronómetro visible») cerró el alta,
pero la ficha nunca se marcó cerrada. **Revisar qué falta antes de abrir el
cambio SDD** — puede que solo reste la edición.

Modal de crear/editar proyecto, separado del de ver: form con nombre, foto,
tipo, `targetRounds`, `needles` y patrón elegible de biblioteca o embebido. Los
dos botones de creación rápida preseleccionan el `type`.

- Modal con form (`Field`/`Input`) para nombre, tipo, `targetRounds`, `needles`
  y notas; foto vía `POST /api/uploads/image`.
- Patrón: elegir de biblioteca **o** crear embebido; las dos opciones existen.
- Crear preselecciona el `type` según el botón de origen; borrado con
  confirmación (dialog).
- Verificación SDD-01 §9: RTL (crear con type, editar, subir foto, elegir y
  embeber patrón) + axe + smoke + build.

### 23 · `yarns-list-ui` — Lanas: lista + filtro jerárquico (árbol marca→tipo + swatches)

**RFC-04.** Sidebar/acordeón con árbol marca→tipo más una fila de swatches de
familia de color; grilla de cards (ícono coloreado con el color de la lana +
marca·tipo·`colorName` + stock). El tap abre el drawer.

- Página en `src/app/(app)/lanas/`; UI en `src/features/yarns/ui/`.
- Filtro = árbol marca→tipo navegable por teclado + swatches de `colorFamily`
  (con `aria-label` del color); consume `GET /api/yarns` con
  `?brandId=&typeId=&colorFamily=`.
- Card = ícono con el color de la lana + marca·tipo·`colorName` + stock
  (`quantity`); el tap abre el drawer de la entrada 24.
- Estados: vacío («Sin lanas en el stash todavía»), error y loading (skeleton).
- Verificación SDD-01 §9: RTL (filtro árbol, swatches) + axe + smoke + build.

### 24 · `yarns-detail-catalogs-ui` — Lanas: detalle (drawer + stepper `usedQuantity`) + catálogos

**RFC-04.** Drawer de detalle con los datos de la lana y el stepper `+`/`−` de
`usedQuantity` —que es consumo, y por eso **no** va en el form de crear— más el
panel de gestión de catálogos (crear y borrar marca y tipo) en la misma página.

- Drawer con datos + stepper `usedQuantity` (con label) + «Editar» que abre el
  modal de la entrada 25.
- Panel de catálogos: crear y borrar marca y tipo. Borrar una marca o un tipo
  con hijos devuelve **409 bloqueante** (sin `force`) y se muestra en un dialog
  de aviso.
- Consume `DELETE /api/brands/:id` y `/:id/types/:typeId`; `PATCH` de
  `usedQuantity` sobre la lana.
- Verificación SDD-01 §9: RTL (stepper, 409 bloqueante) + axe + smoke + build.

### 25 · `yarns-form-ui` — Lanas: crear/editar en modal con tabs

**RFC-04.** Son muchos campos, así que el modal va en tabs. **Identidad**: marca
(elegir o crear), tipo dependiente de la marca (elegir o crear), `colorName`,
`colorCode`, `colorFamily` por swatches y foto. **Ficha técnica**: `length`,
`fiber`, `recommendedNeedle {min,max}`, `thickness`, `lot` y `quantity`.

- Foto vía `POST /api/uploads/image`.
- Marca y tipo se pueden crear o elegir inline; el tipo depende de la marca.
  `usedQuantity` **no** está en este form.
- `colorCode` es único por marca: el 409 se muestra en el campo
  (`Field.has-error`), no como error global.
- Verificación SDD-01 §9: RTL (crear/elegir marca-tipo inline, 409 de
  `colorCode`) + axe + smoke + build.

### 26 · `patterns-list-ui` — Patrones: lista + filtros

**RFC-05.** Toolbar con toggle Biblioteca/Embebidos (`inLibrary`), botones de
tipo y buscador; grilla de cards con solo foto y nombre. El tap abre el drawer.

- Página en `src/app/(app)/patrones/`; UI en `src/features/patterns/ui/`.
- Toolbar: toggle Biblioteca/Embebidos (`aria-pressed`) + tipo + buscar;
  consume `GET /api/patterns` con `?type=&inLibrary=`.
- Card = foto + nombre, nada más; el tap abre el drawer de la entrada 27.
- Estados: vacío («Todavía no hay patrones»), error y loading (skeleton).
- Verificación SDD-01 §9: RTL (toggle, filtros) + axe + smoke + build.

### 27 · `patterns-detail-ui` — Patrones: detalle en drawer

**RFC-05.** Drawer con nombre, foto, tipo e `inLibrary`; instrucciones (lista
ordenada clave-valor, solo lectura) y metadata; sección «usado en» con los
proyectos que lo usan; acciones Editar y Publicar a biblioteca.

- Instrucciones y metadata en solo lectura; «usado en» consume la query de
  proyectos por patrón.
- Publicar a biblioteca = `PATCH /api/patterns/:id { inLibrary: true }`.
- Borrado con confirmación **y** aviso de que los proyectos que lo usan quedan
  sin patrón enlazado (la FK hace `set null`).
- Verificación SDD-01 §9: RTL (usado-en, publicar) + axe + smoke + build.

### 28 · `patterns-form-ui` — Patrones: crear/editar en modal

**RFC-05.** Form + foto + tipo + editor de instrucciones (filas ordenadas
clave-valor) + editor de metadata (tabla clave-valor libre).

- Foto vía `POST /api/uploads/image`.
- Editor de instrucciones: filas clave-valor con agregar, borrar y reordenar
  **por drag y por teclado**. Tiene que ser operable sin ratón.
- Editor de metadata como tabla clave-valor libre.
- Verificación SDD-01 §9: RTL (editor por drag y por teclado, metadata) + axe +
  smoke + build.

### 29 · `calculators-ui` — Página Calculadoras (sin backend)

**RFC-06.** Las dos herramientas en tabs (Aumentos · Regla de 3), reusando la
lógica pura que ya existe. No toca la base de datos.

- Página en `src/app/(app)/calculadoras/`; UI en
  `src/features/calculators/ui/`, reusando `calculateIncreases` y
  `calculateRuleOfThree`. Sin backend.
- Aumentos: inputs P y A → card con `focusframe` (instrucción legible +
  desglose base/remainder). Regla de 3: inputs → `skeinsB` + historial efímero
  de la sesión.
- Validación: input inválido → `Field.has-error` con el mensaje del error
  nombrado; el resultado va en `aria-live`; `inputmode="numeric"`.
- Verificación SDD-01 §9: RTL (caso P=40/A=6, validaciones, regla de 3 con
  redondeo, historial efímero) + axe + smoke + build.

### 30 · `stash-ui` — Página Stash (hub de navegación)

**RFC-07.** Página-hub con grilla de cards grandes (2-3 por fila): secciones que
navegan a su página y accesos directos de creación que abren el modal
correspondiente.

> ⚠️ **Bloqueada.** La lista exacta de cards está pendiente de confirmar con el
> usuario (RFC-07 §9). No abrir el cambio SDD hasta cerrar esa lista.

- Página en `src/app/(app)/stash/`; grilla de cards grandes (2-3 por fila,
  responsive) con ícono + título + badge de tipo.
- Las secciones navegan a su página; los accesos de creación abren el modal
  correspondiente, reusando el de cada página.
- Cards como enlaces o botones con `aria-label` claro; targets ≥ 44px;
  navegable por teclado.
- Verificación SDD-01 §9: RTL (navegar, abrir el modal correcto) + axe + smoke +
  build.
