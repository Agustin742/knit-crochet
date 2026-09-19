# Proposal: Yarns list page with hierarchical filter (backlog 23)

## Intent

`/lanas` does not exist: `src/features/yarns/` has no `ui/` folder. Yarn inventory is
unbrowsable — the only way to see a yarn today is the project drawer's link picker, which
labels yarns by colour alone. Success: a user opens `/lanas`, sees every yarn as a card
(colour mark + `marca · tipo · colorName` + stock) and narrows it by brand→type and colour
family, with empty/error/loading states.

## Scope classification

UI/design-system scope — **RFC-04**, feature/backlog entry **23**; states per RFC-04 §4,
a11y per §5, wiring per §7. One functional-structure touch, governed by **PRD-01 §6.3**
(«Cada item: icono, marca · tipo · color, cantidad») over the entity of §4.5: `GET /api/yarns`
must return brand and type names, which it does not today
(`src/features/yarns/api/store.ts:245-249`).

## Must survive unchanged

| Invariant | Evidence |
|---|---|
| `?brandId=&typeId=&colorFamily=` filters, ANDed, all optional | `validation.ts:47-53`, `store.ts:234-249` |
| Every yarn query scoped by `userId` from the JWT | `store.ts` `YarnStore` contract |
| `getYarnOptions` / `YarnOption` = `Pick<YarnRecord,"id"\|"colorName"\|"colorFamily">` keeps working | `projects/ui/types.ts:95-101` |
| `YarnRecord` stays the raw row (create/get/update/delete untouched) | `yarns/types.ts:13` |
| Thin Route Handler, Zod at the edge, UI never imports Drizzle | `docs/harness/architecture.md` |
| The template knows no concrete app: nothing in `src/shared/ui/` imports app config (`ColorFamily`) | `SDD-01` line 8 and §1/§2/§3; debt 168 |

## Scope

### In scope

1. **Backend (D1)** — `listYarns` joins `brands` + `yarn_types`; `GET /api/yarns` returns
   **additive** `brandName`/`typeName` on a new `YarnListItem` type. Filters, status codes and
   wrapper (`{ yarns }`) unchanged. This also lifts the limitation recorded at
   `projects/ui/YarnsTab.tsx:73-78`.
2. **Swatch split along the portability line (D2)** — `src/shared/ui/` gets a **generic `Swatch`
   primitive**: pure presentation, token-first, driven entirely by props (a colour value or
   custom-property reference supplied by the consumer, an accessible label, and a size variant
   covering both the filter row and the card). It must **not** import `ColorFamily`, must not
   mention yarns, and must not know this application exists — SDD-01 §1/§2/§3. The
   `ColorFamily` → `var(--yarn-*)` **mapping stays app-side**, in `src/shared/config/` beside
   `ColorFamily` itself (`index.ts:104-119`; tokens at `globals.css:62-100`). The yarns feature
   and `YarnsTab` both **compose** primitive + mapping; the local duplicate
   (`YarnsTab.tsx:241-294`) is deleted. One *primitive* and one *mapping* — not one coupled
   component. This is the architecture decision debt **168** asked for (see below). No new SVG;
   `shared/ui/motifs/` stays empty.

   *Why `shared/config/`*: `architecture.md`'s tree (line 50) assigns «familias de color» to that
   layer, which already owns `ColorFamily` and its Spanish label map — a token map is the same
   shape of app configuration. It also keeps `features/projects` from importing `features/yarns`
   UI, and keeps the design-system layer free of any app enum.

3. **Page + list** — thin server page `src/app/(app)/lanas/`, client view in
   `src/features/yarns/ui/` mirroring `ProjectsView` (`useState` filters, `requestKey`-derived
   loading, `EmptyState`/`ErrorState`/`Skeleton`), plus a `yarns-client.ts` fetch wrapper.
4. **Filter tree** — new keyboard-navigable brand→type disclosure primitive (none exists) plus
   the colour-family swatch row, both wired to the querystring.
