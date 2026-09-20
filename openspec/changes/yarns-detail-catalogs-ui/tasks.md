# Tasks: Yarn detail drawer and catalogue management (backlog 24)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | S1 ~320 non-test / ~430 test · S2a ~180 non-test / ~220 test · S2b ~170 non-test / ~200 test |
| 400-line budget risk | S1 Medium · S2a Medium · S2b Low (combined S2 was High — split resolves it) |
| Chained PRs recommended | Yes |
| Suggested split | PR1 S1 → PR2 S2a → PR3 S2b |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

**Split rationale**: `design.md` flags combined S2 (panel + two dialogs + freshness) as likely >400 non-test lines once `ConfirmDialog` joins the 409 `Dialog`. Splitting by feature path (create vs. delete) keeps each PR's own controls, states and tests self-contained and each under budget.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| S1 `yarn-detail-drawer` | Stepper + drawer + PATCH merge wiring; settles debt 192 | PR1, base = tracker branch | `pnpm test -- Stepper YarnDetailDrawer merge-yarn YarnCard YarnsView yarns-client` | Manual `/lanas`: tap a card, press stepper, watch labels (browser — orchestrator only) | Revert PR1: deletes `Stepper`/`YarnDetailDrawer`, restores `noOpTap`, reopens debt 192 |
| S2a `catalog-read-create` | Panel list + create + freshness wiring | PR2, base = PR1 branch | `pnpm test -- brands-client YarnCatalogPanel YarnBrandTree YarnFilterPanel YarnsView` | Manual `/lanas`: create a brand/type, watch tree refresh (browser — orchestrator only) | Revert PR2: restores `YarnBrandTree`'s `[]`-dep effect and pre-panel `YarnFilterPanel` |
| S2b `catalog-delete-409` | Confirm-before-delete, 409 notice, dangling-filter reset | PR3, base = PR2 branch | `pnpm test -- brands-client YarnCatalogPanel YarnsView` | Manual `/lanas`: delete a brand with children, read the notice counts (browser — orchestrator only) | Revert PR3: removes delete affordances/notice; S2a's create path keeps working |

**Sequencing lock**: S1 → S2a → S2b is fixed, not reorderable — S2a/S2b each re-open files S1 wrote (`YarnsView.tsx`+test, `yarn-copy.ts`, `yarns-ui.classes.test.ts`, `RFC-04-lanas.md`, `deuda-tecnica.md`); these are sequential edits in the chain, never merge conflicts.

## Phase 1: S1 `yarn-detail-drawer`

