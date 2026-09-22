# Proposal: Yarn detail drawer and catalogue management (backlog 24)

## Intent

`/lanas` lists yarns but nothing opens: `YarnCard`'s tap is a documented no-op
(`YarnCard.tsx:22-24,37-39`, debt 192). The eleven detail fields the list already carries are
unreachable, and `usedQuantity` — consumption, the input to future metrics, deliberately absent
from the create form — cannot be recorded anywhere in the product. Brands and types can only be
created or deleted by calling the API by hand. Success: a user taps a card, reads the whole yarn,
adjusts consumption with a `+`/`−` stepper, and creates or deletes brands and types without
leaving `/lanas`, with a blocked deletion explained instead of silently failing.

## Scope classification

UI/design-system scope — **RFC-04**, backlog entry **24** (RFC-04 §1 drawer/stepper/catalogues,
§2 components, §3 the two 409s, §5 a11y, §7 wiring). Two functional constraints are read, not
changed, from **PRD-01 §4.5** (`usedQuantity` is independent of `quantity` — the stepper has a
floor of 0 and **no ceiling**) and **§4.4** (brand→type is the catalogue hierarchy).

**This change needs zero backend work.** Every endpoint exists and is already tested: `PATCH
/api/yarns/:id` accepts `{ usedQuantity }` alone (`api/yarns/[id]/route.ts:40-60`,
`validation.ts:43-45`), and both catalogue `DELETE`s already return the blocking 409 with counts.
No schema, no migration, no auth, no route handler, no Zod schema is touched.

## Must survive unchanged

| Invariant | Evidence |
|---|---|
| No new/changed endpoint, DB schema, migration, JWT or cookie behaviour | scope note above |
| `PATCH /api/yarns/:id` → `200 { yarn: YarnRecord }` (**raw row**, no `brandName`/`typeName`), 400/404/409 unchanged | `api/yarns/[id]/route.ts:40-60` |
| Brand 409 body stays `{ error, types, yarns }`; type 409 stays `{ error, yarns }`; both **blocking, no `force`** | `errors.ts:67-94`, `params.ts:58-68` |
| `GET /api/yarns` filters, `userId` scoping, `{ yarns }` wrapper, `YarnListItem` shape | entry 23 |
| Entry 23's filter behaviour: brand→type radio exclusivity, colour row, AND composition, keyboard nav, `YarnFilters`/`scopeOf`/`parseScope` | `YarnFilterPanel.tsx:13-31`, spec `yarn-inventory-browsing` |
| `src/shared/ui/` knows no application: the new `Stepper` names no yarn and imports nothing from `src/shared/config/` (SDD-01 §1/§2/§3, debt 168) | debt 168, `Swatch.boundary.test.ts` |
| Thin Route Handlers, Zod at the edge, UI never imports Drizzle | `docs/harness/architecture.md` |

## Decisions

- **D1 — two slices.** S1 `yarn-detail-drawer` (stepper + drawer + wiring, settles debt 192) then
  S2 `catalog-management` (brand/type CRUD + the 409 notice). They share RFC-04, the page and the
  `Dialog` primitive — no data, no state, no component. Combined they are ~400-600 non-test lines,
  over budget before the SDD-01 §9 test bar. `delivery_strategy: auto-chain`.
- **D2 — the 409 notice is built on `Dialog` directly, not `ConfirmDialog`.** A blocking 409 has no
  `force` and nothing to confirm; `ConfirmDialog` always renders two buttons, defaults to
  `tone="danger"` and focuses Cancel (`ConfirmDialog.tsx:20-37,63-102`), which would invent a
  meaningless second option. One dismiss button, the child counts in the body.
- **D3 — the stepper is a new primitive in `src/shared/ui/primitives/stepper/`.** A numeric `+`/`−`
  control carries no application domain, so it sits on the portable side of the line debt 168 drew
  — the same reasoning that placed `Swatch` and `Disclosure` there. It gets a boundary test that
  reads its own source and asserts no `shared/config` import, exactly like
  `Swatch.boundary.test.ts` and `Disclosure.boundary.test.ts`.
- **D4 — the catalogue panel is a collapsible section in the LEFT column**, under the filter tree
  and the colour row, inside `YarnFilterPanel`'s existing `Card`. It **reuses the `Disclosure`
  primitive** from entry 23 rather than inventing a second collapsible, and it inherits that `Card`
  surface — so the contrast trap that produced debt 196 (`YarnFilterPanel.tsx:44-47`) is already
  handled. Chosen over a full-width region below the grid and over a separate modal.
