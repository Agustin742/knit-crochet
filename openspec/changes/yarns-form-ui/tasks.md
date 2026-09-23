# Tasks: Yarn create/edit modal with tabs (backlog 25)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | S1 ~140 src / ~200 test ≈ 340 · S2 ~170 / ~210 ≈ 380 · S3 ~190 / ~205 ≈ 395 · S4 ~220 / ~200 ≈ 420 · S5a ~150 / ~150 ≈ 300 · S5b ~135 / ~130 ≈ 265 · S6 ~90 / ~130 ≈ 220 · S7 ~90 / ~170 ≈ 260 — total ≈ 2,580 (amended 2026-09-22, review lineage review-7a5543c9e8b79ca4: R3-001–R3-004 add ~180 lines, mostly S5) |
| 400-line budget risk | S1 Medium · S2 Medium · S3 Medium · S4 High (named split point) · S5a Medium · S5b Medium (S5 split applied) · S6 Low · S7 Low |
| Chained PRs recommended | Yes |
| Suggested split | PR1a S1a (`feature/25-s1a-yarn-save-client`, commit fa12492: createYarn/updateYarn, 292 lines) → PR1b S1b (`feature/25-s1b-upload-client`, base = PR1a: uploadImage + debt 200, 309 lines) — S1 split applied 2026-09-22 after it landed at ≈601 lines → PR2a S2a (`feature/25-s2a-yarn-form-values`, base = PR1b: form copy + the yarn-form values model, 393 lines) → PR2b S2b (`feature/25-s2b-yarn-form-validation`, base = PR2a: issuesToErrors/validateCreate/validateEdit + docs, 523 lines) — S2 split applied 2026-09-23 after it landed at ≈916 lines → PR3a S3a (`feature/25-s3a-color-family-picker`, b1c99a4, 258 lines) → PR3b S3b (`feature/25-s3b-needle-range-field`, ab24e7b, 235 lines) → PR3c S3c (`feature/25-s3c-yarn-technical-tab`, 9b1b39a + docs, 420 lines) — S3 split applied 2026-09-23 after it landed at ≈913 lines → PR4 S4 → PR5 S5a → PR6 S5b → PR7 S6 → PR8 S7 |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

**Split rationale**: `design.md`'s own slice plan (S1–S7) already keeps each PR to one deliverable
concern under or near the 400-line budget; S4 (`ChooseOrCreateField` + `YarnIdentityTab`) and S5
(`YarnFormDialog` create mode: state, tab switching, focus, uploads, inline-create handlers, 409)
are the two slices closest to or over the line. Each carries a design-named split point
(`ChooseOrCreateField` alone for S4; the inline-create handlers for S5) to use if the actual diff
overruns — `sdd-apply` decides whether to invoke it once real line counts are known. No slice is
merged or reordered to compensate; `sdd-tasks` keeps the seven slices design already cut.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| S1 `yarn-save-client` | `createYarn`/`updateYarn` (409→`colorCode`, D7) + `uploads-client` (D10); files debt 200 | PR1, base = tracker branch | `pnpm test -- yarns-client uploads-client` | N/A — no consumer wired yet, nothing renders | Revert PR1: deletes `uploads-client.ts`+test, restores `yarns-client.ts` to its pre-change state; no other file depends on these additions |
| S2 `yarn-form-model` | Pure `yarn-form.ts` (values, parsing, `applyChange`, `validateCreate`/`validateEdit`, `yarnPatch`, `issuesToErrors`, `lotInputValue`) + form copy | PR2, base = PR1 branch | `pnpm test -- yarn-form yarn-copy` | N/A — pure module, no UI mounted | Revert PR2: deletes `yarn-form.ts`+test; copy additions are unused constants until S3+ |
| S3 `yarn-technical-controls` | `ColorFamilyPicker`, `NeedleRangeField`, `YarnTechnicalTab`, classes-gate entries | PR3, base = PR2 branch | `pnpm test -- ColorFamilyPicker NeedleRangeField YarnTechnicalTab yarns-ui.classes` | N/A — components exist but are not mounted in any route | Revert PR3: deletes the three new components+tests and their classes-gate entries |
| S4 `yarn-identity-tab` | `ChooseOrCreateField`, `YarnIdentityTab`, classes-gate entries | PR4, base = PR3 branch | `pnpm test -- ChooseOrCreateField YarnIdentityTab yarns-ui.classes` | N/A — not mounted | Revert PR4: deletes the two new components+tests and their classes-gate entries |
| S5a `yarn-form-shell-create` | `YarnFormDialog` create mode: target/key remount, shell state, tab switch on error + focus, create submit, 409→`colorCode` | PR5, base = PR4 branch | `pnpm test -- YarnFormDialog` | N/A — dialog exists but nothing in `YarnsView` opens it yet | Revert PR5: deletes `YarnFormDialog.tsx`+test; nothing else references it |
| S5b `yarn-form-async-inputs` | Photo upload and inline brand/type create in the shell, each with its per-field monotonic request sequence (R3-001, R3-002) | PR6, base = PR5 branch | `pnpm test -- YarnFormDialog` | N/A — still not opened from `YarnsView` | Revert PR6: removes the upload and inline-create handlers; S5a's shell stays |
| S6 `yarn-create-wiring` | `YarnsView` header/empty-state «Agregar lana», filtered-empty «Quitar filtros», reload-after-save, `handleFormCatalogChange`, `YarnCatalogPanel.refreshToken`, `YarnFilterPanel` forwarding, RFC-04 E3(a)–(e), strike debt 193, file debt 201 | PR7, base = PR6 branch | `pnpm test -- YarnsView YarnCatalogPanel YarnFilterPanel` | Manual `/lanas`: from an empty stash, «Agregar lana» → fill both tabs → save → card appears; filter to no matches → «Quitar filtros» restores the list; date input glyph/popup/focus ring in the real modal (D5 REGLA-4 gate); mobile width via iframe (browser — orchestrator only) | Revert PR7: restores the action-less `EmptyState`, the single `"Sin lanas..."` message for every empty case, and the panel's `[retryToken]`-only effect; reopens debt 193 (undo its strike-through) |
| S7 `yarn-edit` | Edit arm of `YarnFormDialog` (prefill, `validateEdit`, empty-patch short-circuit, `updateYarn`), `YarnDetailDrawer` «Editar» → `primary` + wiring, RFC-04 E3(f)–(g), strike debt 199 | PR8, base = PR7 branch | `pnpm test -- YarnFormDialog YarnDetailDrawer YarnsView` | Manual `/lanas`: open a yarn's drawer, «Editar» (now `primary`) opens the modal stacked over the drawer, pre-filled, `Escape` closes only the modal; change the brand, save, confirm the card's «marca · tipo» and the open drawer both update; submit unchanged → closes without a request (browser — orchestrator only) | Revert PR8: restores the no-op `secondary` «Editar»; reopens debt 199 |

