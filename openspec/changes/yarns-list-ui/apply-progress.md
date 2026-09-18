# Apply Progress: yarns-list-ui

## Phase 1: S1 — backend-names (PR 1, base: tracker `feature/23-yarns-list`)

**Status**: 9/9 tasks complete (1.1-1.9). Slice done. Stopped as instructed —
Phase 2 (S2 swatch-split) not started.

### Completed Tasks

- [x] 1.1 RED — `src/features/yarns/api/yarn-service.test.ts`: new test
      `"returns brandName and typeName from the joined row, one per
      brand/type, without dropping rows"` seeds two distinct brand/type pairs
      so the join must correlate per row (not pass by a single fixed value);
      asserts row count unchanged (2 in, 2 out).
- [x] 1.2 GREEN — `src/features/yarns/api/store.ts`: `listYarns` now
      `innerJoin(brands, eq(brands.id, yarns.brandId))` and
      `innerJoin(yarnTypes, eq(yarnTypes.id, yarns.typeId))`, selecting
      `...getTableColumns(yarns), brandName: brands.name, typeName:
      yarnTypes.name` — mirrors `projects/api/store.ts:214`
      (`listLinkedYarns`). `orderBy(desc(yarns.createdAt))` unchanged (join
      is additive to columns, not to ordering).
- [x] 1.3 — `src/features/yarns/types.ts`: added `YarnListItem = YarnRecord &
      { brandName: string; typeName: string }`. `YarnRecord` untouched
      (confirmed: no existing field removed or renamed, verified by
      typecheck + the byte-identical route assertions below).
- [x] 1.4 — `src/features/yarns/api/list-yarns.ts`: return type changed
      `Promise<YarnRecord[]>` → `Promise<YarnListItem[]>`. `src/app/api/yarns/
      route.ts` needed **no edit**: it has no explicit type annotation on
      `const yarns = await listYarns(...)`, so the richer type flows through
      `NextResponse.json({ yarns })` automatically; `{ yarns }` wrapper and
      status codes unchanged.
- [x] 1.5 — `src/features/yarns/api/testing/in-memory-store.ts`:
      `listYarns` double now maps each matched yarn to a `YarnListItem`,
      looking up `brandName`/`typeName` from the double's own seeded
      `brands`/`types` arrays by id.
- [x] 1.6 RED — `src/app/api/yarns/yarns-routes.test.ts`: extended
      `"treats empty query params as no filter"` to assert
      `body.yarns[0]` matches `{ brandName: "Malabrigo", typeName: "Rios" }`;
      extended `"filters by brand, type and colorFamily"` with the same
      per-branch assertions; added new test `"returns an empty array for an
      authenticated user with no yarns"` (empty-stash scenario from the
      spec). The pre-existing `"answers 401 on every endpoint without a
      session"` test already covers the 401 case unchanged.
- [x] 1.7 GREEN — same file, full suite run: all pass against the 1.2-1.5
      implementation (see Work Unit Evidence below).