5. **Card tap (D3)** — documented no-op handler pointing at entry 24, filed as new debt
   **192** at 🟠 in `docs/historial/deuda-tecnica.md`.

### Out of scope

Drawer and `usedQuantity` stepper (entry 24) · catalogue management panel (entry 24) ·
create/edit modal (entry 25) · fixing the projects yarn dropdown (follow-up on D1) ·
a shared HTTP client (debt 129 stays open) · Zustand (not installed for this feature).

## Capabilities

`openspec/specs/` is empty, so both are new.

### New Capabilities

- `yarn-list-api`: `GET /api/yarns` contract — filters, `userId` scoping, 401, and the
  additive `brandName`/`typeName` enrichment.
- `yarn-inventory-browsing`: the `/lanas` page — cards, brand→type tree, colour-family
  swatches, empty/error/loading, SDD-01 §9 bar.

### Modified Capabilities

- None.

## RFC-04 amendment (declared, not written here)

RFC-04 has no amendments yet, so the next free letter is **E1**. A later phase MUST add
`## 7-bis. Enmienda E1` to `docs/design/rfc/RFC-04-lanas.md` (Spanish, matching the RFC-03
format) stating: §3's `GET /api/yarns` now returns `brandName` and `typeName` alongside the
raw row; the addition is **additive** and no existing consumer changes; the card's «ícono»
of §1/§2 is the generic `Swatch` at card size tinted by the app-side colour-family map, not a
new asset; and in entry 23 the card's tap is a **no-op** until entry 24 ships the drawer.

## Debt 168 (declared, not written here)

Debt 168 is settled by the D2 **architecture decision**, not by relocating a file — its own text
demands «decidir dónde vive un componente que depende de config de app y no del design system —
es una decisión de arquitectura, no un mover-archivo», and rules out `src/shared/ui/` for the
coupled component. A later phase MUST follow the ledger protocol at the top of
`docs/historial/deuda-tecnica.md` («Saldar: **no la borres**»): strike entry 168's title through
with `~~…~~`, never delete it, and write underneath, in Spanish:

- **Cómo se saldó**: the component was split along the portability line. What went up to
  `src/shared/ui/` is a **generic, app-agnostic `Swatch`** (no `ColorFamily`, no yarn token, no
  app knowledge), so SDD-01's hard rule holds. The `ColorFamily` → `var(--yarn-*)` mapping stayed
  **app-side** in `src/shared/config/`. The original warning was **correct** and is precisely why
  the split exists: the primitive goes up, the config dependency never does.
- **Dónde quedó la prueba**: the S2 commit; `src/shared/ui/primitives/swatch/Swatch.test.tsx`
  (including its assertion that the primitive imports no `ColorFamily`);
  `src/shared/config/yarn-swatch.classes.test.ts`; and this change's archive report.

## Approach

Backend join first (one request, no N+1), then the swatch split, then list, then tree. The card
cannot be labelled without the names and cannot be painted without the primitive, so both
precede the list.

## Slices (delivery_strategy: `auto-chain`, budget 400 lines)

Exploration estimates 800-1400 changed lines, so this chains. S1 targets the feature branch;
each later slice targets the previous one.

| # | Slice | Contents | Est. |
|---|---|---|---|
| S1 | `backend-names` | store join, `YarnListItem`, route, integration tests | ~150-220 |
| S2 | `swatch-split` | generic `Swatch` in `shared/ui` + RTL/axe, app-side `ColorFamily`→token map, both consumers compose them, delete local copy | ~140-200 |
| S3 | `list-cards-states` | page, view, `yarns-client.ts`, card, three states, debt 192 | ~300-400 |
| S4 | `filter-tree` | disclosure primitive + keyboard nav, swatch row, querystring wiring | ~300-400 |

Ordering rationale: S1 before S3 (card labels need the names), S2 before S3 (the card composes
primitive + mapping), S4 last (a filter needs a list to filter). S1 and S2 touch disjoint layers
and are each independently shippable and revertible.