**Sequencing lock**: S1 → S2 → S3 → S4 → S5a → S5b → S6 → S7 is fixed, not reorderable. S3 and S4 both
import `yarn-form.ts` (S2); S5 mounts `YarnIdentityTab` (S4) and `YarnTechnicalTab` (S3); S6 wires
`YarnFormDialog` (S5) into `YarnsView`; S7 extends the same `YarnFormDialog` and re-opens
`YarnsView`/`yarns-ui.classes.test.ts` that S6 last touched. These are sequential edits in the
chain, never merge conflicts.

## Phase 1: S1 `yarn-save-client`

- [x] 1.1 RED: extend `src/features/yarns/ui/yarns-client.test.ts` — `createYarn(payload)` sends
      `POST /api/yarns` with the payload as the body; `updateYarn(id, patch)` sends
      `PATCH /api/yarns/:id` with only the patch fields; `201`/`200` resolve
      `{ ok: true, data: <raw SerializedYarnRecord> }`; a `409` from **either** call resolves
      `{ ok: false, field: "colorCode", message: DUPLICATE_COLOR_CODE_MESSAGE }` (D7 pin — the test
      names this assumption); `400`/`404`/network failure/unreadable body resolve
      `{ ok: false, field: null, message }` with the existing `UNEXPECTED_ERROR_MESSAGE` /
      `NETWORK_ERROR_MESSAGE` fallbacks.
- [x] 1.2 GREEN: `src/features/yarns/ui/yarns-client.ts` — add `YarnSaveResult` type,
      `DUPLICATE_COLOR_CODE_MESSAGE` constant with a comment naming the D7 assumption (the
      duplicate-`colorCode` constraint is the only 409 either endpoint returns today; a future
      second unique constraint must not silently reuse this mapping), `createYarn(payload)`,
      `updateYarn(id, patch)`.
- [x] 1.3 RED: create `src/features/uploads/ui/uploads-client.test.ts` — `uploadImage(file)` posts
      `multipart/form-data` with only the `file` field and **no manually-set content-type header**;
      success is **201 only** (a 200 is treated as failure); `400`/`401`/`502` map to their
      fallback messages derived from `ACCEPTED_IMAGE_TYPES`/`MAX_IMAGE_BYTES`; a readable server
      `{ error }` body wins over the fallback; network failure resolves
      `{ ok: false, message: NETWORK_ERROR_MESSAGE }`.
- [x] 1.4 GREEN: create `src/features/uploads/ui/uploads-client.ts` — `uploadImage(file):
      Promise<UploadImageResult>` (D10), mirroring `uploadProjectImage`'s three contract points
      (`projects-client.ts:640-679`): browser sets the multipart boundary itself, success is `201`
      only, the endpoint accepts no other field. Imported by internal path
      (`@/features/uploads/ui/uploads-client`), not through a barrel — matches how
      `yarns-client.ts` is consumed today.
- [x] 1.5 Docs: `docs/historial/deuda-tecnica.md` — file new debt **200** (next free number after
      199, never recycled) at 🟠, Spanish: the yarn photo upload now has its own client
      (`uploads-client.ts`) that duplicates `uploadProjectImage`'s three contract points instead of
      sharing them; migrating `projects-client.ts` to the shared client is the follow-up (design
      D10).