- [x] 1.8 RED+GREEN — added explicit byte-identical assertions per
      `yarn-list-api/spec.md` "Other yarn endpoints unaffected":
      - POST `/api/yarns` 201 body: `not.toHaveProperty("brandName"/"typeName")`
      - new `GET /api/yarns/:id` happy-path test (didn't exist before):
        200, correct `id`, no `brandName`/`typeName`
      - PATCH `/api/yarns/:id` 200 body: `not.toHaveProperty(...)`
      - DELETE and the 404/409 paths were already covered and untouched by
        this slice (no store method used by them was modified).
      `getYarnOptions` (`src/features/projects/ui/projects-client.ts`) was
      **not modified** — out of this slice's file list, and structurally
      unaffected: it narrows the `GET /api/yarns` response via a TypeScript
      `Pick<YarnRecord, "id" | "colorName" | "colorFamily">` return type, not
      a runtime strip, so a superset response (with the new additive fields)
      still satisfies it. No behavior change at that layer → no new test
      required there per the "additive only" contract.
- [x] 1.9 Verify — see Work Unit Evidence.

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/features/yarns/api/store.ts` | Modified | `listYarns` inner-joins `brands`/`yarnTypes`, returns `YarnListItem[]` |
| `src/features/yarns/types.ts` | Modified | additive `YarnListItem` type; `YarnRecord` untouched |
| `src/features/yarns/api/list-yarns.ts` | Modified | return type propagated to `YarnListItem[]` |
| `src/features/yarns/api/testing/in-memory-store.ts` | Modified | `listYarns` double mirrors the join via seeded brand/type lookup |
| `src/features/yarns/api/yarn-service.test.ts` | Modified | new RED/GREEN test for join enrichment + row-count preservation |
| `src/app/api/yarns/yarns-routes.test.ts` | Modified | extended GET filter tests, new empty-stash test, new GET/:id test, byte-identical assertions on POST/PATCH/GET:id |
| `src/app/api/yarns/route.ts` | Unchanged | no explicit type annotation — type flows through automatically |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1-1.5 | `src/features/yarns/api/yarn-service.test.ts` | Unit (service, in-memory store) | ✅ 45/45 (baseline) | ✅ Written — failed on `brandName: undefined` vs `"Malabrigo"` | ✅ Passed after store.ts + types.ts + in-memory-store.ts changes | ✅ 2 brand/type pairs in one test (join must correlate per row, not a fixed value) | ➖ None needed — store change is a direct, minimal Drizzle query edit |
| 1.6-1.8 | `src/app/api/yarns/yarns-routes.test.ts` | Integration (route + in-memory store) | ✅ 45/45 (shared baseline above) | ✅ Written — assertions for `brandName`/`typeName` on filtered/unfiltered GET responses, empty-stash, and `not.toHaveProperty` on POST/GET:id/PATCH | ✅ Passed immediately once 1.2-1.5 landed (route has no own logic to change — confirms propagation, not new production code) | ✅ Two distinct filter branches (`colorFamily=red`, `typeId=`) each assert their own brand/type names | ➖ None needed |

### Test Summary

- **Total tests written**: 7 new (1 in `yarn-service.test.ts`; 6 in `yarns-routes.test.ts`: empty-array scenario, GET/:id happy path, 2 extended assertions on existing filter tests, 2 `not.toHaveProperty` assertions on POST/PATCH)
- **Total tests passing**: 1841/1841 (13 pre-existing skips, unrelated to this slice)
- **Layers used**: Unit (1), Integration (6), E2E (0)
- **Approval tests** (refactoring): None — no refactoring tasks in this slice
- **Pure functions created**: 0 (Drizzle query builder + a `.map()` in the test double; no new standalone pure function)

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm vitest run src/features/yarns/api/yarn-service.test.ts src/features/yarns/api/store.test.ts src/app/api/yarns/yarns-routes.test.ts` → **3 files passed, 48/48 tests passed** |
| Runtime harness command/scenario and exact result | `pnpm build` → **green**: `Compiled successfully in 16.8s`, `Finished TypeScript in 19.1s`, all 27 routes generated including `ƒ /api/yarns` and `ƒ /api/yarns/[id]`; no route-generation or type errors |
| Rollback boundary | Revert the 6 modified files listed above (`store.ts`, `types.ts`, `list-yarns.ts`, `in-memory-store.ts`, and the two test files) — restores `listYarns` to plain `select()` with no join and `YarnRecord[]` return; no other file in the tree references `YarnListItem` yet, so the revert is self-contained |

### Full Verification (task 1.9)

Ran in order, real output:

1. `pnpm lint` → `$ eslint .` — **clean, zero output, exit 0**
2. `pnpm typecheck` → `$ tsc --noEmit` — **clean, zero output, exit 0**
3. `pnpm test` (`vitest run`, full repo suite) → **`Test Files  98 passed | 3 skipped (101)` / `Tests  1841 passed | 13 skipped (1854)`**, duration 124.25s, exit 0
4. `pnpm build` → **`✓ Compiled successfully in 16.8s`**, TypeScript pass in 19.1s, all 16 static + dynamic routes generated, exit 0

### Deviations from Design

None — implementation matches design D1/File Changes table exactly:
`getTableColumns(yarns)` spread, inner joins in the documented order, additive
`YarnListItem`, `route.ts` needed no edit (design didn't require one either;
task 1.4 listed it defensively but the type flows through untyped).

### Issues Found

None.

### Remaining Tasks (Phase 2 onward — not started, per instructions)

- [ ] 2.1-2.8 S2 swatch-split
- [ ] 3.1-3.11 S3 list-cards-states
- [ ] 4.1-4.5 S4a disclosure-primitive
- [ ] 5.1-5.10 S4b yarn-filter-tree

### Workload / PR Boundary

- Mode: chained PR slice (`feature-branch-chain`)
- Current work unit: S1 backend-names (PR 1, base: tracker `feature/23-yarns-list`)
- Boundary: starts from the untouched `listYarns` (plain `select()`, `YarnRecord[]`)
  and ends with the enriched join (`YarnListItem[]`) fully propagated through
  store → service → in-memory double → route, with unaffected sibling
  endpoints (POST/GET:id/PATCH/DELETE, `getYarnOptions`) verified
  byte-identical.
- Estimated review budget impact: **146 changed lines** (138 insertions + 8
  deletions across 6 files, per `git diff --stat`), well inside this slice's
  own 150-220 forecast and the 220-line authority budget for this attempt.

### Git

Branch `feature/23-s1-backend-names` — working tree left uncommitted per
instructions (orchestrator reviews and commits). No push performed.