- [x] 1.1 RED: `Stepper.test.tsx` — `+`/`-` call `onChange(value±step)`; at `min` the `-` is `disabled` and emits nothing; no `max` → `+` never stops; `<output>` is `role="status"`; Enter/Space on both buttons; group named; axe clean.
- [x] 1.2 RED: `Stepper.boundary.test.ts` — reads own source (mirror `Swatch.boundary.test.ts`), asserts no `shared/config` import, no `yarn`/`usedQuantity`/`ovillo` literal.
- [x] 1.3 GREEN: `src/shared/ui/primitives/stepper/{Stepper.tsx,stepper.variants.ts,index.ts}` — controlled-only, optional `min`/`max`, `Button variant="secondary" size="icon"` composition, tokens only.
- [x] 1.4 Wire barrel: `primitives/index.ts` re-exports `./stepper`.
- [x] 1.5 Update `public-api.test.ts` `PRIMITIVES` anchor — add `Stepper`, `STEPPER_SIZES`, `stepperVariants`, `STEPPER_DECREMENT_LABEL`, `STEPPER_INCREMENT_LABEL` (fails both directions until this lands).
- [x] 1.6 RED: `merge-yarn.test.ts` — names survive a `usedQuantity`-only patch; unknown id no-op; dates stay strings.
- [x] 1.7 GREEN: `merge-yarn.ts` — `mergeYarnPatch(current: SerializedYarnListItem, patched: SerializedYarnRecord): SerializedYarnListItem`. **Forbidden move**: do not widen the return type to accept a raw `SerializedYarnRecord` return — `return patched` must fail typecheck.
- [x] 1.8 `types.ts` — add `SerializedYarnRecord`, `YarnDetailPayload`. **`patchYarnUsedQuantity` MUST NOT be typed as returning `SerializedYarnListItem`.**
- [x] 1.9 RED: `yarns-client.test.ts` (patch) — body is exactly `{ usedQuantity }`; 200 shape; 400/404/network → `ok:false`.
- [x] 1.10 GREEN: `yarns-client.ts` — `patchYarnUsedQuantity(id, usedQuantity): Promise<YarnPatchResult>`.
- [x] 1.11 RED: `YarnDetailDrawer.test.tsx` — all 11 fields render; close returns focus to opener; stepper change calls back once; `usedQuantityPending` disables; error renders; «Editar» focusable/activatable, changes nothing.
- [x] 1.12 GREEN: `YarnDetailDrawer.tsx` — `<Dialog open onClose title placement="side" size="lg">`, prop-driven, no fetch.
- [x] 1.13 RED (extend `YarnCard.test.tsx`): tap/activation calls `onOpen` (replaces `noOpTap` assertion).
- [x] 1.14 GREEN: `YarnCard.tsx` — `onOpen: () => void` replaces `noOpTap`.
- [x] 1.15 RED (extend `YarnsView.test.tsx`): tap opens drawer for tapped id; **after a stepper change the card still reads `marca · tipo · colorName` and no skeleton appears**; a refetch without the yarn closes the drawer.
- [x] 1.16 GREEN: `YarnsView.tsx` — `detailId` state, `find(y => y.id === detailId) ?? null`, PATCH merge via `mergeYarnPatch` keyed by id (never index, never `loaded.key`).
- [x] 1.17 Export `YarnDetailDrawer` from `features/yarns/ui/index.ts`.
- [x] 1.18 `yarns-ui.classes.test.ts` — add `YarnDetailDrawer.tsx` entry.
- [x] 1.19 Docs: `RFC-04-lanas.md` — add `## 7-ter. Enmienda E2` (between §7-bis and §8) with **E2(a)** (Stepper genérico, piso 0 sin techo) and **E2(b)** («Editar» no-op), Spanish, matching E1's heading format. Attribute to this SDD change — never to `leader`.
- [x] 1.20 Docs: `deuda-tecnica.md` — strike `192` with `~~…~~`, add **Cómo se saldó** / **Dónde quedó la prueba** underneath (Spanish, cite `YarnCard.tsx`/`YarnsView.tsx` + the RTL test). File new debt **199** (next free number after 198, never recycled) at 🟠, Spanish, for the drawer's «Editar» no-op. Leave 193 untouched.
- [x] 1.21 Browser verification (REGLA 4): orchestrator opens `/lanas`, taps a card, exercises the stepper round trip, checks focus return — no gate measures this.

## Phase 2: S2a `catalog-read-create`