## Affected areas

| Area | Impact | Change |
|---|---|---|
| `src/features/yarns/api/store.ts`, `list-yarns.ts`, `types.ts` | Modified | join + `YarnListItem` |
| `src/app/api/yarns/route.ts` | Modified | returns enriched items |
| `src/features/yarns/api/testing/in-memory-store.ts` | Modified | double mirrors the join |
| `src/shared/ui/` | New | generic `Swatch` primitive (no `ColorFamily`, no yarn token) |
| `src/shared/config/index.ts` | Modified | app-side `ColorFamily` → `var(--yarn-*)` map |
| `src/features/projects/ui/YarnsTab.tsx` | Modified | composes primitive + map; local copy deleted |
| `src/app/(app)/lanas/`, `src/features/yarns/ui/` | New | page, view, card, tree, client |
| `docs/design/rfc/RFC-04-lanas.md` | Modified | amendment E1 |
| `docs/historial/deuda-tecnica.md` | Modified | 168 struck through + how/where; new debt 192 |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Route tests assert the exact row shape and break on extra keys | Med | S1 fixes the assertions in the same slice; `YarnOption` is a `Pick`, structurally unaffected |
| `YarnRecord` widened by accident, leaking into create/update | Med | Enrichment lives on a separate `YarnListItem`; `YarnRecord` untouched |
| Join changes yarns with a missing brand/type row | Low | Inner join over non-nullable FKs; assert row count is unchanged in tests |
| Tree primitive has no precedent and overruns S4 | Med | Build on native `<details>`/`<summary>` as in RFC-03 E1(g); split S4 if `sdd-tasks` forecasts >400 |
| No-op tap confuses a real user | High | Accepted (D3), filed as visible debt 192; entry 24 settles it |
| The `yarn-*` class/token names leave `features/projects/ui/`, which the compiled-CSS gate covers, for `shared/config` — which debt 170 says is ungated | Med | Keep the map an exhaustive `switch` over the union (a missing family fails typecheck, as today) and check the 13 swatches in browser (REGLA 4). Debt 170 stays open and untouched |
| A future contributor re-couples the primitive by adding a `ColorFamily` prop | Med | The `Swatch` test file asserts the app-agnostic prop contract; SDD-01 §1/§2/§3 cited in its header comment |

## Rollback plan

- **S1 (deployed Route Handler)**: no DB schema, no migration, no auth touched — the join is
  read-only and the fields are additive. Revert the S1 commit; `GET /api/yarns` returns the
  raw row again and every current consumer keeps working, because none reads the new fields
  yet. If S3 already shipped, roll back S3 first (cards would render empty labels).
- **S2**: the primitive and the map are new files, so reverting the S2 commit deletes both and
  restores the local `YarnSwatch` in `YarnsTab`. No contract crosses a network boundary and no
  other slice depends on S2 until S3. If reverted, debt 168 returns to open and its strike-through
  must be undone with it.
- **S3/S4**: pure additions under `src/app/(app)/lanas/` and `src/features/yarns/ui/`; delete
  the route to remove the page. Revert the debt 192 entry only if S3 is reverted.

## Dependencies

None external. `POST /api/uploads/image` (RFC-04 §3) belongs to entry 25, not here.

## Success criteria

- [ ] `GET /api/yarns` returns `brandName`/`typeName`; filters, scoping and status codes unchanged.
- [ ] `src/shared/ui/` holds one generic `Swatch` that imports no `ColorFamily`, names no yarn
      token and mentions no yarn; the `ColorFamily` → token map lives app-side in
      `src/shared/config/`; no swatch duplicate is left in `features/`.
- [ ] `/lanas` renders the card grid and its empty, error and loading states.
- [ ] Brand→type tree and colour-family swatches filter the list and are operable by keyboard.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` green; RTL + axe per SDD-01 §9;
      zero hardcoded style values.
- [ ] RFC-04 E1 written; debt 192 filed; debt 168 struck through (not deleted) with how and where.