- **D5 — catalogue freshness: one token threaded down, one request shape shared.** This is D4's
  direct consequence and is decided here, not deferred. `YarnBrandTree` fetches brands and their
  types into private `useState` with a `[]`-dep effect and no exposed refetch
  (`YarnBrandTree.tsx:43-99`); with the panel now one centimetre below it, deleting a brand and
  watching it stay listed above is a visible defect.

  **Chosen**: `YarnsView` owns a `catalogToken` counter and threads it through `YarnFilterPanel`
  into `YarnBrandTree`, which adds it to its effect's dependency array; the panel raises
  `onCatalogChange` after every successful create and delete. `fetchTree`
  (`YarnBrandTree.tsx:43-73`) is already a standalone module function, so it is extracted to a
  `brands-client.ts` beside the existing `yarns-client.ts` and both consumers call it. Second
  invariant: if a delete removes the id the active filter points at, `YarnsView` also drops it
  from `filters`, so no dangling scope survives.

  *Why*: `YarnsView` already owns exactly this idiom — `reloadToken` + `requestKeyOf`
  (`YarnsView.tsx:28-30,48,75`) — for the same problem on the yarn list, so this is the file's own
  precedent rather than a new mechanism. Rejected: **lifting the whole catalogue fetch into
  `YarnsView`** (one fetch instead of two, but it rewrites a component and two test files entry 23
  just verified, and pushes catalogue-shaped data through `YarnFilterPanel`, which exists only to
  translate filters); **exposing a refetch from the tree** (needs `useImperativeHandle` or a
  register callback — least idiomatic, hardest to test); **keying the tree to remount it** (nearly
  free, but a remount collapses every `Disclosure` the user opened). Accepted cost: the panel keeps
  its own state, so the 1+N request runs twice; the shared `brands-client.ts` keeps the *shape*
  single even though the *state* is not.
- **D6 — the drawer's «Editar» button is a documented no-op**, following E1(c) and debt 192: a
  real, keyboard-reachable control, not a decorated `div`, filed as new debt and closed by entry 25.

## Scope

### In scope — S1 `yarn-detail-drawer`

1. **`Stepper` primitive** in `src/shared/ui/primitives/stepper/` — value, min, label, `onChange`;
   token-first; RTL + axe + boundary test.
2. **`YarnDetailDrawer`** — `<Dialog open onClose title placement="side" size="lg">` as
   `ProjectDetailDrawer.tsx:286-293` does, but **prop-driven with no fetch of its own**:
   `SerializedYarnListItem` (`ui/types.ts:13-17`) already carries every field shown.
3. **`usedQuantity` PATCH** via a client wrapper; the response merges into `YarnsView`'s loaded
   list without reloading it.
4. **Wiring, settling debt 192** — `detailId` state in `YarnsView`, `onOpen` on `YarnCard`,
   `yarns?.find(y => y.id === detailId) ?? null` into the drawer, mirroring
   `ProjectsView.tsx:229,684,700-706`.

### In scope — S2 `catalog-management`

5. **Catalogue panel** per D4 — brand and type lists, create forms, delete affordances, with its
   own loading/error/empty states per SDD-01 §9.
6. **Blocking-409 notice** per D2, reporting both counts for a brand and one for a type.
7. **Freshness plumbing** per D5 — `brands-client.ts` extraction, `catalogToken`, dangling-filter
   reset.

### Out of scope

The create/edit modal (entry 25) · the empty state's «Agregar lana» action (**debt 193, blocked on
entry 25 — this change does NOT close it**, `deuda-tecnica.md:2929-2938`) · **any backend change**
· `POST /api/uploads/image` · linking yarns to projects (RFC-03) · a shared HTTP client (debt 129
stays open) · Zustand.

## Capabilities

### New Capabilities

- `yarn-detail-editing`: the detail drawer, the generic `Stepper` primitive and its boundary rule,
  and `usedQuantity` editing through `PATCH /api/yarns/:id` (floor 0, no ceiling).
- `yarn-catalog-management`: brand/type create and delete from `/lanas`, the blocking 409 notice
  with its exact bodies, and the filter-tree freshness invariant of D5.

### Modified Capabilities

- `yarn-inventory-browsing`: `#### Scenario: Card tap is a documented no-op` (spec.md:94) becomes
  "card tap opens the detail drawer"; the filter-tree requirement (spec.md:100) gains the
  refetch-on-catalogue-change and no-dangling-scope behaviour.
- `yarn-list-api`: unchanged.

## RFC-04 amendment — E2 (declared, not written here)

RFC-04 carries **E1** only, so the next free letter is **E2**. D4 fixes what §2 left open, so an
amendment is warranted. A later phase MUST add `## 7-ter. Enmienda E2` to
`docs/design/rfc/RFC-04-lanas.md`, in Spanish, matching E1's format, stating:

- **E2(a)** — §2 dice «panel en la misma página» sin fijar dónde: el panel de catálogos es una
  **sección colapsable en la columna izquierda**, debajo del árbol de filtro y la fila de color,
  sobre la misma superficie `Card` del panel de filtro, y reutiliza el primitivo `Disclosure` de
  #23. Se eligió sobre una región a lo ancho debajo de la grilla y sobre un modal aparte.
