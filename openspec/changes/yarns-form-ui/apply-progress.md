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

- [x] 2.1 RED — `src/features/yarns/ui/yarn-form.test.ts` created: 40 tests across
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
      still 40/40 green after the extraction.
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
| 2.1–2.2, 2.6–2.7 | `src/features/yarns/ui/yarn-form.test.ts` | Unit | N/A (new file) | ✅ Written — 40 tests, `Cannot find module './yarn-form'` (whole-file RED: production module did not exist) | ✅ 40/40 passed on the first execution — the implementation was derived from an empirically-verified zod 4 behaviour probe (`.tmp-zodcheck*.mjs`, run against the real `createYarnSchema`/`updateYarnSchema` before writing `yarn-form.ts`, then discarded) rather than guessed, which is why GREEN did not require an iteration | ✅ every behaviour has ≥2 cases (happy path + edge case): `parseDecimal`/`parseCount` (valid/invalid/blank), `issuesToErrors` (plain field, `recommendedNeedle` refine, `min`/`max`), `applyChange` (brand changes/doesn't/same-value), `validateCreate` (valid; empty brand/type/colour/lot; empty/unparseable numerics; needle max<min); `validateEdit` (no change; `"4,50"` vs `4.5`; untouched lot; one field only; `recommendedNeedle` whole; invalid patch; unparseable `quantity` on edit — this last case is the regression test for the `quantity`-is-optional edge case named in Issues Found) | ✅ extracted `decimalOrUndefined`/`countOrUndefined`; still 40/40 after |
| 2.4 | consumed by 2.1's assertions (no separate copy test file, see task note) | — | N/A (new exports) | ➖ Triangulation skipped: pure string constants, no branching logic — behaviourally covered via `yarn-form.test.ts`'s `toBe(<CONSTANT>)` assertions, not a literal re-pin | — | — | — |

### Test Summary
- **Total tests written**: 40
- **Total tests passing**: 40 (yarn-form.test.ts) + all pre-existing `yarn-copy.test.ts` cases still
  green (unmodified)
- **Layers used**: Unit (40)
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

- Mode: chained PR slice (feature-branch-chain), PR2, base = `feature/25-s1b-upload-client`
- Current work unit: S2 `yarn-form-model`
- Boundary: starts from S1's clean state (`yarns-client.ts`/`uploads-client.ts` unmounted, no
  consumer); ends with `yarn-form.ts` + `yarn-form.test.ts` (new, unmounted) and `yarn-copy.ts`
  gaining the form's tab/override copy. `YarnFormDialog` (S5) is the first consumer of any of this.
- Estimated review budget impact: **actual authored lines exceed both the ≈380 forecast and the
  400-line budget, substantially.** `git diff --stat`/line counts per commit: `yarn-copy.ts` +28
  (commit `b3d6128`); `yarn-form.ts` 461 new lines + `yarn-form.test.ts` 427 new lines = 888 insertions
  (commit `efdf1b9`). **Total authored ≈ 916 lines** (489 src + 427 test), more than double the
  400-line budget and well past the ≈380 forecast. No production code was trimmed and no test was
  shortened, deleted, or minified to fit the budget, per the budget-is-not-code-golf rule — every test
  maps to a distinct spec scenario or an edge case named in `tasks.md` 2.1/2.6, and the implementation
  needed all of `validateCreate`/`validateEdit`/`issuesToErrors`/`copyOverrides`/`yarnPatch` to satisfy
  them honestly. Per the orchestrator's instruction, the two commits are already split along a clean
  seam (copy, `b3d6128`, 28 lines; model+tests, `efdf1b9`, 888 lines) — but unlike S1's split (two
  genuinely independent modules, `yarns-client.ts` vs `uploads-client.ts`), that seam does not bring
  either half under budget on its own: the model and its tests are one TDD unit and were not written
  or reviewable in fewer lines without cutting scenarios `tasks.md` explicitly names. `tasks.md` names
  no split point for S2 (unlike S4/S5) — this overrun was not anticipated in the plan.
  **Recommendation: `size:exception` for PR2** (pure, unmounted, individually revertible, and every
  behaviour is a small exported function with a 1:1 test — reviewable despite the line count in a way
  a 900-line UI diff would not be), or the orchestrator may split `yarn-copy.ts` (28 lines) as its own
  trivial PR ahead of the `yarn-form.ts`+test PR (888 lines, still over budget on its own) if a hard
  cap is preferred over an exception.

## Status

S1: 6/6 tasks complete (unchanged). S2: 7/7 tasks complete (2.1–2.7). 13/~85 total tasks across all 7
phases complete. Ready for the orchestrator to decide the PR2 size:exception question, then continue
to Phase 3 (S3 `yarn-technical-controls`) in a future apply batch.
