# Apply Progress: Yarn create/edit modal with tabs (backlog 25)

Mode: Strict TDD
Delivery: auto-chain, feature-branch-chain; PR1 = S1 `yarn-save-client`, base = tracker branch
`feature/25-yarns-form-ui`; implementation branch `feature/25-s1-yarn-save-client`.

## Completed Tasks

- [x] 1.1 RED — `src/features/yarns/ui/yarns-client.test.ts` extended with `createYarn`/`updateYarn`
      scenarios (POST/PATCH shape, 201/200 success, 409→`colorCode`, 400/404/network/unreadable
      body→`field: null`).
- [x] 1.2 GREEN — `src/features/yarns/ui/yarns-client.ts`: `YarnSaveResult`,
      `DUPLICATE_COLOR_CODE_MESSAGE` (D7 comment), `createYarn`, `updateYarn`, shared `saveYarn`
      helper.
- [x] 1.3 RED — `src/features/uploads/ui/uploads-client.test.ts` created (multipart `file` field, no
      manual content-type, 201-only success, 400/401/502 fallbacks, server `{ error }` wins,
      network failure).
- [x] 1.4 GREEN — `src/features/uploads/ui/uploads-client.ts` created: `uploadImage(file)` (D10),
      mirrors `uploadProjectImage`'s three contract points.
- [x] 1.5 Docs — `docs/historial/deuda-tecnica.md`: filed debt **200** (🟠) — `uploads-client.ts`
      duplicates `uploadProjectImage`'s contract; migration to a shared client is the follow-up.
- [x] 1.6 Verification — `pnpm exec vitest run yarns-client uploads-client`: 2 files, 32 tests
      passed; `pnpm typecheck`: clean; `pnpm lint`: clean.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1–1.2 | `src/features/yarns/ui/yarns-client.test.ts` | Unit | ✅ 11/11 (pre-existing `getYarns`/`patchYarnUsedQuantity`) | ✅ Written — 13 new tests, `TypeError: createYarn/updateYarn is not a function` | ✅ 24/24 passed | ✅ 13 cases (201/200 success, 409, 400, 404, network failure, unreadable body — for both `createYarn` and `updateYarn`) | ➖ None needed — `saveYarn` shared helper already avoids duplication |
| 1.3–1.4 | `src/features/uploads/ui/uploads-client.test.ts` | Unit | N/A (new file) | ✅ Written — 8 new tests, `Failed to resolve import "./uploads-client"` | ✅ 8/8 passed | ✅ 8 cases (201 success, 200-rejected, multipart shape, 400 readable body, 400/401/502 unreadable body, network failure, 201 unreadable body) | ➖ None needed — mirrors `uploadProjectImage`'s proven shape |