- **E2(b)** — §1 pide «borrado siempre con confirmación explícita (`kc-dialog`)`». Para marca y
  tipo el 409 es **bloqueante y sin `force`**: no hay nada que confirmar, así que el aviso se
  construye sobre el primitivo `Dialog` directamente, con **un solo botón** de cierre, no sobre
  `ConfirmDialog`.
- **E2(c)** — el stepper de `usedQuantity` es un **primitivo genérico del design system**
  (`shared/ui/primitives/stepper/`), no un componente de lanas; su único límite es un piso de 0,
  **sin techo**, porque PRD-01 §4.5 hace `usedQuantity` independiente de `quantity`.
- **E2(d)** — el botón «Editar» del drawer es un **no-op documentado** hasta que exista #25, igual
  que E1(c) con el tap de la card.

## Affected areas

| Area | Impact | Change |
|---|---|---|
| `src/shared/ui/primitives/stepper/` | New | `Stepper` + variants + tests (S1) |
| `src/features/yarns/ui/YarnDetailDrawer.tsx` | New | detail drawer (S1) |
| `src/features/yarns/ui/YarnCard.tsx` | Modified | `onOpen` replaces `noOpTap`; debt 192 (S1) |
| `src/features/yarns/ui/YarnsView.tsx` | Modified | `detailId`, PATCH merge (S1); `catalogToken`, filter reset (S2) |
| `src/features/yarns/ui/yarns-client.ts` | Modified | `usedQuantity` PATCH wrapper (S1) |
| `src/features/yarns/ui/YarnCatalogPanel.tsx` | New | panel + 409 notice (S2) |
| `src/features/yarns/ui/brands-client.ts` | New | `fetchTree` extracted, shared (S2) |
| `src/features/yarns/ui/YarnBrandTree.tsx`, `YarnFilterPanel.tsx` | Modified | `catalogToken` prop + effect dep; panel slot (S2) |
| `docs/design/rfc/RFC-04-lanas.md` | Modified | amendment E2 |
| `docs/historial/deuda-tecnica.md` | Modified | 192 struck through with how/where; new «Editar» no-op debt; 193 left open |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| The PATCH response is a raw `YarnRecord` with **no** `brandName`/`typeName`; replacing the list item wholesale blanks the card's labels | **High** | Merge only changed fields over the existing `SerializedYarnListItem`; an RTL test asserts the labels survive a stepper change |
| Two independent 1+N catalogue fetches | Med | Accepted (D5); shared `brands-client.ts` keeps one request shape. Consolidating state is a follow-up, not a blocker |
| A brand created in the panel does not appear in the tree, or a deleted one lingers | Med | D5's `catalogToken`, with an RTL test that deletes in the panel and asserts the tree re-reads |
| S2 overruns the 400-line budget (panel + forms + 409 + plumbing) | Med | `sdd-tasks` forecasts; if high, split S2 into read/create and delete/409 |
| The «Editar» no-op confuses a real user | Med | Accepted (D6), filed as visible debt, precedent E1(c); entry 25 settles it |
| `Stepper` drifts into yarn semantics (a `usedQuantity` prop, a yarn token) | Med | The boundary test asserts the source imports no `shared/config`; SDD-01 §1/§2/§3 cited in its header |
| A remount-free token refetch races an in-flight request | Low | Reuse the existing `cancelled` guard already in both effects (`YarnBrandTree.tsx:89-99`, `YarnsView.tsx:56-73`) |

## Rollback plan

**Nothing touches auth, DB schema, migrations or a deployed Route Handler**, so no contract, cookie
or data rollback exists to plan — the only server interaction is calling endpoints that already
ship and are already tested.

- **S1**: `Stepper` and `YarnDetailDrawer` are new files; reverting the S1 commit deletes them and
  restores `YarnCard`'s `noOpTap`, returning debt 192 to open (undo its strike-through with it).
  No other slice depends on S1.
- **S2**: the panel and `brands-client.ts` are new; the `catalogToken` prop and the effect dep are
  additive with a default, so reverting the S2 commit restores `YarnBrandTree`'s `[]`-dep effect
  exactly and `YarnFilterPanel` renders as entry 23 shipped it. Revert amendment E2 with it.
- Either slice reverts independently; S1 first if both must go.

## Dependencies

None. Entry 25 depends on this change, not the reverse.

## Success criteria

- [ ] Tapping a card opens a drawer showing every `SerializedYarnListItem` field; debt 192 struck
      through (not deleted) with how and where.
- [ ] The stepper changes `usedQuantity` through `PATCH /api/yarns/:id`, floors at 0, has no
      ceiling, and the card's `marca · tipo` labels survive the update.
- [ ] `src/shared/ui/primitives/stepper/` imports nothing from `src/shared/config/` and its
      boundary test proves it.
- [ ] Brands and types can be created and deleted from `/lanas`; a blocked deletion shows a
      single-button notice with the exact child counts.
- [ ] Creating or deleting in the panel refreshes the filter tree, and no filter points at a
      deleted id.
- [ ] No file under `src/app/api/`, `src/features/*/schema.ts`, `validation.ts` or `src/proxy.ts`
      is modified.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` green; RTL + axe per SDD-01 §9; zero
      hardcoded style values.
- [ ] RFC-04 E2 written; debt 193 still open and untouched.