- [x] 1.6 Run `pnpm test -- yarns-client uploads-client`, `pnpm typecheck`, `pnpm lint` and record
      the result.

## Phase 2: S2 `yarn-form-model`

- [x] 2.1 RED: create `src/features/yarns/ui/yarn-form.ts` test file `yarn-form.test.ts` —
      `emptyYarnFormValues()` starts `quantity: "0"` and every other field empty/`null`;
      `yarnFormValuesOf(yarn)` maps a `SerializedYarnListItem` into `YarnFormValues`, including
      `lotInputValue`; `lotInputValue(iso)` returns the **UTC date part** under
      `process.env.TZ = "America/Argentina/Buenos_Aires"` (non-UTC negative offset), asserting
      `"2026-03-05"` for a matching ISO timestamp, and `""` for an unparsable input; `parseDecimal`
      accepts both `"4,5"` and `"4.5"` as `4.5`, and returns `null` for unparsable text;
      `parseCount` accepts a non-negative integer text and rejects negatives/non-integers/blank;
      `applyChange(values, { brandId })` resets `typeId` to `""` when the brand changes;
      `issuesToErrors` maps the needle-range object-level refine (zod path `["recommendedNeedle"]`)
      to `needleMax`, and `["recommendedNeedle","min"|"max"]` to `needleMin`/`needleMax`; Spanish
      copy overrides replace zod 4's English "Invalid input: expected number" message for an
      empty/unparsable numeric, an empty brand/type/colour-family, and an empty `lot`;
      `validateCreate` returns `{ ok: true, payload }` for valid values and `{ ok: false, errors }`
      otherwise; `validateEdit(before, after)` returns `{ ok: true, patch: null }` when nothing
      changed, including `"4,50"` vs `4.5` (parsed-value comparison, not string comparison) and an
      untouched `lot`; `recommendedNeedle` is sent **whole** if either bound changed;
      `firstInvalidField(errors)` returns fields in `YARN_FORM_FIELDS` screen order (Identidad
      fields, then Ficha técnica fields); a create payload's `lot` serialises to
      `"YYYY-MM-DDT00:00:00.000Z"`.
- [x] 2.2 GREEN: `src/features/yarns/ui/yarn-form.ts` — `YARN_FORM_FIELDS`, `YarnFormField`,
      `YarnFormTab`, `TAB_OF_FIELD`, `YarnFormErrors`, `YarnFormValues`, `emptyYarnFormValues`,
      `yarnFormValuesOf`, `lotInputValue`, `applyChange`, `parseDecimal`, `parseCount`,
      `issuesToErrors`, `firstInvalidField`, `validateCreate`, `validateEdit`, internal `yarnPatch`
      helper — per `design.md` Interfaces/Contracts. Imports `createYarnSchema`/`updateYarnSchema`
      from `@/features/yarns/validation` **by internal path** (not the feature barrel, which drags
      Drizzle into the browser).
- [x] 2.3 REFACTOR: confirm `yarn-form.ts` has zero React/DOM imports (pure module, no RTL needed
      to test it) and that `TAB_OF_FIELD` covers every entry in `YARN_FORM_FIELDS`.
- [x] 2.4 Extend `src/features/yarns/ui/yarn-copy.ts` (+ `yarn-copy.test.ts` if it pins copy) — tab
      names («Identidad», «Ficha técnica»), field labels, the Spanish numeric/date/select override
      messages consumed by `issuesToErrors`'s overrides, `DUPLICATE_COLOR_CODE_MESSAGE`'s
      user-facing text (if distinct from the client constant).
- [x] 2.5 Run `pnpm test -- yarn-form yarn-copy`, `pnpm typecheck`, `pnpm lint` and record the
      result.