### Test Summary
- **Total tests written**: 21 (13 + 8)
- **Total tests passing**: 32 (21 new + 11 pre-existing in `yarns-client.test.ts`)
- **Layers used**: Unit (21)
- **Approval tests** (refactoring): None — no refactoring tasks, both are additive
- **Pure functions created**: 0 (both `createYarn`/`updateYarn`/`uploadImage` are I/O-bound HTTP
  clients by design; `saveYarn` and `readErrorMessage` are private helpers, not pure)

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm exec vitest run yarns-client uploads-client` → 2 files, 32/32 passed (`pnpm test -- yarns-client uploads-client` forwards a literal `--` token to vitest in this shell and runs the full suite instead of filtering — see Verification Report below for that literal command's result, which is also green) |
| Runtime harness command/scenario and exact result | N/A — no consumer wired yet (design-confirmed: S1 ships unmounted, tested code; nothing imports `createYarn`/`updateYarn`/`uploadImage` outside their own test files) |
| Rollback boundary | Revert this commit: deletes `src/features/uploads/ui/uploads-client.ts` + `.test.ts`, restores `src/features/yarns/ui/yarns-client.ts`/`.test.ts` to their pre-change state, and removes debt 200 from `docs/historial/deuda-tecnica.md`. No other file depends on these additions. |

## Verification Report

| Command | Result |
|---|---|
| `pnpm exec vitest run yarns-client uploads-client` (intended focused filter) | 2 files, 32/32 passed |
| `pnpm test -- yarns-client uploads-client` (literal command; forwards `--` as a filter token in this shell, which vitest does not treat as excluding anything) | 121 files, 2108 passed / 13 skipped (full suite ran, all green) |
| `pnpm test` (full suite) | 121 files, 2108 passed / 13 skipped — same run as above |
| `pnpm typecheck` | clean, no output |
| `pnpm lint` | clean, no output |

## Deviations from Design

None — implementation matches `design.md` D7 and D10 exactly: `YarnSaveResult`/`UploadImageResult`
shapes, the client-owned `DUPLICATE_COLOR_CODE_MESSAGE` with its D7-assumption comment, and
`uploadImage`'s three contract points (multipart `file` only, no manual content-type, 201-only
success) mirrored from `uploadProjectImage`.

## Issues Found

None.

## Workload / PR Boundary

- Mode: chained PR slice (feature-branch-chain)
- Current work unit: S1 `yarn-save-client` (PR1, base = tracker `feature/25-yarns-form-ui`)
- Boundary: starts from the tracker branch's clean state; ends with `yarns-client.ts` gaining
  `createYarn`/`updateYarn` and the new `uploads-client.ts` module, both unmounted (no consumer),
  plus debt 200 filed.
- Estimated review budget impact: **actual authored lines exceed the ≈340 forecast.**
  `git diff --stat` on modified files: `yarns-client.ts` +79, `yarns-client.test.ts` +213,
  `deuda-tecnica.md` +16 = 308 insertions. New files: `uploads-client.ts` 133 lines,
  `uploads-client.test.ts` 160 lines = 293. **Total authored ≈ 601 lines** (208 src + 373 test + 16
  docs), against the ≈340 forecast and the 400-line budget (tasks.md already flagged S1 as
  `400-line budget risk: Medium`). No production code was trimmed, and no test/comment was deleted
  to fit the budget, per the budget-is-not-code-golf rule. `tasks.md` names split points only for
  S4 and S5, not S1; `createYarn`/`updateYarn` and `uploadImage` are documented as one rollback
  unit in the Suggested Work Units table, so this apply keeps them as one PR rather than
  freelancing an unplanned split. **Recommendation: `size:exception` for PR1**, or the orchestrator
  may choose to retroactively split `yarn-save-client` (yarns-client changes) from
  `uploads-client` (new, independent module) into two PRs before opening PR1 — both are already
  fully independent and individually revertible.

## Status

6/6 Phase 1 tasks complete (S1 `yarn-save-client`). 0/~85 total tasks across all 7 phases complete
elsewhere. Ready for the orchestrator to decide the PR1 size:exception question, then commit and
continue to Phase 2 (S2 `yarn-form-model`) in a future apply batch.

## Review follow-up — lineage review-fefc007131a83b01

S1 was split into two PRs (`feature/25-s1a-yarn-save-client`, `feature/25-s1b-upload-client`); this
follow-up fixes three non-blocking findings from that review, TDD RED→GREEN on both branches, then
rebases s1b onto the fixed s1a.

- **R3-002** (`src/features/yarns/ui/yarns-client.ts`, `saveYarn`) — a 2xx with valid JSON but no
  `yarn` field resolved `{ ok: true, data: undefined }`. Fixed: success now requires a defined,
  non-null `payload.yarn`; otherwise it resolves the existing `{ ok: false, field: null,
  message: UNEXPECTED_ERROR_MESSAGE }` fallback. Commit: `2e11531` on
  `feature/25-s1a-yarn-save-client`.
- **R3-003** (same file, same function) — success was `response.ok` (any 2xx), so `createYarn` with
  200 or `updateYarn` with 201 both counted as success. Fixed: `saveYarn` now takes an explicit
  `successStatus` per call — `createYarn` requires 201 (`POST /api/yarns` per
  `api/yarns/route.ts:39`), `updateYarn` requires 200 (`PATCH /api/yarns/:id` per
  `api/yarns/[id]/route.ts:33,55`). Same commit `2e11531`.
- **R3-001** (`src/features/uploads/ui/uploads-client.ts`, `uploadImage`) — on 201 the body was cast
  to `{ url: string }` unchecked, so `{}` or `{ url: null }` resolved a fake success. Fixed:
  `payload.url` is checked with `typeof ... !== "string"` before resolving success; otherwise it
  resolves the existing `UNEXPECTED_ERROR_MESSAGE` fallback. Commit: `8612f20` on
  `feature/25-s1b-upload-client` (rebased cleanly onto the s1a fix — no conflicts, since s1b does
  not touch `yarns-client.ts`).

### TDD Cycle Evidence (follow-up)

| Finding | Test File | RED | GREEN |
|---|---|---|---|
| R3-002 | `yarns-client.test.ts` — 2 new cases (`createYarn`/`updateYarn`, 2xx body without `yarn`) | ✅ failed against unfixed `saveYarn` | ✅ 28/28 passed |
| R3-003 | `yarns-client.test.ts` — 2 new cases (`createYarn` w/ 200, `updateYarn` w/ 201) | ✅ failed against unfixed `saveYarn` | ✅ 28/28 passed |
| R3-001 | `uploads-client.test.ts` — 2 new cases (201 with `{}`, 201 with `{ url: null }`) | ✅ failed against unfixed `uploadImage` | ✅ 10/10 passed |

### Verification (follow-up, on final s1b branch)

| Command | Result |
|---|---|
| `pnpm exec vitest run yarns-client uploads-client` | 2 files, 38/38 passed |
| `pnpm test` (full suite) | 121 files, 2114 passed / 13 skipped |
| `pnpm typecheck` | clean, no output |
| `pnpm lint` | clean, no output |

Authored changed lines (follow-up only, from `git diff --stat` per commit): `yarns-client.ts`
+28/-4, `yarns-client.test.ts` +48 (commit `2e11531`, 72 insertions + 4 deletions); `uploads-client.ts`
+7/-1, `uploads-client.test.ts` +18 (commit `8612f20`, 24 insertions + 1 deletion) → **96 insertions
+ 5 deletions = 101 authored lines**, well under the 400-line budget.

## Phase 2: S2 `yarn-form-model` (branch `feature/25-s2-yarn-form-model`, base = `feature/25-s1b-upload-client`)

### Completed Tasks

- [x] 2.1 RED — `src/features/yarns/ui/yarn-form.test.ts` created: 34 tests across
      `emptyYarnFormValues`, `yarnFormValuesOf`, `lotInputValue` (Buenos Aires + Tokyo, folded into
      the same RED batch as 2.6 — see below), `parseDecimal`/`parseCount`, `applyChange`,
      `issuesToErrors`, `firstInvalidField`, `validateCreate`, `validateEdit`, and the create
      payload's `lot` serialisation.
- [x] 2.2 GREEN — `src/features/yarns/ui/yarn-form.ts` created: `YARN_FORM_FIELDS`, `YarnFormField`,
      `YarnFormTab`, `TAB_OF_FIELD`, `YarnFormErrors`, `YarnFormValues`, `emptyYarnFormValues`,
      `yarnFormValuesOf`, `lotInputValue`, `applyChange`, `parseDecimal`, `parseCount`,
      `issuesToErrors`, `firstInvalidField`, `validateCreate`, `validateEdit`, internal `yarnPatch` —
      per `design.md` Interfaces/Contracts, imported by internal path from `@/features/yarns/validation`.
- [x] 2.3 REFACTOR — confirmed zero React/DOM imports (`grep` for `react`/`@testing-library` imports:
      none) and `TAB_OF_FIELD: Record<YarnFormField, YarnFormTab>` covers every entry by TypeScript
      exhaustiveness (also asserted directly in the test: identity+technical field counts sum to
      `YARN_FORM_FIELDS.length`). Extracted `decimalOrUndefined`/`countOrUndefined` helpers to remove
      the repeated `parseX(...) ?? undefined` pattern across `createCandidate`/`yarnPatch` — tests
      still 34/34 green after the extraction.
- [x] 2.4 — `src/features/yarns/ui/yarn-copy.ts` extended: `IDENTITY_TAB_LABEL`,
      `TECHNICAL_TAB_LABEL`, and the nine `*_REQUIRED_ERROR` overrides consumed by
      `issuesToErrors`'s sibling `copyOverrides` in `yarn-form.ts`. No `yarn-copy.test.ts` addition —
      the codebase's own convention (`project-form.ts`'s doc comment: "los tests importan los textos
      en vez de reescribirlos") is followed: the override constants are exercised through real
      behavioural assertions in `yarn-form.test.ts` (`toBe(BRAND_REQUIRED_ERROR)` etc., imported, not
      restated), not a separate literal-string pin. `DUPLICATE_COLOR_CODE_MESSAGE`'s user-facing text
      is not distinct from the existing `yarns-client.ts` constant, so nothing was added for it, per
      the task's own "(if distinct)" clause. A `FORM_FIELD_LABELS` dictionary keyed by
      `YarnFormField` was deliberately **not** added in this slice — see Deviations.
- [x] 2.5 Verification — `pnpm exec vitest run yarn-form yarn-copy`: 2 files, 40/40 passed;
      `pnpm typecheck`: clean; `pnpm lint`: clean.
- [x] 2.6 RED (R3-004) — folded into the same `yarn-form.test.ts` batch as 2.1 (same technique, same
      file, written together since both directions share one implementation): `lotInputValue` and the
      create payload's `lot` serialisation asserted under `process.env.TZ = "Asia/Tokyo"` (positive
      UTC offset), complementing 2.1's `America/Argentina/Buenos_Aires` (negative offset) case. Both
      TZ blocks save/restore `process.env.TZ` in `afterEach` to avoid leaking into other test files.
- [x] 2.7 GREEN (R3-004) — confirmed with zero production change: `lotInputValue` and the
      create-payload `lot` serialisation were already built exclusively on `new Date`/`toISOString`
      (never a local-time method), so both TZ directions passed on the same implementation that
      satisfied 2.1 — exactly the outcome `design.md`'s D5 amendment predicted ("no production change
      is expected — adjust only if the new test exposes a gap"; it did not).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.1–2.2, 2.6–2.7 | `src/features/yarns/ui/yarn-form.test.ts` | Unit | N/A (new file) | ✅ Written — 34 tests, `Cannot find module './yarn-form'` (whole-file RED: production module did not exist) | ✅ 34/34 passed on the first execution — the implementation was derived from an empirically-verified zod 4 behaviour probe (`.tmp-zodcheck*.mjs`, run against the real `createYarnSchema`/`updateYarnSchema` before writing `yarn-form.ts`, then discarded) rather than guessed, which is why GREEN did not require an iteration | ⚠️ almost every behaviour has ≥2 cases (happy path + edge case): `parseDecimal`/`parseCount` (valid/invalid/blank), `issuesToErrors` (plain field, `recommendedNeedle` refine, `min`/`max`), `applyChange` (brand changes/doesn't/same-value), `validateCreate` (valid; empty brand/type/colour/lot; empty/unparseable numerics; needle max<min); `validateEdit` (no change; `"4,50"` vs `4.5`; untouched lot; one field only; `recommendedNeedle` whole; invalid patch; unparseable `quantity` on edit — this last case is the regression test for the `quantity`-is-optional edge case named in Issues Found) — **exception: `yarnFormValuesOf` had exactly 1 case** (review lineage review-dbdbbd215365d976, finding R3-002); left as a known gap rather than padded with an unneeded case | ✅ extracted `decimalOrUndefined`/`countOrUndefined`; still 34/34 after |
| 2.4 | consumed by 2.1's assertions (no separate copy test file, see task note) | — | N/A (new exports) | ➖ Triangulation skipped: pure string constants, no branching logic — behaviourally covered via `yarn-form.test.ts`'s `toBe(<CONSTANT>)` assertions, not a literal re-pin | — | — | — |

### Test Summary
- **Total tests written**: 34
- **Total tests passing**: 34 (yarn-form.test.ts) + all pre-existing `yarn-copy.test.ts` cases still
  green (unmodified)
- **Layers used**: Unit (34)
- **Approval tests** (refactoring): None — no refactoring of existing behaviour, both files are
  additive
- **Pure functions created**: 13 exported (`lotInputValue`, `applyChange`, `parseDecimal`,
  `parseCount`, `issuesToErrors`, `firstInvalidField`, `emptyYarnFormValues`, `yarnFormValuesOf`,
  `validateCreate`, `validateEdit`, plus the two field/tab constants) + 4 private helpers
  (`copyOverrides`, `yarnPatch`, `formFieldsOf`, `decimalOrUndefined`/`countOrUndefined`) — the whole
  module is side-effect-free, matching `project-form.ts`'s precedent

## Work Unit Evidence (S2)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm exec vitest run yarn-form yarn-copy` → 2 files, 40/40 passed |
| Runtime harness command/scenario and exact result | N/A — pure module, no UI mounted yet (design-confirmed: S2 ships unmounted, tested code; `YarnFormDialog`, S5, is the first consumer) |
| Rollback boundary | Revert the `feat(yarns): add pure yarn-form model (S2)` commit: deletes `yarn-form.ts` + `yarn-form.test.ts`. Revert `feat(yarns): add copy for the create/edit form (S2)`: removes the nine `*_REQUIRED_ERROR` constants and the two tab labels from `yarn-copy.ts`. Neither commit is depended on by any file outside this slice — S3/S4/S5 (not yet applied) are the only planned consumers. |