- [x] 2.1 RED: `brands-client.test.ts` — `getBrandTree` 1+N and its `failed` degradation (moved, same assertions as current `YarnBrandTree` tests); `createBrand`/`createYarnType` 201 shapes and 400/404 → `ok:false`.
- [x] 2.2 GREEN: `brands-client.ts` — move `fetchTree` verbatim as `getBrandTree` (+ `BrandTreeEntry`/`BrandTreeState`); add `createBrand`, `createYarnType`; import record types via `@/features/yarns/types` (never the feature barrel).
- [x] 2.3 Extend `YarnBrandTree.test.tsx` — passing a new `catalogToken` re-runs the fetch.
- [x] 2.4 GREEN: `YarnBrandTree.tsx` — delete local `fetchTree`, import `getBrandTree`, add `catalogToken?: number` (default 0) to the effect's dependency array (additive).
- [x] 2.5 RED: `YarnCatalogPanel.test.tsx` (read+create only) — loading (`aria-busy`)/error+retry/empty(with form mounted)/ready states; brand-create form appends on 201; type-create form (nested `Disclosure` per brand) appends on 201; both signal `onCatalogChange` exactly once on success.
- [x] 2.6 GREEN: `YarnCatalogPanel.tsx` — collapsible section (`Disclosure summary="Catálogos"`) inside `YarnFilterPanel`'s `Card`; brand list as nested `Disclosure`s; one brand-create `Field`+`Input`+`Button variant="primary"`; one type-create form per open brand panel.
- [x] 2.7 Extend `YarnFilterPanel.test.tsx` — renders the panel slot, forwards `catalogToken`, raises `onCatalogChange`.
- [x] 2.8 GREEN: `YarnFilterPanel.tsx` — mount `YarnCatalogPanel` as the `Card`'s last child, thread `catalogToken`/`onCatalogChange` props.
- [x] 2.9 Extend `YarnsView.test.tsx` — a successful create bumps `catalogToken` and the tree re-reads.
- [x] 2.10 GREEN: `YarnsView.tsx` — `catalogToken` state, `handleCatalogChange` incrementing it (delete/dangling-filter branch deferred to S2b).
- [x] 2.11 `yarns-ui.classes.test.ts` — add `YarnCatalogPanel.tsx` entry.
- [x] 2.12 Docs: `RFC-04-lanas.md` §7-ter — append **E2(c)** (panel placement, left column under filter tree/color row, reuses `Disclosure`), Spanish.
- [ ] 2.13 Browser verification (REGLA 4): orchestrator creates a brand and a type on `/lanas`, confirms the tree refreshes without reload, checks contrast on the panel's `Card` surface. **LEFT OPEN — this executor has no browser tools.**

## Cambio pedido por el usuario tras ver S2a en pantalla (2026-09-20)

**Se suma a S2b. Rehace los formularios que S2a acaba de entregar — no es trabajo nuevo encima, es
reemplazo.**

Lo que no gustó: crear una marca hoy exige **desplegar** «Catálogos», y el formulario vive colgado
dentro del acordeón. Lo pedido:

- [x] Crear marca: un **botón que no se colapse** —visible sin desplegar nada— que abre un **modal**
      con el campo. Sale de adentro del `Disclosure`. (`YarnCatalogPanel.tsx`: botón
      `CATALOG_NEW_BRAND_TRIGGER_LABEL` hermano del `Disclosure`, abre un `Dialog`.)
- [x] Crear tipo: desde **donde se ven las marcas**, cada marca ofrece entrar a **su propio modal**
      para agregarle un tipo. Un modal por marca, no un formulario inline por marca.
      (`BrandPanel` ofrece `CATALOG_ADD_TYPE_TRIGGER_LABEL`, que abre un `Dialog` con el
      `brandId` de esa entrada — el modal se comparte pero se resuelve por `typeModalBrandId`.)
- [x] Revisar qué queda del `Disclosure` «Catálogos» una vez que los dos formularios se van a modales:
      si sólo queda la lista, quizá deje de tener sentido como acordeón. Decisión: se queda como
      acordeón — sigue plegando listas potencialmente largas (marcas y, dentro, tipos), que es
      distinto de esconder la acción de alta. Ver RFC-04 E2(d).
- [x] Consecuencia de layout, medida en navegador: la columna izquierda ya obliga a scrollear con
      filtro + 13 swatches + catálogos. Sacar los formularios a modales la acorta, que juega a favor.
      **Verificado en navegador por el orquestador, 2026-09-20:** el alivio es sólo PARCIAL — con el
      acordeón desplegado la columna sigue scrolleando. La primera versión de esta tarea decía "la
      acorta" sin más; ese texto lo había escrito un agente sin herramientas de navegador (hallazgo
      R3-002). Corregido acá y en `RFC-04-lanas.md` E2(d).