- [x] 2.6 RED (Amended 2026-09-22, review lineage review-7a5543c9e8b79ca4, finding R3-004): extend
      `yarn-form.test.ts` — `lotInputValue` under `process.env.TZ = "Asia/Tokyo"` (a **positive**
      UTC offset, complementing task 2.1's negative-offset Buenos Aires case) returns the same UTC
      date part for a matching ISO timestamp; a create payload's `lot` also serialises to
      `"YYYY-MM-DDT00:00:00.000Z"` under `TZ=Asia/Tokyo`, matching the UTC/Buenos Aires case — cites
      spec `yarn-create-edit` "No day shift under a non-UTC local time zone" (GIVEN the local time
      zone is offset "either ahead or behind").
- [x] 2.7 GREEN (Amended 2026-09-22, review lineage review-7a5543c9e8b79ca4, finding R3-004): confirm
      `lotInputValue` and the create-payload `lot` serialisation in `yarn-form.ts` stay TZ-agnostic
      (ISO/UTC-string based, never a local-time method) under the added `Asia/Tokyo` case; no
      production change is expected — adjust only if the new test exposes a gap.

## Phase 3: S3 `yarn-technical-controls`

- [x] 3.1 RED (Amended 2026-09-22, review lineage review-7a5543c9e8b79ca4, finding R3-003): create
      `src/features/yarns/ui/ColorFamilyPicker.test.tsx` — renders 13 named `aria-pressed` buttons
      inside a `<fieldset>` whose `<legend>` names the implicit `role="group"`; pressing an
      unselected swatch calls `onValueChange` with that family; pressing the **currently selected**
      swatch calls nothing (no-op, per spec `yarn-create-edit` "Re-activating the selected value is
      a no-op"); the selected family's name renders as visible `aria-hidden` text beside the
      legend; an `error` prop renders a message wired via `aria-describedby` on the fieldset in
      every case; `aria-invalid="true"` lands on the fieldset **if** `vitest-axe` still passes with
      it there — **if axe rejects it on the fieldset, `aria-invalid="true"` lands on each individual
      toggle instead** (never dropped outright, per spec "the control MUST expose that invalid
      state to assistive technology"); the test asserts whichever branch shipped; `axe` clean in
      both branches.
- [x] 3.2 GREEN (Amended 2026-09-22, review lineage review-7a5543c9e8b79ca4, finding R3-003):
      `src/features/yarns/ui/ColorFamilyPicker.tsx` — `fieldset` + `legend`, composed from
      `Toggle`, `Swatch`, `yarnSwatchClass`, `COLOR_FAMILY_LABELS` (D4); accessible invalid-state
      fallback moves `aria-invalid="true"` to each `Toggle` when the fieldset-level attribute fails
      axe, never dropping it. No `"use client"` (presentational, reached only through the client
      shell).
- [x] 3.3 RED: create `src/features/yarns/ui/NeedleRangeField.test.tsx` — `<fieldset>` +
      `<legend>` «Aguja recomendada (mm)» names the group; two labelled `Input inputMode="decimal"`
      fields (Mínimo, Máximo), each rendering its own `minError`/`maxError` independently; typing
      calls `onMinChange`/`onMaxChange` with the raw text; `minRef`/`maxRef` attach to the
      respective inputs; `disabled` propagates to both.
- [x] 3.4 GREEN: `src/features/yarns/ui/NeedleRangeField.tsx` — per `design.md` D6 and the
      `NeedleRangeFieldProps` contract. No `"use client"`.
- [x] 3.5 RED: create `src/features/yarns/ui/YarnTechnicalTab.test.tsx` — every field (`length`,
      `fiber`, needle min/max, `thickness`, `lot`, `quantity`) is controlled by `values`/`onChange`;
      `lot` renders as `<input type="date">`; no control for `usedQuantity` exists anywhere in the
      rendered tab (spec `yarn-create-edit` "`usedQuantity` never appears in the create/edit
      form"); each field's error renders from `errors`; render smoke (SDD-01 §9); `axe` clean. Note
      as a comment if `user-event` fails to drive the `type="date"` input under happy-dom — the
      fallback (`fireEvent.change`) is scoped to that one field only, per `design.md`'s named
      gotcha.
- [x] 3.6 GREEN: `src/features/yarns/ui/YarnTechnicalTab.tsx` — controlled, presentational,
      composes `NeedleRangeField` and the numeric/date inputs per the `YarnTabProps` +
      `YarnTechnicalTab`-specific refs contract (`design.md` Interfaces/Contracts). No
      `"use client"`.
- [x] 3.7 `src/features/yarns/ui/yarns-ui.classes.test.ts` — add `ColorFamilyPicker.tsx`,
      `NeedleRangeField.tsx`, `YarnTechnicalTab.tsx` to the `COMPONENTS` list (the compiled-CSS
      gate is a fixed list; fails without this entry).
- [x] 3.8 Run `pnpm test -- ColorFamilyPicker NeedleRangeField YarnTechnicalTab yarns-ui.classes`,
      `pnpm typecheck`, `pnpm lint` and record the result.

## Phase 4: S4 `yarn-identity-tab`

*(Split point if the diff runs over budget: land `ChooseOrCreateField` — tasks 4.1–4.3 — as its own
PR before `YarnIdentityTab`, per `design.md`'s named split.)*

- [x] 4.1 RED: create `src/features/yarns/ui/ChooseOrCreateField.test.tsx` — `loading` status
      shows a `Skeleton` + named status region; `failed` shows a message + «Reintentar» that calls
      `onRetry`; `ready` shows the `Select` with the given `options`; the visible «Nueva marca» /
      «Nuevo tipo» trigger reveals an inline row (`Field` + `Input` + «Crear» + «Cancelar») below
      the still-mounted select, and focus lands in the inline input; **`Enter` in the inline input
      calls `preventDefault()`, triggers `onCreate`, and does not submit an enclosing `<form>`**
      (wrap the field in a real `<form onSubmit>` in the test to prove this); **`Escape` in the
      inline row calls `stopPropagation()` and closes only the row**, tested inside a `Dialog` to
      prove the modal itself does not close; a failed `onCreate` shows an error in the row without
      closing it; `disabled` propagates to the select and the trigger.
- [x] 4.2 GREEN: `src/features/yarns/ui/ChooseOrCreateField.tsx` — per `design.md` D3 and the
      `ChooseOrCreateFieldProps` contract. The inline row is **not** a nested `<form>` (invalid
      HTML inside the yarn form); «Crear» is `type="button"`. Carries `"use client"` (local
      open/pending/error state and handlers).
- [x] 4.3 `src/features/yarns/ui/yarns-ui.classes.test.ts` — add `ChooseOrCreateField.tsx`.
- [x] 4.4 RED: create `src/features/yarns/ui/YarnIdentityTab.test.tsx` — renders two
      `ChooseOrCreateField`s (brand, type) plus `colorName`, `colorCode`, `ColorFamilyPicker`, and
      a photo control; the type field is `disabled` until a brand is chosen; `onChange` wiring for
      every text field; the photo control's `fileName`/`uploading` props render correctly and
      choosing a file calls the given `onFile`; render smoke (SDD-01 §9).
- [x] 4.5 GREEN: `src/features/yarns/ui/YarnIdentityTab.tsx` — controlled, composes
      `ChooseOrCreateField` ×2, `ColorFamilyPicker`, `colorName`/`colorCode` `Input`s, and the photo
      control, per the `YarnTabProps` + `YarnIdentityTab`-specific props contract (`catalog`,
      `onRetryCatalog`, `onCreateBrand`, `onCreateType`, `photo`, refs for its six fields). Carries
      `"use client"` (owns no state itself but is the client boundary for its interactive
      children per `design.md`'s Client directives note).
- [x] 4.6 `src/features/yarns/ui/yarns-ui.classes.test.ts` — add `YarnIdentityTab.tsx`.
- [x] 4.7 Run `pnpm test -- ChooseOrCreateField YarnIdentityTab yarns-ui.classes`,
      `pnpm typecheck`, `pnpm lint` and record the result.

## Phase 5: S5 `yarn-form-shell-create`

*(**Split applied 2026-09-22 (auto-chain)**: folding review findings R3-001/R3-002 pushed S5 to
≈565 lines, so it ships as two PRs along `design.md`'s named split. **S5a** `yarn-form-shell-create`
(PR5): 5.1, 5.2, 5.5–5.8 — shell, remount, state, tab switch + focus, create submit, 409. **S5b**
`yarn-form-async-inputs` (PR6, base = PR5 branch): 5.3, 5.4, 5.9–5.13 — photo upload and inline
brand/type create, each built **directly** with its per-field monotonic request sequence (the
value-at-request equality check is never implemented, so nothing is built and then replaced).
S6 and S7 become PR7 and PR8.)*

### S5a `yarn-form-shell-create`

- [x] 5.1 RED: create `src/features/yarns/ui/YarnFormDialog.test.tsx`, create-mode scenarios —
      **no target renders nothing** (no dialog in the document); **create target renders an empty
      form** (every field empty/default, `quantity` = `"0"`); the shell mounts `Tabs` with
      `YarnIdentityTab`/`YarnTechnicalTab`, defaulting to «Identidad»; **fill a field on
      Identidad, switch to Ficha técnica and back → the value survives** (spec `yarn-create-edit`
      "Form values survive switching between tabs"); **submit from Identidad with Ficha técnica
      empty → the Ficha técnica tab becomes active and focus lands on the first invalid field
      there** (spec: "Submitting with an invalid field on the inactive tab..."); the inverse case
      (submit from Ficha técnica with an invalid Identidad field) also switches and focuses;
      submitting with the only invalid field already on the active tab focuses it with no tab
      switch; submitting with no colour family chosen is rejected with the error on the
      `ColorFamilyPicker` and its accessible invalid state; a needle max below min is rejected on
      the max field only; `axe` clean on the full dialog.
- [x] 5.2 RED: extend `YarnFormDialog.test.tsx` — **a duplicate-`colorCode` 409 response switches
      to Identidad and shows the message on the `colorCode` field with an accessible invalid
      state, with no page-level alert** (spec: "A duplicate colour code is reported on the
      colour-code field..."); a valid submit calls `createYarn` with the assembled payload and,
      on success, calls `onSaved` with the raw record and closes; `usedQuantity` is absent from
      both rendered tabs.
- [x] 5.5 GREEN: `src/features/yarns/ui/YarnFormDialog.tsx` — shell owning `values`, `errors`,
      `tab`, `catalog`, `uploading`, `fileName`, `formError`, `pending`, `catalogPending`; target/key
      remount contract (`ProjectFormDialog.tsx:104-121` pattern — no target renders `null`, inner
      form keyed `"create"`); `reportErrors(errors)` picking `first = YARN_FORM_FIELDS.find(f =>
      errors[f])`, calling `setTab(TAB_OF_FIELD[first])` and `requestFocus(first)` in the same
      batch via the existing pending-focus tick pattern (`pendingFocusRef`/`focusTick`); refs
      created once per field in the shell and passed down to the tabs; the photo control and the
      inline-create affordances render but their async handlers land in S5b; submit calls `validateCreate`,
      then `createYarn`, mapping a `field: "colorCode"` result through the same `reportErrors`
      path. Create-mode only in this slice (`YarnFormTarget = { mode: "create" }`); the `edit` arm
      is added in S7. Carries `"use client"`.
- [x] 5.6 REFACTOR: confirm the shell never lets a tab component hold state that must survive a
      switch (spot-check `YarnIdentityTab`/`YarnTechnicalTab` for any local `useState` beyond the
      `ChooseOrCreateField` inline-row UI, which is allowed to be local per `design.md` D3).
- [x] 5.7 `src/features/yarns/ui/yarns-ui.classes.test.ts` — add `YarnFormDialog.tsx`.
- [x] 5.8 Run `pnpm test -- YarnFormDialog yarns-ui.classes`, `pnpm typecheck`, `pnpm lint` and
      record the result.
### S5b `yarn-form-async-inputs`

- [ ] 5.3 RED: extend `YarnFormDialog.test.tsx` — choosing a file triggers `uploadImage`
      immediately (before any submit) and the pre-check via `uploadImageInputSchema` blocks a bad
      file **without calling `fetch`**; submit is disabled while the upload is in flight; a failed
      upload shows an error on the photo control without blocking the rest of the form.
- [ ] 5.4 RED: extend `YarnFormDialog.test.tsx` — an inline brand create selects the new brand and
      calls `onCatalogChange` exactly once; **a late brand-create response that resolves after the
      user picked a different brand does not override that newer selection** (spec: "A late
      response from an inline creation does not override a newer selection" — value-at-request
      guarded by the per-field monotonic request sequence of the D3 R3-001 amendment); the same guard for an inline
      type create, scoped to `(brandId, typeId)`; choosing a different brand resets the selected
      type; submit is disabled while any inline create is pending (`catalogPending > 0`).
- [ ] 5.9 RED (Amended 2026-09-22, review lineage review-7a5543c9e8b79ca4, finding R3-001): extend
      `YarnFormDialog.test.tsx` — an **A→B→A** brand sequence (select brand A, start an inline
      create while a different value is briefly selected, then reselect A — including back to the
      empty placeholder — before the stale create resolves) does **not** let the late response
      override the current selection; **two overlapping inline creates** started from the same
      starting brand value, resolving out of order, leave the **later-started** create's outcome as
      the final selection, not whichever resolves first; the same two cases for type creates,
      scoped to `(brandId, typeId)` — cites spec `yarn-create-edit` "A late response from an inline
      creation does not override a newer selection".
- [ ] 5.10 GREEN (Amended 2026-09-22, review lineage review-7a5543c9e8b79ca4, finding R3-001):
      `src/features/yarns/ui/YarnFormDialog.tsx` — replace the value-at-request equality check with
      a per-field monotonic request sequence (`brandRequestSeq`/`typeRequestSeq` counter refs,
      incremented on every selection change and on every create start); `createBrandInline`/
      `createTypeInline` capture their sequence number at request start and apply the result only
      if it still matches the current counter on resolve; `onCatalogChange` still always fires on
      `ok`, independent of the sequence check (design.md D3 amendment).
- [ ] 5.11 RED (Amended 2026-09-22, review lineage review-7a5543c9e8b79ca4, finding R3-002): extend
      `YarnFormDialog.test.tsx` — choosing a file, then choosing a **different** file before the
      first upload resolves, ends with `uploading`/`fileName`/`values.image` reflecting only the
      **second** file once both requests settle, regardless of resolution order; choosing a file and
      pressing «quitar foto» before the upload resolves ends with no image/fileName and `uploading`
      false even after the late response arrives — cites spec `yarn-create-edit` "A photo uploads as
      soon as it is chosen, not deferred to submit" (submit-disabled-while-uploading scenario) and
      the D10 amendment's overlapping-upload guard.
- [ ] 5.12 GREEN (Amended 2026-09-22, review lineage review-7a5543c9e8b79ca4, finding R3-002):
      `src/features/yarns/ui/YarnFormDialog.tsx` — upload wiring via `uploadImage` from `@/features/uploads/ui/uploads-client` (tasks 5.3 and 5.11) with an `uploadRequestSeq` counter ref,
      incremented on every file choice and on «quitar foto»; each `uploadImage` call captures its
      sequence number at request start and applies its result (`uploading`, `fileName`,
      `values.image`) only if that number still matches the current counter on resolve; the file
      input stays disabled while `uploading` as a first line of defence (design.md D10 amendment).
- [ ] 5.13 Run `pnpm test -- YarnFormDialog yarns-ui.classes`, `pnpm typecheck`, `pnpm lint` and
      record the result.

## Phase 6: S6 `yarn-create-wiring` (settles debt 193, filtered-empty state)

- [ ] 6.1 RED: extend `src/features/yarns/ui/YarnCatalogPanel.test.tsx` — bumping a new
      `refreshToken` prop refetches the catalogue; the panel's **own** create does **not** trigger
      an extra refetch from `refreshToken` (spec `yarn-catalog-management`: "No external signal,
      no extra fetch").
- [ ] 6.2 GREEN: `src/features/yarns/ui/YarnCatalogPanel.tsx` — add `refreshToken?: number`
      (default `0`) to the fetch effect's dependency array `[retryToken, refreshToken]` (D3
      correction; additive, ~3 lines, no token-ref migration).
- [ ] 6.3 RED: extend `src/features/yarns/ui/YarnFilterPanel.test.tsx` — a `catalogPanelToken`
      prop is forwarded to `YarnCatalogPanel`'s `refreshToken`.
- [ ] 6.4 GREEN: `src/features/yarns/ui/YarnFilterPanel.tsx` — thread `catalogPanelToken` →
      `YarnCatalogPanel`'s `refreshToken`.
- [ ] 6.5 RED: extend `src/features/yarns/ui/YarnsView.test.tsx` — an authenticated user with **no**
      yarns and **no** filter active sees «Sin lanas en el stash todavía» with «Agregar lana» in
      the `EmptyState`'s own action slot, and the page header shows no create action (spec
      `yarn-inventory-browsing`: "Empty state offers a create action"); a user with at least one
      yarn sees «Agregar lana» in the page header and the empty state is not rendered ("Header
      offers the create action when the list is non-empty"); with yarns present and a brand/type/
      colour-family filter active that matches nothing, the page shows the no-matches copy (never
      "Sin lanas en el stash todavía"), offers «Quitar filtros», and «Agregar lana» stays in the
      header ("Filters with no results do not claim the stash is empty"); activating «Quitar
      filtros» calls `setFilters({})`, clears the filter controls' visible selection, and
      re-reads the list without filters ("«Quitar filtros» restores the full list"); across the
      stash-empty, no-matches, and non-empty states, exactly one «Agregar lana» control exists in
      the document, never zero and never two ("The create action never appears in both places at
      once").
- [ ] 6.6 RED: extend `YarnsView.test.tsx` — activating header/empty-state «Agregar lana» opens
      `YarnFormDialog` with a create target; a successful create bumps `reloadToken` and the list
      is re-fetched (spec `yarn-create-edit`: "A successful create adds the new yarn to the
      list"); a successful inline create from the form calls `handleFormCatalogChange`, which
      bumps both `catalogToken` (tree) and `catalogPanelToken` (panel) — **not** the same counter,
      so the panel's own creates are not forced to refetch themselves.
- [ ] 6.7 GREEN: `src/features/yarns/ui/YarnsView.tsx` — `formRequest` state
      (`{mode:"create"} | {mode:"edit", id} | null` — create arm only in this slice),
      `toFormTarget(formRequest, yarns)`, mount `YarnFormDialog`; header row (a `div`, not
      `<header>`) showing «Agregar lana» unless the stash-empty state is shown; a distinct
      no-matches `EmptyState` (title/description from `yarn-copy.ts`, mirroring
      `ProjectsView`'s `NO_FILTER_MATCHES_TITLE`/`CLEAR_FILTERS_LABEL`) rendered when the list is
      empty **and** any of `filters.brandId`/`filters.typeId`/`filters.colorFamily` is set, with
      its action calling `setFilters({})`; `handleSaved` clears `formRequest` and bumps
      `reloadToken`; `handleFormCatalogChange` calls the existing `handleCatalogChange()` and also
      bumps `catalogPanelToken`.
- [ ] 6.8 `src/features/yarns/ui/yarns-ui.classes.test.ts` — confirm no new component needs an
      entry here (YarnsView is already listed) — verification-only task.
- [ ] 6.9 Docs: `docs/design/rfc/RFC-04-lanas.md` — add `## 7-quater. Enmienda E3` (between §7-ter
      and §8), Spanish, matching E1/E2's format, recording **E3(a)** (state lives in the shell, tab
      switch on the first invalid field, D2), **E3(b)** (brand/type inline create in the form, never
      a dialog inside the dialog, and the value-at-request late-response guard, D3), **E3(c)**
      (`ColorFamilyPicker` is a new required control, distinct from the optional filter, D4),
      **E3(d)** (`lot` as `Input type="date"`, D5), **E3(e)** («Agregar lana» in the header when the
      stash has yarns, in the empty state otherwise, plus the filtered no-matches state with
      «Quitar filtros», D9 and its amendment).
- [ ] 6.10 Docs: `docs/historial/deuda-tecnica.md` — strike debt **193** with `~~…~~`, add **Cómo
      se saldó** / **Dónde quedó la prueba** underneath (Spanish, cite `YarnsView.tsx` + the RTL
      test asserting the empty-state action and reload). File new debt **201** (next free number
      after 200) at 🟠, Spanish: the yarn form's brand-tree fetch (`getBrandTree` inside
      `YarnIdentityTab`) is now the **fourth** 1+N brand-tree read alongside the filter tree, the
      catalogue panel, and — per D3's deferred extraction — the shared `useLatestRequest`
      consolidation stays open too; accepted, `getBrandTree` keeps one request shape, consolidation
      is the follow-up. Leave debt 199 untouched (settled in S7).
- [ ] 6.11 Run `pnpm test -- YarnsView YarnCatalogPanel YarnFilterPanel yarns-ui.classes`,
      `pnpm typecheck`, `pnpm lint`, `pnpm build` and record the result.
- [ ] 6.12 Browser verification (REGLA 4): orchestrator opens `/lanas` from an empty stash, presses
      «Agregar lana», fills both tabs (including the `lot` date input — checks the picker glyph,
      popup, and focus ring on the modal's light `bg-surface-raised` surface per D5), saves, and
      confirms the card appears; applies a filter that matches nothing and confirms the no-matches
      copy and «Quitar filtros»; confirms the create action never appears twice; checks the modal
      at mobile width via the iframe technique. No gate measures this axis.

## Phase 7: S7 `yarn-edit` (settles debt 199)

- [ ] 7.1 RED: extend `YarnFormDialog.test.tsx`, edit-mode scenarios — **an edit target renders a
      form pre-filled with that yarn's current values**, including `lot` shown as the same
      calendar date it was saved with, unshifted (spec `yarn-create-edit`: "Edit target renders a
      pre-filled form"); **opening a second yarn in edit mode discards the first**'s unsaved
      changes (spec: "Opening a second yarn in edit mode discards the first"); **submitting an
      unchanged edit form closes the modal and issues no network request** (spec: "Submitting an
      unchanged edit form issues no request"); **editing exactly one field sends a request
      containing only that field** (spec: "Editing one field sends only that field");
      `recommendedNeedle` is sent whole when either bound changed, not split; a `"4,50"` re-entry
      of an unchanged `4.5` value produces no patch for that field.
- [ ] 7.2 RED: extend `YarnFormDialog.test.tsx` — a **non-UTC** `TZ` environment renders the
      prefilled `lot` as the same calendar date the create test saved (spec: "No day shift under a
      non-UTC local time zone"); a brand change in edit mode resets the type and, on save, PATCHes
      both `brandId` and `typeId`.
- [ ] 7.3 GREEN: `src/features/yarns/ui/YarnFormDialog.tsx` — add the `edit` arm to
      `YarnFormTarget` (`{ mode: "edit"; yarn: SerializedYarnListItem }`); prefill via
      `yarnFormValuesOf`; submit path calls `validateEdit(before, after)`; a `patch: null` result
      closes without calling `updateYarn`; otherwise calls `updateYarn(id, patch)`, mapping a
      `field: "colorCode"` 409 through the same `reportErrors` path as create.
- [ ] 7.4 RED: extend `src/features/yarns/ui/YarnDetailDrawer.test.tsx` — «Editar» renders with
      `variant="primary"` (spec `yarn-detail-editing`: drops the previous `secondary`); activating
      it via keyboard (`Tab` then `Enter`/`Space`) or click opens the yarn create/edit modal in
      edit mode, pre-filled with the drawer's yarn, and the drawer itself stays open and unaffected.
- [ ] 7.5 GREEN: `src/features/yarns/ui/YarnDetailDrawer.tsx` — «Editar» becomes
      `variant="primary"`, calls `onEdit` (new prop) instead of the documented no-op.
- [ ] 7.6 RED: extend `YarnsView.test.tsx` — the drawer's «Editar» sets
      `formRequest = { mode: "edit", id }`, opening `YarnFormDialog` **stacked over** the open
      drawer (both are portals; `Escape` on the form stops propagation and closes only the form;
      closing the form returns focus to «Editar»); **an edit that changes the brand updates the
      reloaded card's «marca · tipo»** (spec `yarn-create-edit`: "An edit that changes the brand
      updates the displayed name" — via reload, not `mergeYarnPatch`, per D8); **an edit that no
      longer matches the active filters is dropped from the visible list after reload**; **the open
      drawer for the edited yarn reflects the updated values once the reload completes** (resolved
      by id against the live list, `YarnsView.tsx:93-96` pattern — no skeleton flash while the new
      key loads).
- [ ] 7.7 GREEN: `src/features/yarns/ui/YarnsView.tsx` — `toFormTarget` resolves the `edit` arm by
      looking up `formRequest.id` in the current `yarns` list; wire `YarnDetailDrawer`'s `onEdit` to
      set `formRequest`.
- [ ] 7.8 Docs: `docs/design/rfc/RFC-04-lanas.md` §7-quater — append **E3(f)** (reload-after-save,
      never merge, D8) and **E3(g)** (stacked modal over the open drawer for edit), Spanish,
      completing the amendment started in S6.
- [ ] 7.9 Docs: `docs/historial/deuda-tecnica.md` — strike debt **199** with `~~…~~`, add **Cómo se
      saldó** / **Dónde quedó la prueba** underneath (Spanish, cite `YarnDetailDrawer.tsx` +
      `YarnsView.tsx` + the RTL test asserting the modal opens pre-filled and the card/drawer update
      after save). Confirm debt 193 stays untouched by this slice (verification-only, already
      struck in S6).
- [ ] 7.10 Run `pnpm test -- YarnFormDialog YarnDetailDrawer YarnsView`, `pnpm typecheck`,
      `pnpm lint`, `pnpm build`, then the full `pnpm test` suite once, and record the result.
- [ ] 7.11 Browser verification (REGLA 4): orchestrator opens a yarn's drawer on `/lanas`, presses
      «Editar» (now `primary`), confirms the modal opens stacked over the drawer pre-filled, that
      `Escape` closes only the modal (drawer stays open), that submitting unchanged closes with no
      network request (Network tab), and that changing the brand updates both the card's
      «marca · tipo» and the still-open drawer after save. No gate measures this axis.