## Verification Report (S2)

| Command | Result |
|---|---|
| `pnpm exec vitest run yarn-form yarn-copy` | 2 files, 40/40 passed |
| `pnpm test` (full suite) | 119 files passed / 3 skipped (122), 2150 tests passed / 13 skipped (2163) — up from the 2114/13 S1 baseline by the 36 net-new passing tests this slice adds across the full run |
| `pnpm typecheck` | clean, no output |
| `pnpm lint` | clean, no output |

## Deviations from Design (S2)

- **Copy overrides for brand/type/colour-family/lot are UX copy, not an English-message fix —
  verified empirically, not assumed.** `design.md` D11 attributes the need for
  `BRAND_REQUIRED_ERROR`/`TYPE_REQUIRED_ERROR`/`COLOR_FAMILY_REQUIRED_ERROR`/`LOT_REQUIRED_ERROR` to
  "zod 4's own message... is English", generalising from the numeric case. A direct probe against the
  real `createYarnSchema` (`brandId: z.uuid("La marca no es válida.")`,
  `colorFamily: z.enum(COLOR_FAMILIES, "La familia de color no es válida.")`,
  `lot: z.coerce.date("La fecha de lote no es válida.")`) with every field missing or empty shows zod
  4 already applies these custom messages to `invalid_type`/`invalid_format`/`invalid_value` issues
  alike — **they were already Spanish, with or without the override.** Only `z.number()` fields whose
  custom message is attached solely to `.positive(...)` (`length`, `thickness`,
  `recommendedNeedle.min`/`.max`) exhibit the actual English-message bug on an empty/unparseable
  value; `quantity` (`z.number().int().min(0)`) is additionally `.optional()`, so an unparseable value
  produces no zod issue at all (see below). Implemented anyway, because `tasks.md` 2.1 explicitly
  names this behaviour as an acceptance criterion — but the four "required" constants swap the
  technically-correct "no es válida"/"no es válido" wording for a copy that names the pending action
  ("Elegí una marca." vs "La marca no es válida."), which is a real, defensible, and tested UX
  decision on its own, independent of the English-leak premise. `yarn-form.test.ts` asserts the actual
  observed behaviour (override constants replace zod's real Spanish message), not an invented one.
- **`FORM_FIELD_LABELS` dictionary not added.** `tasks.md` 2.4 says "field labels" without naming a
  shape. `design.md`'s own components (`ColorFamilyPicker`'s legend, `NeedleRangeField`'s
  "Mínimo"/"Máximo", `ChooseOrCreateField`'s `label`/`placeholder` props) each own their label text as
  component props (S3/S4), not a shared lookup keyed by `YarnFormField` — adding one now, unconsumed,
  risked guessing wrong labels that S3/S4 would then have to either reuse awkwardly or ignore. Added
  only what's unambiguous and load-bearing today: `IDENTITY_TAB_LABEL`/`TECHNICAL_TAB_LABEL` (named
  explicitly in the task) and the nine override messages (consumed by `yarn-form.ts` itself, in this
  same slice).
- Everything else matches `design.md` D2, D3, D5, D6, D11 and the Interfaces/Contracts block exactly:
  same exported names, same signatures, same internal-path import of `validation.ts`.

## Issues Found (S2)