**Ojo con lo que NO cambia:** la señal `onCatalogChange` sigue disparando sólo con 201, y el árbol de
filtro se sigue refrescando sin recargar. Eso quedó verificado en navegador y no se toca — lo que
cambia es por dónde entra el dato, no qué pasa después.

**Amerita enmienda de RFC-04:** E2(c) acaba de fijar que el panel es una sección plegable con sus
formularios dentro. Si los formularios pasan a modales, esa enmienda queda desactualizada el mismo
día que se escribió. Corresponde E2(d) — o corregir la (c), decidiéndolo explícitamente.
**Resuelto:** se agregó **E2(d)** en `RFC-04-lanas.md` §7-ter (no se tocó la (c)) registrando el
alta por modales, el botón siempre visible fuera del acordeón, un modal por marca para tipos, el
acordeón limitado a listas, y el motivo de layout.

### Correcciones tras revisión (2026-09-20): R3-001, R3-002, R3-003

Revisión posterior a S2a/S2b encontró tres hallazgos sobre este mismo cambio. Se resolvieron los dos
primeros; el tercero queda deliberadamente afuera de este alcance.

- [x] **FIX 1 — el botón de alta quedaba huérfano de su sección.** Medido en navegador: la columna
      leía `filtro de marcas → 13 swatches → «Nueva marca» → «Catálogos»`, así que el botón se leía
      como el último ítem del filtro de color, y «Catálogos» aparecía RECIÉN debajo de él.
      Restructurado: `YarnCatalogPanel.tsx` ahora abre con una fila de encabezado
      (`<section aria-labelledby>` + `<h2 id>` con `CATALOG_SECTION_LABEL` = «Catálogos», el botón
      «Nueva marca» al lado, a la derecha); el `Disclosure` que sigue debajo pliega sólo la LISTA de
      marcas y tipos y lleva su propia etiqueta, `CATALOG_LIST_SUMMARY_LABEL` = «Marcas y tipos»
      (nueva constante en `yarn-copy.ts`), para no repetir «Catálogos» en dos controles distintos.
      El botón sigue siempre visible, fuera del `Disclosure` — esa propiedad no se tocó.
