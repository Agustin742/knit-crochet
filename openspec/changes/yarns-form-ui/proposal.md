# Proposal: Yarn create/edit modal with tabs (backlog 25)

## Intent

`/lanas` can list, open and adjust a yarn, but it cannot **add** one or **correct** one. The empty
state says «Sin lanas en el stash todavía» and offers nothing (debt 193), and the drawer's «Editar»
is a documented no-op (debt 199, RFC-04 E2(b)). The only way to create a yarn today is to call
`POST /api/yarns` by hand.

The data model is not the gap. Every field the form needs — including `recommendedNeedle {min,max}`,
`lot` and `colorFamily` — already exists end to end: DB column, Zod validation
(`createYarnSchema`, `src/features/yarns/validation.ts:23`), API, and the drawer's read-only
display. What is missing is **the form controls to enter them**: a min–max needle range input, a
date input for `lot`, and a required single-select colour-family picker. This change adds those
controls and the modal that hosts them.

Success: a user with an empty stash presses «Agregar lana», fills two tabs, and sees the yarn in
the grid; a user opens a yarn's drawer, presses «Editar», corrects it, and sees the change; a
duplicate `colorCode` under the same brand is reported **on the `colorCode` field**, not as a
page-level error.

## Scope classification

UI/design-system scope — **RFC-04** §1 (create/edit in a modal, form in tabs, choose-or-create
brand/type from the form, `usedQuantity` not in the form), §2 (tab contents), §3 (the `colorCode`
409 shown on the field), §4 (empty state + «Agregar lana»), §5 (a11y); backlog entry **25**.
Functional rules are read, not changed, from **PRD-01 §4.4** (brand→type hierarchy; `colorCode`
unique per brand) and **§4.5** (`usedQuantity` is consumption, edited only in the drawer).

**Zero backend work.** `POST /api/yarns`, `PATCH /api/yarns/:id`, `POST /api/brands`,
`POST /api/brands/:id/types` and `POST /api/uploads/image` all exist and are tested.

## Must survive unchanged

| Invariant | Evidence |
|---|---|
| No new/changed endpoint, DB schema, migration, Zod schema, JWT/cookie or `src/proxy.ts` behaviour | scope note above |
| `POST /api/yarns` → `201 { yarn }`; `PATCH /api/yarns/:id` → `200 { yarn }` (**raw `YarnRecord`**, no `brandName`/`typeName`); 400/404/409 unchanged | `api/yarns/route.ts`, `api/yarns/[id]/route.ts` |
| The `colorCode` 409 body stays a plain `{ error }` with no field discriminator | `api/yarns/params.ts:40` |
| `POST /api/uploads/image` stays the single shared upload endpoint (multipart `file`, folder derived from the JWT) | `api/uploads/image/route.ts`, RFC-04 §8 |
| `usedQuantity` is edited only by the drawer stepper and never appears in this form | RFC-04 §1, PRD-01 §4.5, spec `yarn-detail-editing` |
| Entry 23/24 behaviour: filter tree, colour filter row (optional, deselectable), catalogue panel, `catalogToken` freshness, blocking 409 notice | specs `yarn-inventory-browsing`, `yarn-catalog-management` |
| `src/shared/ui/` knows no application (debt 168, SDD-01 §1–§3) | `Swatch.boundary.test.ts`, `Stepper` boundary test |
| Thin Route Handlers, Zod at the edge, UI never imports Drizzle | `docs/harness/architecture.md` |

## Decisions

Decisions D3–D5 are **recommended positions for `sdd-design` to confirm**; the alternative is stated
so design can overturn them with evidence.

- **D1 — thin shell + one component per tab.** `YarnFormDialog` keeps `ProjectFormDialog`'s proven
  contract (`target: {mode:"create"} | {mode:"edit", yarn} | null`, inner form keyed by mode+id so
  each open remounts fresh; per-field errors; focus-first-invalid via the pending-focus tick; zod
  issues mapped in screen order; photo uploaded on file choice). The two tabs render as
  `YarnIdentityTab` and `YarnTechnicalTab`. They are genuinely different concerns and give the
  chain real seams instead of artificial cuts.