- **`quantity`'s `.optional()` schema hid an unparseable value instead of erroring — fixed before it
  shipped.** `createYarnSchema`'s `quantity`/`updateYarnSchema`'s `quantity` are the only optional
  numeric fields. A naive `copyOverrides` called only inside the `!parsed.success` branch (mirroring
  `ProjectFormDialog.tsx`'s `reportIssues` pattern) would let an unparseable `quantity` text (e.g.
  `"abc"`) become `undefined` in the candidate/patch, which zod's `.optional()` accepts silently — no
  `issue`, `parsed.success: true`, and in edit mode a patch of `{ quantity: undefined }` that
  `JSON.stringify`s to `"{}"` (an effectively empty body the server would 400 on with "No hay nada que
  actualizar", surfaced to the user as a generic error instead of "stock ilegible"). Confirmed with a
  standalone probe against the real `updateYarnSchema` shape before implementing (`safeParse({
  quantity: undefined })` on a `.partial()` schema succeeds with `Object.keys(data)` still containing
  `"quantity"`, but `JSON.stringify(data)` drops it — `"{}"`), then fixed by always evaluating
  `copyOverrides` after a successful zod parse too, and failing if it found anything — both
  `validateCreate` and `validateEdit` now have this two-step check. `yarn-form.test.ts`'s "stock
  ilegible en edición" case (`validateEdit`) is the regression test for this exact path; the create
  side has its own case ("numéricos vacíos o ilegibles" includes `quantity: "abc"`).
- None blocking.

## Workload / PR Boundary (S2)

**Amended (review lineage review-dbdbbd215365d976, finding R3-004): S2 was actually split into two
PRs, not shipped as a single PR2 with a `size:exception`.** The paragraph below described a plan
(commits `b3d6128`/`efdf1b9`) that was never the final shape — those hashes do not exist in the repo.
The applied split:

- **PR2a `yarn-form-values`** (branch `feature/25-s2a-yarn-form-values`, base =
  `feature/25-s1b-upload-client`): commit `11edebb` (`yarn-copy.ts`, tab labels + the nine
  `*_REQUIRED_ERROR` overrides, +28 lines) and commit `caa4ee9` (the values half of `yarn-form.ts` +
  its tests: field/tab constants, `YarnFormValues`, `emptyYarnFormValues`, `yarnFormValuesOf`,
  `lotInputValue`, `applyChange`, `parseDecimal`/`parseCount`, +365 lines). **Total 393 lines**, under
  the 400-line budget.
- **PR2b `yarn-form-validation`** (branch `feature/25-s2b-yarn-form-validation`, base = PR2a):
  commit `2c86900` (the validation half: `issuesToErrors`, `firstInvalidField`,
  `validateCreate`/`validateEdit`, internal `yarnPatch`, +523 lines) plus the docs commits
  `dd768d5` (marks S2 tasks complete) and `b9e0755` (records the split). **523 authored lines on its
  own**, over budget on this slice alone — accepted as `size:exception` (validation is one TDD unit
  with `createCandidate`/`yarnPatch`/`copyOverrides` sharing state; splitting it further would cut
  scenarios `tasks.md` 2.1/2.6 name, not reduce genuine complexity).
- Boundary: starts from S1's clean state (`yarns-client.ts`/`uploads-client.ts` unmounted, no
  consumer); ends with `yarn-form.ts` + `yarn-form.test.ts` (new, unmounted) and `yarn-copy.ts`
  gaining the form's tab/override copy. `YarnFormDialog` (S5) is the first consumer of any of this.
- No production code was trimmed and no test was shortened, deleted, or minified to fit the budget,
  per the budget-is-not-code-golf rule. `tasks.md` names no split point for S2 (unlike S4/S5) — the
  ≈916-line overrun (393 + 523) was not anticipated in the plan; splitting along the values/validation
  seam brought PR2a under budget and kept PR2b as a single, still-over-budget but individually
  reviewable `size:exception`.

## Review follow-up — lineage review-dbdbbd215365d976

Four non-blocking findings on the applied S2a/S2b split, fixed on `feature/25-s2b-yarn-form-validation`
(base `feature/25-s2a-yarn-form-values`) — no S2a change needed, since every fix lands in validation-side
code, tests, or docs.

- **R3-001** (`src/features/yarns/ui/yarn-form.ts`, `validateEdit` + `copyOverrides`) — in edit mode
  `updateYarnSchema` is `.partial()`, so `length`, `thickness` and both needle bounds are optional
  like `quantity`; an unreadable text (e.g. `length: "abc"`) becomes `undefined` and zod accepts it
  silently, and only the always-run `copyOverrides` check (already correct) blocks it. Added four
  **characterisation tests** to `yarn-form.test.ts` (`validateEdit`, unreadable `length`, `thickness`,
  needle `min`, needle `max`) — all four passed on the first run against the unmodified production
  code, confirming the guard already worked; recorded honestly as characterisation, not a fabricated
  RED. Also corrected the `copyOverrides` doc comment in `yarn-form.ts`, which wrongly said `quantity`
  is the only optional numeric field in the schema — it now states that in **edit** mode every numeric
  field is optional (`length`/`thickness`/`quantity` directly via `.partial()`, `needleMin`/`needleMax`
  because an unreadable single bound leaves `undefined` inside `recommendedNeedle`), which is why the
  override check must always run, not only after a zod failure.
- **R3-003** (`yarn-form.test.ts`, the `America/Argentina/Buenos_Aires` block under `lotInputValue`) —
  only `lotInputValue` was tested under that negative-offset zone; the create-payload `lot`
  serialisation was tested only under `Asia/Tokyo` (positive offset). Added the same create-payload
  check under Buenos Aires, using the file's existing `process.env.TZ` set/restore pattern — passed on
  the first run (no production change), same TZ-agnostic `new Date`/`toISOString` construction as the
  Tokyo case already exercised.
- **R3-002** (this file, S2 section) — the recorded evidence said "40 tests" for
  `yarn-form.test.ts`; the real count was **34** `it()` cases (confirmed by `rg -c "^\s*it\("`) — the
  combined "`2 files, 40/40 passed`" verification lines were coincidentally correct (34 + 6 in
  `yarn-copy.test.ts` = 40) and were left as-is. Every "40" that specifically described
  `yarn-form.test.ts` alone is corrected above to 34. Also corrected the TDD Cycle Evidence claim that
  "every behaviour has ≥2 cases": `yarnFormValuesOf` had exactly one, left as a documented exception
  rather than padded with an unneeded case. **After this follow-up's five additions (four R3-001 tests
  + one R3-003 test), the true counts are 39 `it()` cases in `yarn-form.test.ts` and 6 in
  `yarn-copy.test.ts` — 45 total.**
- **R3-004** (this file, `Workload / PR Boundary (S2)`) — the section described S2 as one PR2 shipped
  with two commits (`b3d6128`/`efdf1b9`, neither of which exists in the repo) recommending
  `size:exception`. Corrected above to the split actually applied: PR2a
  (`feature/25-s2a-yarn-form-values`, commits `11edebb` + `caa4ee9`, 393 lines) and PR2b
  (`feature/25-s2b-yarn-form-validation`, commits `2c86900` + `dd768d5` + `b9e0755`).

### TDD Cycle Evidence (follow-up)