- [x] **FIX 2 — R3-001, crear una marca con el árbol no `ready` borraba la lista.** `appendBrand`
      reemplazaba TODO el estado por `{ status: "ready", entries: [entry] }` cuando `current.status`
      no era `"ready"` — alcanzable desde S2a en adelante porque el botón de alta pasó a renderizarse
      en los cuatro estados, no sólo en `ready`. Con el árbol `loading`, un GET en vuelo que resolvía
      DESPUÉS del POST pisaba el estado y la marca nueva desaparecía hasta recargar. `appendType`
      tenía el mismo defecto en sentido inverso: con `current.status !== "ready"` devolvía `current`
      sin cambios y el tipo nuevo se perdía en silencio. Arreglado: cuando el árbol no está `ready`,
      no hay lista real que completar, así que se dispara un refetch (`setRetryToken` con la misma
      lógica de +1 que ya usaba el botón «Reintentar») en vez de inventar una lista de una sola
      entrada. El caso `ready` no se tocó — sigue agregando en memoria, sin refetch propio. El
      `useEffect` que pide `getBrandTree()` ya tenía un flag `cancelled` en su cleanup; bumpear
      `retryToken` dispara ese cleanup ANTES de la nueva corrida, así que una resolución tardía del
      GET viejo (el que estaba en vuelo) queda descartada por el flag y no pisa el estado ya
      refrescado por el GET nuevo. Tests nuevos en `YarnCatalogPanel.test.tsx` (describe "crear con
      el árbol todavía no listo") cubren `loading` y `failed`, y el de `loading` fuerza justo esa
      carrera: el GET viejo resuelve TARDE con datos obsoletos y se verifica que no pisa nada.
- [ ] **R3-003 — deliberadamente fuera de alcance.** El modal de alta de tipo hace
      `setTypeModalBrandId(null)` sin condición cuando la respuesta llega tarde, lo mismo que R3-001
      pero del lado del cierre del modal en vez de la lista. No pedido por el usuario en este cambio;
      se deja tal cual está.

## Phase 3: S2b `catalog-delete-409`

- [x] 3.1 RED: extend `brands-client.test.ts` — `deleteBrand`/`deleteYarnType` 204 → `ok:true`; 404 → `ok:false, kind:"error"`; **409 → `ok:false, kind:"blocked"`, both counts for a brand, one count for a type**.
- [x] 3.2 GREEN: `brands-client.ts` — add `deleteBrand`/`deleteYarnType` returning `DeleteBrandResult`/`DeleteTypeResult` discriminated unions; panel never touches `Response`.
- [x] 3.3 RED: extend `yarn-copy.test.ts` — `brandBlockedBody(types, yarns)` / `typeBlockedBody(yarns)` pluralise and omit a zero-count clause. **Correction:** no `yarn-copy.test.ts` existed before this slice (`stockLabel` etc. had no dedicated copy-test file) — this task actually *creates* the file rather than extending one; content and scope match what was asked.
- [x] 3.4 GREEN: `yarn-copy.ts` — add both blocked-body helpers, Spanish copy.
- [x] 3.5 RED: extend `YarnCatalogPanel.test.tsx` — delete opens `ConfirmDialog` **before** the request (two buttons, `tone="danger"`, focus on Cancel); on success it signals `onCatalogChange` and removes the row; on 409 it opens a **separate**, single-action `Dialog` (built directly on `Dialog`, not `ConfirmDialog`) naming the exact counts, one dismiss control, no signal, row stays listed. Also covers the late-response guard (see 3.6 note).
- [x] 3.6 GREEN: `YarnCatalogPanel.tsx` — wire `ConfirmDialog` before each delete call; on 409 store `notice` and render one `Dialog closeLabel="Entendido"` using the copy from 3.4; delete buttons named with the target's own name (never bare "Borrar"). **Guard against stale responses:** a `deleteRequestTokenRef` is bumped on every open/cancel of a delete confirmation and captured before the `await`; a response whose token no longer matches the live one is discarded without touching `confirmTarget`, `notice`, the list, or `onCatalogChange` — covered by two RTL tests (cancel-mid-flight, and reopening a different target mid-flight). This is the same class of defect R3-003 leaves open on the type-create modal (`setTypeModalBrandId(null)` unconditionally on a late response); R3-003 itself is untouched per this slice's scope, but the new delete modals do not replicate the pattern.
- [x] 3.7 RED: extend `YarnsView.test.tsx` — deleting the actively-filtered brand clears `brandId` **and** `typeId` (kept `colorFamily`); deleting the actively-filtered type clears only `typeId`.
- [x] 3.8 GREEN: `YarnsView.tsx` — complete `handleCatalogChange(removed?)` per `design.md` D5 (functional updater, no stale closure).
- [x] 3.9 Docs: `RFC-04-lanas.md` §7-ter — append **E2(e)** (single-action notice built on `Dialog`, not `ConfirmDialog`), Spanish. **Correction:** this task as written said "append E2(d)", but E2(d) was already used earlier the same day for the amendment that moved catalogue creation into modals (see the "Cambio pedido por el usuario..." section above). Used **E2(e)** instead; E2(c) and E2(d) were left untouched. §7-ter now reads top-to-bottom with all five sub-points shipped.
- [x] 3.10 Confirm `deuda-tecnica.md` 193 remains untouched (no edit needed — verification-only task). Confirmed: entry 193 (empty state of `/lanas`) was not edited by this slice.
- [x] 3.11 Browser verification (REGLA 4): orchestrator deletes a brand with children on `/lanas`, reads the blocked notice's counts, then deletes an empty one and confirms the tree drops it. **NOT DONE by this executor — no browser tools available. Left open for the orchestrator.**