- **D2 — form state lives in the shell, not in the tabs.** The existing `Tabs` primitive mounts
  **only the active panel**, so state held inside a tab would be lost on every tab switch. The shell
  owns values and errors; tabs are controlled. Consequence: when validation or the 409 lands on a
  field in the inactive tab, the shell **switches to that tab first**, then focuses the field. This
  is a hard requirement, not polish — `lot`, `length`, `fiber`, `thickness` and the needle range are
  required by `createYarnSchema`, so submitting from «Identidad» with an empty «Ficha técnica» is the
  common path.

- **D3 — brand/type choose-or-create: form-local, reusing the shared client, no panel refactor.**
  *Recommended*: `YarnIdentityTab` renders brand and type as `Select`s with an inline «create new»
  affordance, calling the **already shared** `createBrand` / `createYarnType` / `getBrandTree` from
  `brands-client.ts` and guarding each create with its own request token captured before `await`
  (the E2(e) pattern). Selecting or creating a brand resets the type. A successful inline create
  raises `onCatalogChange`, so the filter tree and catalogue panel stay fresh (spec
  `yarn-catalog-management`, D5 of entry 24).
  *Why*: the reusable part — HTTP calls and their result shape — is already shared. What
  `YarnCatalogPanel` adds on top is a **modal** create, and a modal opened from inside the yarn
  modal (dialog-in-dialog) is exactly what the form must not do; the backlog asks for inline.
  What would remain to extract is a ~10-line token guard, and extracting it means editing a shipped,
  tested file (whose late-response findings, including R3-003, were already fixed in PR #3).
  *Alternative*: extract a `useLatestRequest` hook and migrate `YarnCatalogPanel`'s four token refs
  to it. Deferred as a follow-up debt so this change's blast radius stays on new files.

- **D4 — colour family: a new required single-select picker, not a mode flag on the filter.**
  *Recommended*: feature-local `ColorFamilyPicker` built from the same parts as
  `ColorFamilyFilter` (`Toggle`, `Swatch`, the `ColorFamily`→token map, the family labels), with
  the project's single-select convention: `role="group"` + `aria-pressed`, as `SegmentedControl`
  documents (not `radiogroup`). Re-activating the selected swatch is a no-op (never clears), and the
  group carries `aria-invalid`/`aria-describedby` to a `Field` error.
  *Why*: filter and form control differ in more than one boolean — deselect semantics, required
  validation, error wiring, and lifecycle. A `required` prop would make one shipped component
  switch behaviour by mode and couple two consumers' tests. The shared building blocks are already
  primitives, so the new picker duplicates only a short `map` over the families.
  *Alternative*: a `required` mode on `ColorFamilyFilter`. If design finds the loop duplication
  non-trivial, extract only the swatch rendering into a shared inner piece and keep two semantic
  wrappers.

- **D5 — `lot`: native `Input type="date"`, with a new primitive only if it fails.**
  *Recommended*: the existing `Input` with `type="date"` inside a `Field`. It is accessible,
  localised by the browser, and mobile-native; its `YYYY-MM-DD` value is exactly what `z.coerce.date`
  parses. Design must confirm that `Input` forwards `type` and that the native picker is legible on
  the dark surface (token-driven `color-scheme`).
  *Alternative*: a `DateInput` primitive in `src/shared/ui/primitives/`. The template is a floor,
  not a ceiling — if verification shows the native control cannot be made to meet the token/contrast
  bar, create the primitive (generic, with a boundary test) rather than ship a degraded control.

- **D6 — needle range: feature-local `NeedleRangeField`.** A `fieldset` + `legend` with two numeric
  `Input`s (min, max), each with its own error; the schema's `max >= min` refine is mapped to the
  `max` input. Feature-local because `{min,max}` is yarn-specific and projects' `NeedlesField` is
  array-based. A generic range primitive is not warranted by one consumer.

- **D7 — the 409 → `colorCode` mapping is explicit and tested.** `createYarn`/`updateYarn` in
  `yarns-client.ts` translate **any** `409` from those two calls into `{ field: "colorCode" }`.
  This holds because the duplicate-`colorCode` constraint is the only 409 either endpoint returns
  today; a unit test pins that assumption, and the client carries a comment naming it so a future
  second unique constraint cannot silently reuse the mapping.

- **D8 — after a successful save the list reloads; it does not merge.** The PATCH/POST response is a
  raw `YarnRecord` without `brandName`/`typeName`, and an edit may change the brand or type — so
  `mergeYarnPatch` (which keeps the old names) would show a stale «marca · tipo». A created or edited
  yarn may also no longer match the active filters. `YarnsView` bumps its existing `reloadToken`
  instead. The drawer resolves by id against the live list, so an open drawer shows the updated yarn
  once the reload lands.

- **D9 — create entry points follow the projects precedent.** «Agregar lana» sits in the page
  header when the grid has yarns and moves into `EmptyState`'s `action` slot when it is empty — the
  same button, never both (the `ProjectsView` pattern). The drawer's «Editar» opens the modal in
  edit mode and becomes `variant="primary"` (debt 199). **This header button is not named in the
  backlog entry; the user accepted it — see Resolved decisions.**

## Scope

### In scope

1. `yarns-client.ts`: `createYarn`, `updateYarn` (typed result, 409 → `colorCode` per D7), and a
   yarn photo upload wrapper over `POST /api/uploads/image` with the `uploadImageInputSchema`
   client pre-check (mirrors `uploadProjectImage`).
2. Form controls: `ColorFamilyPicker` (D4), `NeedleRangeField` (D6), `lot` date input (D5).
3. `YarnFormDialog` shell (D1, D2): target/key remount, shell-owned state, tab switching on error,
   focus-first-invalid, create submit, edit submit as a **patch** that closes without a request when
   empty.
4. `YarnIdentityTab`: brand choose-or-create, dependent type choose-or-create (D3), `colorName`,
   `colorCode` (409 shown on the field), `ColorFamilyPicker`, photo.
5. `YarnTechnicalTab`: `length`, `fiber`, `NeedleRangeField`, `thickness`, `lot`, `quantity`.
6. `YarnsView` wiring: «Agregar lana» (D9, settles **debt 193**), drawer `onEdit` (settles
   **debt 199**), reload after save (D8), `onCatalogChange` from inline creates, and a distinct
   no-matches state when active filters return nothing, with «Quitar filtros» (Resolved decision 2).
7. `YarnDetailDrawer`: «Editar» promoted to `primary` and wired.
8. Copy in `yarn-copy.ts` (Spanish UI copy); RFC-04 amendment **E3**; debts 193 and 199 struck
   through with how and where; new follow-up debt for D3's deferred extraction.

### Out of scope

`usedQuantity` in the form · deleting a yarn (the `?force=true` 409 flow of RFC-04 §3 — not in
entry 25) · any backend, schema, validation or upload-route change · refactoring
`YarnCatalogPanel` (D3) · linking yarns to projects (RFC-03) · a shared HTTP
client (debt 129 stays open) · consolidating the three 1+N brand-tree fetches (see Risks) ·
Zustand.

## Capabilities

### New Capabilities

- `yarn-create-edit`: the create/edit modal with its two tabs and shell-owned state, brand and
  dependent type choose-or-create (with the catalogue change signal on inline create), the required
  colour-family picker, needle range, `lot` date, photo upload on file choice, the `colorCode` 409
  shown on the field, tab switching to the first invalid field, the empty-patch short-circuit, and
  reload-after-save.

### Modified Capabilities

- `yarn-detail-editing`: `#### Scenario: «Editar» is a real no-op control` (spec.md:67) becomes
  "«Editar» opens the edit modal for this yarn"; the requirement text drops "documented as a no-op
  pending backlog entry 25" and states the `primary` variant.
- `yarn-inventory-browsing`: the empty state (spec.md:80) gains the «Agregar lana» action; the page
  gains the header create action when the list is non-empty (Resolved decision 1).
- `yarn-catalog-management`: unchanged (the form consumes its signal; it does not change the
  panel's requirements).
- `yarn-list-api`: unchanged.

## RFC-04 amendment — E3 (declared, not written here)

E2 is used through E2(e), so the next letter is **E3**. A later phase MUST add
`## 7-quater. Enmienda E3` to `docs/design/rfc/RFC-04-lanas.md`, in Spanish, matching E1/E2's
format, recording the decisions design confirms from D2 (state in the shell, tab switch on error),
D3 (inline create in the form, never a dialog inside the dialog), D4 (required picker vs the
optional filter), D5 (`lot` input), D8 (reload after save) and D9 (where «Agregar lana» lives).

## Affected areas

| Area | Impact | Change |
|---|---|---|
| `src/features/yarns/ui/yarns-client.ts` | Modified | `createYarn`, `updateYarn`, photo upload wrapper |
| `src/features/yarns/ui/YarnFormDialog.tsx` | New | shell, state, submit/patch, focus, tab switching |
| `src/features/yarns/ui/YarnIdentityTab.tsx` | New | Identidad tab, brand/type choose-or-create |
| `src/features/yarns/ui/YarnTechnicalTab.tsx` | New | Ficha técnica tab |
| `src/features/yarns/ui/ColorFamilyPicker.tsx` | New | required single-select swatches (D4) |
| `src/features/yarns/ui/NeedleRangeField.tsx` | New | `{min,max}` field (D6) |
| `src/features/yarns/ui/YarnsView.tsx` | Modified | form target, create entry points, `onEdit`, reload, catalogue signal |
| `src/features/yarns/ui/YarnDetailDrawer.tsx` | Modified | «Editar» wired, `primary` |
| `src/features/yarns/ui/yarn-copy.ts` | Modified | tab names, labels, actions, errors |
| `src/shared/ui/primitives/` | Conditional | only if D5's fallback (`DateInput`) triggers |
| Tests beside each file | New/Modified | RTL + axe + smoke (SDD-01 §9), client unit tests |
| `docs/design/rfc/RFC-04-lanas.md` | Modified | amendment E3 |
| `docs/historial/deuda-tecnica.md` | Modified | 193 and 199 struck through; D3 follow-up debt |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Values lost on tab switch because `Tabs` unmounts inactive panels | **High** if ignored | D2: state in the shell; an RTL test fills a tab, switches away and back, and asserts the values survive |
| A required field in the hidden tab blocks submit with no visible cause | **High** if ignored | D2: switch to the tab of the first invalid field, then focus it; RTL test submits from «Identidad» with «Ficha técnica» empty |
| Stale «marca · tipo» after an edit that changes brand/type | High | D8: reload, not merge; RTL test changes brand in edit and asserts the card label |
| `lot` off by one day across time zones when a stored timestamp is rendered back into `YYYY-MM-DD` | Med | Derive the edit value from the UTC date part, never local time; unit test with a non-UTC offset |
| A future second 409 is mislabelled as `colorCode` | Low | D7: pinned by a unit test and a named comment in the client |
| The native date picker is illegible on the dark surface | Med | D5 fallback: generic `DateInput` primitive with boundary test; verified in the browser before closing UI |
| Late response from an inline brand/type create lands after the user moved on (the R3-003 class) | Med | D3: request token captured before `await`, result applied only if still current; RTL test |
| A third copy of the 1+N brand-tree fetch (filter tree, catalogue panel, form) | Med | Accepted; `getBrandTree` keeps one request shape. Consolidation logged as a follow-up, not a blocker |
| Slices overrun the 400-line budget (form + tests) | Med | `sdd-tasks` forecasts per slice; S2/S3 are the split candidates |

## Delivery and rollback plan (auto-chain, ~400 authored lines per PR)

Nothing touches auth, DB schema, migrations or a deployed Route Handler, so no contract, cookie or
data rollback exists. Rough slices — `sdd-tasks` owns the final boundaries and forecast:

| Slice | Content | User-visible? | Rollback |
|---|---|---|---|
| **S1** client + controls | `createYarn`/`updateYarn`/upload wrapper (D7), `ColorFamilyPicker`, `NeedleRangeField`, `lot` input decision (D5) | No (unmounted) | Revert the commit; all new files except additive client functions with no consumer |
| **S2** shell + Identidad | `YarnFormDialog` (D1, D2), `YarnIdentityTab` with brand/type choose-or-create (D3), photo | No (not yet wired) | Revert; new files only |
| **S3** Ficha técnica + create | `YarnTechnicalTab`, create submit, 409 on field, tab switch on error, «Agregar lana» entry points and reload (D8, D9) — **settles debt 193** | Yes: create works | Revert restores the action-less `EmptyState`; reopen debt 193 (undo its strike-through) |
| **S4** edit | edit mode with patch + empty-patch short-circuit, drawer `onEdit` + `primary` — **settles debt 199**; RFC-04 E3 | Yes: edit works | Revert restores the no-op «Editar» (`secondary`); reopen debt 199; revert E3 |

Each later slice depends only on earlier ones; revert from the top of the chain down. S1–S2 ship
dead-but-tested code, which is acceptable because the chain lands in order on the feature branch.

## Dependencies

None outside this repository. Entry 24 (drawer, catalogue panel, `catalogToken`) is already merged
and is consumed, not changed.

## Resolved decisions

1. **Header «Agregar lana» when the stash is not empty (D9) — ACCEPTED by the user on 2026-09-22.**
   The backlog and debt 193 name only the empty-state action; without a header button, a user with
   one yarn cannot create a second from the UI. The user confirmed the `ProjectsView` pattern: one
   button that sits in the page header when the grid has yarns and moves into the empty state when
   it is empty. The header action is in scope.
2. **Filtered-empty state — ADDED to scope by the user on 2026-09-22.** `/lanas` showed «Sin lanas
   en el stash todavía» also when active filters matched nothing, and with D9 it would also offer
   «Agregar lana» there. It now gets its own no-matches state with «Quitar filtros», mirroring
   `ProjectsView` (design D9 amendment).

D3, D4 and D5 are technical positions for `sdd-design` to confirm; they do not need the user.

## Success criteria

- [ ] From an empty `/lanas`, «Agregar lana» opens the modal; a valid submit creates the yarn and it
      appears in the grid; debt 193 struck through (not deleted) with how and where.
- [ ] From the drawer, «Editar» (now `primary`) opens the modal pre-filled; saving a change updates the
      card and the open drawer, including «marca · tipo» after a brand change; an unchanged form closes
      without a request; debt 199 struck through.
- [ ] Brand and type can be chosen or created inline; changing the brand resets the type; an inline
      create refreshes the filter tree and the catalogue panel.
- [ ] A duplicate `colorCode` under the same brand shows its message on the `colorCode` field (with
      `aria-invalid`), switching to «Identidad» if needed — never as a page-level error.
- [ ] Submitting with an invalid field in the inactive tab switches to that tab and focuses the field;
      values survive tab switches.
- [ ] `colorFamily` cannot be cleared once chosen; `recommendedNeedle` min/max and `lot` are entered
      through their controls and round-trip through edit unchanged (no date shift).
- [ ] `usedQuantity` does not appear in the form.
- [ ] No file under `src/app/api/`, `src/features/*/schema.ts`, `validation.ts` or `src/proxy.ts` is
      modified.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` green; RTL + axe + render smoke per
      SDD-01 §9; zero hardcoded style values; the modal verified in the browser before closing UI.
- [ ] RFC-04 E3 written.