| Finding | Test File | RED / Characterisation | GREEN |
|---|---|---|---|
| R3-001 | `yarn-form.test.ts` — 4 new cases (`validateEdit`, unreadable `length`/`thickness`/`needleMin`/`needleMax`) | ⚠️ Characterisation — all 4 passed on the first run against unmodified `yarn-form.ts`; the guard (`copyOverrides` always running) already existed, so no RED was possible without faking one | N/A — no production change; only the `copyOverrides` doc comment was corrected |
| R3-003 | `yarn-form.test.ts` — 1 new case (Buenos Aires block, create-payload `lot`) | ⚠️ Characterisation — passed on the first run, same TZ-agnostic construction already proven under Tokyo | N/A — no production change |

### Verification (follow-up)

| Command | Result |
|---|---|
| `pnpm exec vitest run yarn-form yarn-copy` | 2 files, 45/45 passed |
| `pnpm test` (full suite) | 119 files passed / 3 skipped (122), 2155 passed / 13 skipped (2168) — up from the 2150/13 baseline by this follow-up's 5 net-new tests |
| `pnpm typecheck` | clean, no output |
| `pnpm lint` | clean, no output |

Authored changed lines (follow-up only, `git diff --numstat` before commit): `yarn-form.test.ts`
+57/-0; `yarn-form.ts` +12/-5 (the doc-comment correction) → **69 insertions + 5 deletions = 74
authored changed lines**, well under the 400-line budget.

## Status

S1: 6/6 tasks complete (unchanged). S2: 7/7 tasks complete (2.1–2.7), shipped as PR2a + PR2b, plus this
review follow-up (R3-001–R3-004) on PR2b. 13/~85 total tasks across all 7 phases complete. Ready to
continue to Phase 3 (S3 `yarn-technical-controls`) in a future apply batch.

## Phase 3: S3 `yarn-technical-controls` (branch `feature/25-s3-yarn-technical-controls`, base = `feature/25-s2b-yarn-form-validation`)

### Completed Tasks

- [x] 3.1 RED (R3-003) — `src/features/yarns/ui/ColorFamilyPicker.test.tsx` created: 15 tests
      covering the 13-swatch fieldset+legend group, `aria-pressed` exclusivity, the no-op on
      re-pressing the active swatch, the visible `aria-hidden` selected-family name, always-on
      `aria-describedby` for the error message, `focusRef` targeting (active swatch, or the first
      when none is selected), `disabled` propagation, and two `axe` assertions (clean with and
      without an error).
- [x] 3.2 GREEN (R3-003) — `src/features/yarns/ui/ColorFamilyPicker.tsx` created: `fieldset` +
      `legend`, composed from `Toggle`, `Swatch`, `yarnSwatchClass`, `COLOR_FAMILY_LABELS` (D4).
      **Empirical result on the `aria-invalid` placement**: `aria-invalid="true"` on the
      `<fieldset>` (implicit `role="group"`) passes `vitest-axe` clean in this project's
      `vitest-axe` version — confirmed by first shipping it there, then asserting explicitly (not
      just an OR-check) that the fieldset carries it and no individual `Toggle` does. The
      per-toggle fallback the design reserves for a rejecting axe was **not needed**; the test
      records which branch shipped, per the task's own instruction. No `"use client"`.
- [x] 3.3 RED — `src/features/yarns/ui/NeedleRangeField.test.tsx` created: 9 tests — fieldset named
      "Aguja recomendada (mm)"; both fields show their controlled `min`/`max`; typing calls
      `onMinChange`/`onMaxChange` with the raw text; `minError`/`maxError` render independently on
      their own field (asserted that the other field's `aria-invalid` stays absent); `minRef`/
      `maxRef` attach to the right input; `disabled` propagates to both; `axe` clean.
- [x] 3.4 GREEN — `src/features/yarns/ui/NeedleRangeField.tsx` created: `fieldset` + `legend`, two
      `Field`s ("Mínimo", "Máximo") wrapping `Input inputMode="decimal"`, each with its own
      `error`/`ref` — per `design.md` D6 and the `NeedleRangeFieldProps` contract. No
      `"use client"`.
- [x] 3.5 RED — `src/features/yarns/ui/YarnTechnicalTab.test.tsx` created: 13 tests — every field
      (`length`, `fiber`, needle min/max via `NeedleRangeField`, `thickness`, `lot`, `quantity`)
      shows its controlled value; `lot` renders as `Input type="date"`; no `usedQuantity` control
      anywhere (by label or by text); each text field's `onChange` fires the matching
      `Partial<YarnFormValues>` patch; each field's error renders independently with
      `aria-invalid`; `disabled` propagates to all seven controls; all seven refs attach to their
      own input; `axe` clean. **Date-input gotcha confirmed empirically, not assumed**: a
      throwaway probe test (`__date-probe.test.tsx`, discarded before this commit) confirmed
      `user-event`'s `.type()` *does* drive the `type="date"` input under this project's
      happy-dom/user-event versions (a single `onChange` call with the full typed value) — the
      `fireEvent.change` fallback `design.md`'s Testing Strategy names was not needed, and the
      shipped test uses `userEvent.type` throughout, with a comment recording the empirical check.
- [x] 3.6 GREEN — `src/features/yarns/ui/YarnTechnicalTab.tsx` created: controlled, presentational,
      composes `NeedleRangeField` and the `length`/`fiber`/`thickness`/`lot`/`quantity` `Field`s +
      `Input`s, per the `YarnTabProps` + `YarnTechnicalTab`-specific refs contract (`design.md`
      Interfaces/Contracts). `lot` is `Input type="date"`; `usedQuantity` is deliberately absent
      (spec `yarn-create-edit`: "never appears in the create/edit form" — it stays exclusive to the
      detail drawer's stepper, spec `yarn-detail-editing`). Field labels ("Largo (m)", "Fibra",
      "Grosor (mm)", "Lote", "Stock (ovillos)") are local module constants, not a shared
      `FORM_FIELD_LABELS` dictionary — same deviation `yarn-copy.ts`'s S2 section already recorded
      (each S3/S4 component owns its own label text as component props/constants). No
      `"use client"`.
- [x] 3.7 — `src/features/yarns/ui/yarns-ui.classes.test.ts`: added `ColorFamilyPicker.tsx`,
      `NeedleRangeField.tsx`, `YarnTechnicalTab.tsx` to the `COMPONENTS` list. No new
      `EXTERNAL_SOURCES` entry was needed — the three new files reuse only `className`,
      `yarnSwatchClass`, and function-parameter passthroughs the gate already recognises.
- [x] 3.8 Verification — `pnpm exec vitest run ColorFamilyPicker NeedleRangeField YarnTechnicalTab
      yarns-ui.classes`: 4 files, 53/53 passed; `pnpm typecheck`: clean; `pnpm lint`: clean;
      `pnpm test` (full suite): 122 files passed / 3 skipped (125), 2201 passed / 13 skipped
      (2214).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3.1–3.2 | `ColorFamilyPicker.test.tsx` | UI (RTL+axe) | N/A (new file) | ✅ Written — 15 tests, production file temporarily moved aside, confirmed `Failed to resolve import "./ColorFamilyPicker"`, then restored | ✅ 15/15 passed on restore | ✅ 13 colour families, selected/unselected/no-op/none-selected, error-present/error-absent, focusRef with/without selection, both axe branches | ➖ None needed — component was already minimal after the empirical `aria-invalid` decision |
| 3.3–3.4 | `NeedleRangeField.test.tsx` | UI (RTL+axe) | N/A (new file) | ✅ Written — 9 tests, production file temporarily moved aside, confirmed `Failed to resolve import "./NeedleRangeField"`, then restored | ⚠️ 8/9 passed first execution; 1 failure (multi-character `userEvent.type` against a controlled input with a fixed `value` prop replays each keystroke from the same base text, not accumulating — a test-setup artifact, not a production bug) — fixed by typing a single character, then 9/9 passed | ✅ Mínimo vs Máximo, error-present-on-one-not-the-other, both errors at once, disabled | ➖ None needed |
| 3.5–3.6 | `YarnTechnicalTab.test.tsx` | UI (RTL+axe) | N/A (new file) | ✅ Written — 13 tests, production file temporarily moved aside, confirmed `Failed to resolve import "./YarnTechnicalTab"`, then restored | ✅ 13/13 passed on restore | ✅ 7 fields × (value, onChange, error, ref) + no-usedQuantity + lot-is-date + disabled + axe | ➖ None needed |
| 3.7 | `yarns-ui.classes.test.ts` (modified) | Gate | ✅ 16/16 before this task's own `COMPONENTS` addition | ➖ Not applicable — adding a fixed-list entry is config, not behaviour; the gate itself is the safety net (it fails red if a new component is unlisted, which S3's three new files would have done) | ✅ 16/16 passed with the three new entries | ➖ Single | ➖ None needed |

