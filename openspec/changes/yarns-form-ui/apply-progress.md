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