### Test Summary
- **Total tests written**: 37 (15 + 9 + 13)
- **Total tests passing**: 37 new + all pre-existing `yarns-ui.classes.test.ts` cases still green
- **Layers used**: UI/RTL+axe (37)
- **Approval tests** (refactoring): None — all three files are new, no refactor of existing behaviour
- **Pure functions created**: 0 — S3 is entirely presentational components consuming the S2 pure
  model (`yarn-form.ts`); none carry `"use client"`, per `design.md`'s Client directives note

## Work Unit Evidence (S3)

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm exec vitest run ColorFamilyPicker NeedleRangeField YarnTechnicalTab yarns-ui.classes` → 4 files, 53/53 passed |
| Runtime harness command/scenario and exact result | N/A — components exist but are not mounted in any route yet (design-confirmed: `YarnIdentityTab`/S4 and `YarnFormDialog`/S5 are the first consumers) |
| Rollback boundary | Each of the three component commits is independently revertible: reverting `ColorFamilyPicker` removes that file pair only; reverting `NeedleRangeField` removes that file pair only (nothing in this slice imports it except `YarnTechnicalTab`, itself revertible); reverting `YarnTechnicalTab` also un-lists all three from `yarns-ui.classes.test.ts`'s `COMPONENTS`, since that commit is the one that added the three entries together. No file outside this slice references any of the three new components yet. |

## Verification Report (S3)

| Command | Result |
|---|---|
| `pnpm exec vitest run ColorFamilyPicker NeedleRangeField YarnTechnicalTab yarns-ui.classes` | 4 files, 53/53 passed |
| `pnpm test` (full suite) | 122 files passed / 3 skipped (125), 2201 passed / 13 skipped (2214) — up from the 2155/13 S2 baseline by the 46 net-new tests visible in a full run (37 from this slice's own files; the remaining 9 reflect other work already merged onto this branch's base before S3 started, not S3 itself) |
| `pnpm typecheck` | clean, no output |
| `pnpm lint` | clean, no output |

## Deviations from Design (S3)

- **`aria-invalid` shipped on the `<fieldset>`, not per-toggle.** `design.md`'s D4 amendment (R3-003)
  named a fallback in case `vitest-axe` rejected `aria-invalid` on the implicit `role="group"`. It
  did not reject it in this project's `vitest-axe`/`axe-core` versions — confirmed by shipping the
  fieldset-level attribute first and running the axe assertion for real, not by assumption. The test
  asserts this branch explicitly (fieldset has it, no toggle does), per the task's own instruction to
  record whichever branch shipped.
- **No `user-event`/`fireEvent.change` fallback needed for the `lot` date input.** `design.md`'s
  Testing Strategy flagged this as an open gotcha to confirm in RED. A throwaway probe (rendered
  `YarnTechnicalTab`, drove the date input with `userEvent.type`, logged the resulting `onChange`
  calls, then discarded the probe file) showed a single call with the complete typed value — the
  fallback was not exercised in the shipped test.
- **Field labels are local component constants, not a shared `yarn-copy.ts` dictionary.** Continues
  the S2 deviation: `design.md`'s Interfaces/Contracts section names the props these components need
  but not a label dictionary, and S2 explicitly deferred `FORM_FIELD_LABELS` to whichever slice first
  needed concrete label text. S3 is that slice for its seven technical fields; S4 will do the same for
  Identidad's.
- Everything else matches `design.md` D2, D4, D6, D11 and the Interfaces/Contracts block exactly: same
  exported prop names/types (`ColorFamilyPickerProps`, `NeedleRangeFieldProps`, the `YarnTabProps`
  shape extended with per-field refs), same `fieldset`+`legend` composition pattern as
  `NeedlesField.tsx`, no `"use client"` on any of the three files.

## Issues Found (S3)

- **`NeedleRangeField.test.tsx`'s first `onMinChange` RED attempt asserted a value a controlled
  component can't produce.** Typing a multi-character string (`"4,5"`) via `userEvent.type` against
  an input whose `value` prop stays fixed (no wrapper state in the test) replays each keystroke from
  the same base text instead of accumulating — the test asserted the fully-typed string as a single
  call, which never happens for a genuinely controlled input under RTL without a stateful test
  wrapper. Not a production bug: fixed by testing a single-character keystroke instead, which is
  sufficient to prove `onMinChange` receives the raw text unmodified (the parsing itself is
  `yarn-form.ts` territory, already covered in S2).
- None blocking.

## Workload / PR Boundary (S3)

- Mode: chained PR slice (feature-branch-chain), split into per-component commits as instructed
- Current work unit: S3 `yarn-technical-controls` (PR3, base = `feature/25-s2b-yarn-form-validation`)
- Boundary: starts from S2's clean state (`yarn-form.ts`/`yarn-copy.ts` unmounted, no UI consumer
  yet); ends with three new presentational components (`ColorFamilyPicker`, `NeedleRangeField`,
  `YarnTechnicalTab`), all still unmounted — `YarnIdentityTab` (S4) and `YarnFormDialog` (S5) are the
  first consumers.
- Four commits, each independently revertible and individually under or near the 400-line budget:
  1. `feat(yarns): add the required colour-family picker for the yarn form` — 258 lines
     (`ColorFamilyPicker.tsx` 91 + `.test.tsx` 167).
  2. `feat(yarns): add the needle-range field for the yarn form` — 235 lines
     (`NeedleRangeField.tsx` 71 + `.test.tsx` 164).
  3. `feat(yarns): add the Ficha técnica tab for the yarn form` — 420 lines
     (`YarnTechnicalTab.tsx` 140 + `.test.tsx` 277 + the 3-line `yarns-ui.classes.test.ts` addition).
     **20 lines over the nominal 400-line budget on its own.** Not split further: the component and
     its exhaustive RTL+axe test (13 scenarios covering 7 controlled fields × value/onChange/error/ref,
     plus the no-`usedQuantity` guarantee and the `lot`-is-`type="date"` assertion) are one cohesive
     TDD unit: RED referenced the not-yet-existing component, GREEN made it real. Splitting the test
     file from the component file would break that RED→GREEN pairing for no real reviewability gain.
     No comment, test, or assertion was trimmed to fit under the line.
  4. A docs commit (not yet made — see Status) marking tasks 3.1–3.8 `[x]` in `tasks.md` and merging
     this section into `apply-progress.md`.
- Estimated review budget impact: three of four commits land under 400 lines; the fourth (component 3)
  is a minor, justified overage per the budget-is-not-code-golf rule (`Rules` section, this file's own
  skill). No `size:exception` recommendation needed — 420 vs. 400 is a rounding-level overage, not a
  structural one.

## Review follow-up — lineages review-9f26d40d31a99340 and review-c66f3934617f35ab

**Correction to task 3.5's claim above.** "each field's error renders independently with
`aria-invalid`" overclaimed the achieved coverage: the shipped `YarnTechnicalTab.test.tsx` case only
exercised 3 of the 7 fields together (`length`, `needleMax`, `lot`); a crossed binding on any of the
other four (`fiber`, `needleMin`, `thickness`, `quantity`) would have passed undetected. Fixed by
this follow-up's C2 addition below. S3 was also split into three chained PRs after this section was
written — `feature/25-s3a-color-family-picker` (`ColorFamilyPicker`, commit `b1c99a4`),
`feature/25-s3b-needle-range-field` (`NeedleRangeField`, commit `ab24e7b`), and
`feature/25-s3c-yarn-technical-tab` (`YarnTechnicalTab` + docs, commits `9b1b39a`/`0d4209e`/
`f74537a`) — the four-commit description above still matches their combined content.

Two blind review lineages (`review-9f26d40d31a99340`, `review-c66f3934617f35ab`) on the merged
S3a/S3b/S3c chain surfaced seven non-blocking findings, fixed with TDD RED→GREEN where a real defect
existed, or honest characterisation where the guard already worked, across all three branches, then
rebased in chain order (s3a fixed → s3b rebased onto it → s3c rebased onto s3b).

- **A1** (WARNING, `ColorFamilyPicker.tsx:21`) — `ERROR_ID` was a fixed module-level string, so two
  pickers with errors on screen at once produced a duplicate DOM id and a wrong `aria-describedby`.
  Fixed with React `useId`. RED→GREEN, commit `da99ff3` on `feature/25-s3a-color-family-picker`.
- **A2** (SUGGESTION, `ColorFamilyPicker.test.tsx:106-110`) — the "no error" test did not assert the
  error element/`aria-invalid` were absent, and there was no case for `error=""`. Added both;
  characterisation (the guard at ~line 43 already treated `""` as no error). Same commit `da99ff3`.
- **B1** (SUGGESTION, `NeedleRangeField.test.tsx:75-118`) — the per-field error text/
  `aria-describedby` wiring and a both-errors `axe` run were not asserted explicitly. Added;
  characterisation (`Field.tsx`'s own `useId` already wired it correctly per instance). Commit
  `fa7daff` on `feature/25-s3b-needle-range-field`.
- **C1** (WARNING, `YarnTechnicalTab.test.tsx:102-116`) — typing into «Máximo» was untested for its
  `onChange` patch (only «Mínimo» was). Added; characterisation. Commit `aa598ee` on
  `feature/25-s3c-yarn-technical-tab`.
- **C2** (WARNING, `YarnTechnicalTab.test.tsx:171-209`) — only 3 of 7 fields had error coverage in
  one case (the overclaim corrected above). Added a case with a distinct error on all seven keys,
  each asserted independently (text + `aria-invalid` + `aria-describedby`). Characterisation. Same
  commit `aa598ee`.
- **C3** (SUGGESTION, `YarnTechnicalTab.test.tsx:57-68`) — the "no `usedQuantity` control" check was
  text-only. Made structural: asserts exactly 7 `<input>` elements render. Characterisation. Same
  commit `aa598ee`.
- **C4** (SUGGESTION, `YarnTechnicalTab.test.tsx:171-183`) — no `axe` run existed with errors
  present. Added one with all 7 fields in error. Characterisation. Same commit `aa598ee`.

### TDD Cycle Evidence (follow-up)

| Finding | Test File | RED / Characterisation | GREEN |
|---|---|---|---|
| A1 | `ColorFamilyPicker.test.tsx` — 1 new case (two instances, distinct error ids) | ✅ RED — failed against the fixed `ERROR_ID` constant (`messageA.id === messageB.id`, both `"color-family-error"`) | ✅ 17/17 passed after switching to `useId` |
| A2 | `ColorFamilyPicker.test.tsx` — extended the "no error" case + 1 new `error=""` case | ⚠️ Characterisation — passed on first run, the `hasError` guard already treated `""` as no error | N/A — no production change |
| B1 | `NeedleRangeField.test.tsx` — extended 2 cases + 1 new `axe` case | ⚠️ Characterisation — 10/10 passed on first run, `Field.tsx`'s own `useId` already wired `aria-describedby` per instance | N/A — no production change |
| C1 | `YarnTechnicalTab.test.tsx` — 1 new case (type into Máximo) | ⚠️ Characterisation — passed on first run | N/A — no production change |
| C2 | `YarnTechnicalTab.test.tsx` — 1 new case (all 7 fields in error) | ⚠️ Characterisation — passed on first run | N/A — no production change |
| C3 | `YarnTechnicalTab.test.tsx` — 1 new case (exactly 7 inputs) | ⚠️ Characterisation — passed on first run | N/A — no production change |
| C4 | `YarnTechnicalTab.test.tsx` — 1 new case (`axe` with 7 errors) | ⚠️ Characterisation — passed on first run | N/A — no production change |

### Verification (follow-up, per branch)

| Branch | Command | Result |
|---|---|---|
| `feature/25-s3a-color-family-picker` | `pnpm exec vitest run ColorFamilyPicker` | 1 file, 17/17 passed |
| same | `pnpm typecheck` | clean |
| same | `pnpm lint` | clean |
| `feature/25-s3b-needle-range-field` (rebased onto fixed s3a) | `pnpm exec vitest run ColorFamilyPicker NeedleRangeField` | 2 files, 27/27 passed |
| same | `pnpm typecheck` | clean |
| same | `pnpm lint` | clean |
| `feature/25-s3c-yarn-technical-tab` (rebased onto fixed s3b) | `pnpm exec vitest run ColorFamilyPicker NeedleRangeField YarnTechnicalTab` | 3 files, 44/44 passed |
| same | `pnpm typecheck` | clean |
| same | `pnpm lint` | clean |
| same | `pnpm test` (full suite) | 122 files passed / 3 skipped (125), 2208 passed / 13 skipped (2221) — up from the 2201/13 S3 baseline by this follow-up's 7 net-new tests (A1+A2 = 2 in `ColorFamilyPicker.test.tsx`, B1 = 1 in `NeedleRangeField.test.tsx`, C1–C4 = 4 in `YarnTechnicalTab.test.tsx`) |

Authored changed lines per commit (`git show --numstat`): `da99ff3` (A1/A2) —
`ColorFamilyPicker.test.tsx` +35/-1, `ColorFamilyPicker.tsx` +4/-4 = 39 insertions + 5 deletions;
`fa7daff` (B1) — `NeedleRangeField.test.tsx` +35/-19 = 35 insertions + 19 deletions; `aa598ee`
(C1–C4) — `YarnTechnicalTab.test.tsx` +115/-1 = 115 insertions + 1 deletion. **Total this follow-up:
189 insertions + 25 deletions = 214 authored changed lines**, well under the 400-line budget, and no
rebase produced a merge conflict on any of the three branches.

## Status (updated)

S1: 6/6. S2: 7/7 (+ review follow-up). S3: 8/8 tasks complete (3.1–3.8), shipped as four commits,
split into three chained PRs (`feature/25-s3a-color-family-picker`,
`feature/25-s3b-needle-range-field`, `feature/25-s3c-yarn-technical-tab`), plus this review follow-up
(A1/A2/B1/C1–C4 from lineages `review-9f26d40d31a99340` and `review-c66f3934617f35ab`) fixing the
colour-family picker's shared error id and closing four test-coverage gaps. 21/~85 total tasks across
all 7 phases complete. Ready to continue to Phase 4 (S4 `yarn-identity-tab`) in a future apply batch.


## Phase 4: S4 `yarn-identity-tab` (branch `feature/25-s3c-yarn-technical-tab`, base = S3c)

### Completed Tasks

- [x] 4.1 RED — `src/features/yarns/ui/ChooseOrCreateField.test.tsx` created: loading Skeleton + named status, failed retry, ready select/options, inline create row focus, Enter create without enclosing form submit, Escape closes only the row inside `Dialog`, failed create error, disabled propagation, and a follow-up RED proving repeated `Crear` clicks during a pending create must issue only one request.
- [x] 4.2 GREEN — `src/features/yarns/ui/ChooseOrCreateField.tsx` created: client component with local inline-row open/pending/error state, no nested form, `Crear` as `type="button"`, `pending` included in the disabled guard to prevent duplicate create requests, and a form-local request sequence so late inline results do not update a closed/restarted row.
- [x] 4.3 — `src/features/yarns/ui/yarns-ui.classes.test.ts` includes `ChooseOrCreateField.tsx`.
- [x] 4.4 RED — `src/features/yarns/ui/YarnIdentityTab.test.tsx` created: two choose-or-create fields, `colorName`, `colorCode`, `ColorFamilyPicker`, photo control, type disabled until brand, onChange wiring, photo fileName/uploading/onFile, refs, and render smoke.
- [x] 4.5 GREEN — `src/features/yarns/ui/YarnIdentityTab.tsx` created: client boundary composing `ChooseOrCreateField` twice, `ColorFamilyPicker`, controlled text inputs, and `FileInput` photo controls from the existing form model and catalog state.
- [x] 4.6 — `src/features/yarns/ui/yarns-ui.classes.test.ts` includes `YarnIdentityTab.tsx`.
- [x] 4.7 Verification — final `pnpm exec vitest run ChooseOrCreateField YarnIdentityTab yarns-ui.classes`: 3 files, 35/35 passed; `pnpm typecheck`: clean; `pnpm lint`: clean. Earlier literal `pnpm test -- ChooseOrCreateField YarnIdentityTab yarns-ui.classes` ran the full suite (124 files passed / 3 skipped, 2230 passed / 13 skipped) because this repository forwards `--` as a Vitest filter token.

### TDD Cycle Evidence (S4)

| Task | Test File | RED | GREEN | TRIANGULATE / REFACTOR |
|---|---|---|---|---|
| 4.1–4.2 | `ChooseOrCreateField.test.tsx` | ✅ `pnpm exec vitest run ChooseOrCreateField YarnIdentityTab yarns-ui.classes` failed with `Failed to resolve import "./ChooseOrCreateField"` before the component existed; follow-up RED failed with 2 `onCreate` calls during a pending create | ✅ final focused run passed, including the class gate | ✅ loading/failed/ready, keyboard Enter/Escape, failed create, disabled, duplicate-click prevention while pending; request sequence added locally to ignore late inline results after cancel/reopen |
| 4.4–4.5 | `YarnIdentityTab.test.tsx` | ✅ same RED run failed with `Failed to resolve import "./YarnIdentityTab"` before the component existed | ✅ focused run passed, including the class gate | ✅ brand/type/catalog states, controlled text inputs, colour family, photo fileName/uploading/onFile/remove, refs, smoke |
| 4.3/4.6 | `yarns-ui.classes.test.ts` | ➖ Fixed-list gate update; no standalone RED beyond the new source files requiring inclusion | ✅ class gate passed in the focused run | ➖ None needed |

### Verification Report (S4)

| Command | Result |
|---|---|
| `pnpm test -- ChooseOrCreateField YarnIdentityTab yarns-ui.classes` | 124 files passed / 3 skipped (127), 2230 passed / 13 skipped (2243); observed Vitest invocation was `vitest run "--" "ChooseOrCreateField" "YarnIdentityTab" "yarns-ui.classes"`, so it ran the full suite rather than only the focused subset |
| `pnpm exec vitest run ChooseOrCreateField YarnIdentityTab yarns-ui.classes` | final run: 3 files, 35/35 passed |
| `pnpm typecheck` | clean, no output |
| `pnpm lint` | clean, no output |

### Deviations / Issues (S4)

- The late-response safety at this component layer is local only: `ChooseOrCreateField` ignores a create result after cancel/reopen via a local monotonic request sequence and disables `Crear` while pending to avoid duplicate create requests. The catalog/result selection guard still belongs in `YarnFormDialog` S5b, where `brandRequestSeq`/`typeRequestSeq` can compare against current form state and update catalog data.
- The photo input is disabled while `photo.uploading` is true, matching the D10/S5b design note; the test asserts the uploading label/disabled state first, then rerenders non-uploading to assert `onFile`.

## Status (updated after S4)

S1: 6/6. S2: 7/7 (+ review follow-up). S3: 8/8 (+ review follow-up). S4: 7/7 tasks complete. Ready to continue to S5a `yarn-form-shell-create` in a future apply batch.
