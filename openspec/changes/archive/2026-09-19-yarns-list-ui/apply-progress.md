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

### Remaining Tasks (as of end of Phase 1)

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

### Git (Phase 1)

Branch `feature/23-s1-backend-names` — working tree left uncommitted per
instructions (orchestrator reviews and commits). No push performed.

---

## Phase 2: S2 — swatch-split (PR 2, base: S1 branch `feature/23-s1-backend-names`)

**Status**: 8/8 tasks complete (2.1-2.8), except the manual browser check
inside 2.8 (13 swatch colours), which is **OUTSTANDING** — the apply
executor has no browser tool; the orchestrator must run it (REGLA 4).

### Completed Tasks

- [x] 2.1 RED — `src/shared/ui/primitives/swatch/Swatch.test.tsx`: written
      first, confirmed failing (`Failed to resolve import "./Swatch"`)
      before any production code existed. Covers: accessible-name scenario
      (`color`+`label` → `role="img"` with that name), decorative scenario
      (no `label` → `aria-hidden`, empty text content), one test per size in
      `SWATCH_SIZES` asserting the real `cn(swatchVariants({size}))` output
      (not a literal class string, not a px value), `className` merge, and
      an `axe` assertion over both forms.
- [x] 2.1-bis RED — `src/shared/ui/primitives/swatch/Swatch.boundary.test.ts`:
      the import-inspection assertion (reads `Swatch.tsx` as text, asserts it
      never contains `"shared/config"` or `"ColorFamily"`). Split into its
      own file in the default (Node) environment — `import.meta.url` is not
      a file URL under `happy-dom`, same trap `file-input.boundary.test.ts`
      already documents for the same deuda 168. This test itself caught a
      real leak on first run: my own JSDoc comment in `Swatch.tsx` said
      `` `src/shared/config/` `` literally, which the gate flagged before I
      reworded it — proof the assertion measures the real source, not intent.
- [x] 2.2 GREEN — created `src/shared/ui/primitives/swatch/{Swatch.tsx,
      swatch.variants.ts, index.ts}`. `Swatch`: `forwardRef`, no hooks, no
      `"use client"` (mirrors `EmptyState`); props `color?` (applied via
      inline `style.backgroundColor`, so it never fights a `className`-driven
      background), `label?` (drives `role="img"`/`aria-label` when present,
      `aria-hidden` when absent), `size` (`SwatchVariants`), `className`.
      `swatch.variants.ts`: `sm` = `size-(--space-5)` (the filter-row size
      `YarnsTab` already used), `md` = `size-(--space-8)` (card size, for
      #23-#25); base classes (`rounded-full`, system border) ported verbatim
      from the old `YARN_SWATCH_CLASSES` constant so the visual output is
      unchanged.
- [x] 2.3 **Move and rename** — `yarnSwatchColor` (`YarnsTab.tsx:265-294`,
      13-branch exhaustive `switch`, body byte-identical) is now
      `yarnSwatchClass` in `src/shared/config/yarn-swatch.ts`, re-exported
      from `src/shared/config/index.ts`.
- [x] 2.4 Same commit as 2.3 — RED+GREEN:
      `src/shared/config/yarn-swatch.classes.test.ts` iterates all 13
      `ColorFamily` values, calls `yarnSwatchClass(family)`, and asserts
      `emitsRule(css, className)` against `compileGlobalsCss()`. Written
      first (failed on `Cannot find module './yarn-swatch'`), then made
      green by creating `yarn-swatch.ts`. This is the compiled-CSS coverage
      handoff the design flagged (trap #3): once `yarnSwatchClass` lives in
      another module, the AST-based `projects-ui.classes.test.ts` treats it
      as external and can no longer verify its 13 return values against
      real CSS — this test is the replacement, landed in the same commit.
- [x] 2.5 Same commit as 2.3/2.4 — struck entry **168** through in
      `docs/historial/deuda-tecnica.md` with `~~…~~`, added **Cómo se saldó**
      and **Dónde quedó la prueba** in Spanish, per the ledger's own protocol.
- [x] 2.6 GREEN — `YarnsTab.tsx`'s two call sites (`:147`, `:212` in the
      pre-change file) now render `<YarnColorSwatch colorFamily={...} />`,
      a small local component that composes `Swatch` + `yarnSwatchClass`.
      Deleted the dead `YarnSwatch`, `yarnSwatchColor`, and
      `YARN_SWATCH_CLASSES`. **Approval-test protocol followed**: ran
      `YarnsTab.test.tsx` as a safety net BEFORE touching production code
      (16/16 passing baseline), then again after the refactor (16/16 still
      passing, unchanged assertions) — the refactor changed no behavior.
- [x] 2.7 — `src/shared/ui/primitives/index.ts` now re-exports `./swatch`;
      `src/shared/ui/public-api.test.ts`'s `PRIMITIVES` literal gained
      `"Swatch"` and `"SWATCH_SIZES"`, and its variants list gained
      `"swatchVariants"`. Landed together with 2.2/2.6 (same commit) since
      the anchor test fails in both directions until both the primitive and
      its consumer exist.
- [x] 2.8 Verify — see Work Unit Evidence and Full Verification below. The
      automated part (`pnpm lint/typecheck/test/build`) is green. The manual
      browser check of the 13 swatch colours is **explicitly outstanding** —
      not claimed as done.

### Trap discovered during this slice (not previously documented in design/tasks)

Moving `yarnSwatchClass` out of `YarnsTab.tsx` broke a **second, distinct**
invariant in `projects-ui.classes.test.ts` beyond the documented
compiled-CSS coverage drop (trap #3): the file's `EXTERNAL_SOURCES` anchor
requires the AST resolver's `external`-identifier set to equal the set of
"named reasons" it records for each empty `className` attribute. Those two
sets are only equal when a class attribute resolves via **exactly one**
external touchpoint. Calling `yarnSwatchClass(yarn.colorFamily)` directly
inside a `className` attribute breaks that in two ways I had to work
through in order:

1. `yarn.colorFamily` (a raw property access) as the argument to an
   *external* function call is a form the resolver cannot follow at all —
   it reports `unhandled: PropertyAccessExpression`, which the harness
   treats as an unconditional failure (there is no allow-list for
   `unhandled`, unlike for `external`).
2. Destructuring `colorFamily` into a plain identifier first fixes (1), but
   now the call has **two** external touchpoints (`yarnSwatchClass` the
   head, `colorFamily` the argument), while the "named reason" bookkeeping
   only ever records the head. `EXTERNAL_SOURCES` cannot equal both sets at
   once with this shape, no matter which two names are listed.

**Fix, contained entirely inside `YarnsTab.tsx` (no shared-harness edit):** a
small local `YarnColorSwatch` component resolves `yarnSwatchClass(family)`
*outside* of any `className` attribute (inside a plain function call in its
body), and exposes only one opaque identifier — the destructured local
`swatchClass` — to the single `className` attribute the gate actually scans.
The resolver's `collectLocals` pass only tracks plain-identifier variable
declarations, not destructuring patterns, so `swatchClass` never resolves
past being "external," giving the gate exactly one name to reconcile —
`EXTERNAL_SOURCES` became `["className", "inputClasses", "swatchClass"]`.
This is the same treatment the file already gives `inputClasses` (an opaque
value crossing a module boundary), not a new exception category.
I considered and rejected: a same-file wrapper function around
`yarnSwatchClass` (the resolver drills straight through same-file wrappers
to their return statements, so the divergence just resurfaces one level
in); and precomputing a `Map`/array of swatch classes before render (the
`.get()`/index-access call hits the *exact same* `unhandled` failure as the
original raw property access, plus real added complexity for no gain).

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/shared/ui/primitives/swatch/Swatch.tsx` | Created | generic `Swatch` primitive |
| `src/shared/ui/primitives/swatch/swatch.variants.ts` | Created | `sm`/`md` size variants (`SWATCH_SIZES`, `swatchVariants`) |
| `src/shared/ui/primitives/swatch/index.ts` | Created | barrel |
| `src/shared/ui/primitives/swatch/Swatch.test.tsx` | Created | RTL + axe behavior suite |
| `src/shared/ui/primitives/swatch/Swatch.boundary.test.ts` | Created | source-level import-inspection assertion (Node env) |
| `src/shared/config/yarn-swatch.ts` | Created | `yarnSwatchClass` (moved + renamed from `YarnsTab.tsx`) |
| `src/shared/config/yarn-swatch.classes.test.ts` | Created | compiled-CSS coverage for all 13 `ColorFamily` values |
| `src/shared/config/index.ts` | Modified | re-exports `./yarn-swatch` |
| `src/shared/ui/primitives/index.ts` | Modified | re-exports `./swatch` |
| `src/shared/ui/public-api.test.ts` | Modified | anchors `Swatch`, `SWATCH_SIZES`, `swatchVariants` |
| `src/features/projects/ui/YarnsTab.tsx` | Modified | composes `Swatch`+`yarnSwatchClass` via local `YarnColorSwatch`; deletes dead `YarnSwatch`/`yarnSwatchColor`/`YARN_SWATCH_CLASSES` |
| `src/features/projects/ui/projects-ui.classes.test.ts` | Modified | `EXTERNAL_SOURCES` gains `swatchClass` (see trap above) |
| `docs/historial/deuda-tecnica.md` | Modified | entry 168 struck through, settled |

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.1/2.2 | `Swatch.test.tsx` | Unit/UI (RTL+axe) | N/A (new file) | ✅ Written — failed on missing module | ✅ Passed after `Swatch.tsx`+`swatch.variants.ts`+`index.ts` | ✅ Both size variants, both labelled/decorative forms, both axe subjects | ✅ Reworded a leaking comment after the boundary test caught it |
| 2.1-bis | `Swatch.boundary.test.ts` | Unit (source text, Node env) | N/A (new file) | ✅ Written — failed on missing module | ✅ Passed after `Swatch.tsx` existed and its comment was reworded | ➖ Single scenario (absence-of-import is binary) | ➖ None needed |
| 2.3/2.4 | `yarn-swatch.classes.test.ts` | Unit (compiled CSS) | N/A (new file) | ✅ Written — failed on missing module | ✅ Passed after `yarn-swatch.ts` created | ✅ All 13 `ColorFamily` values in one exhaustive loop | ➖ None needed |
| 2.6 | `YarnsTab.test.tsx` (existing, unchanged) | Integration (RTL) | ✅ 16/16 (baseline, run before touching production code) | N/A — refactor task, approval-test protocol used instead | ✅ 16/16 still passing after the refactor | ➖ N/A (approval test, not new behavior) | ✅ Extracted `YarnColorSwatch`, deleted dead code |

### Test Summary

- **Total tests written**: 11 new (`Swatch.test.tsx` 7, `Swatch.boundary.test.ts` 2, `yarn-swatch.classes.test.ts` 1, plus `projects-ui.classes.test.ts` anchor already covered by its existing tests)
- **Total tests passing (full repo suite)**: 1859/1859 (13 pre-existing skips, unrelated)
- **Layers used**: Unit (3 new files), Integration/UI (1 existing file re-verified), E2E (0)
- **Approval tests**: 1 — `YarnsTab.test.tsx`, run before and after the refactor with zero assertion changes
- **Pure functions created**: 0 net (moved and renamed one existing pure function; `Swatch` and `YarnColorSwatch` are presentational components, not pure functions)

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm vitest run src/shared/ui/primitives/swatch/ src/shared/config/ src/shared/ui/public-api.test.ts src/features/projects/ui/` → **21 files passed, 377/377 tests passed** |
| Runtime harness command/scenario and exact result | N/A per design's own forecast — no page changed in this slice, RTL+axe on the primitive is the closest runtime boundary and is covered above; `pnpm build` (full harness) → green, all 27 routes generated, no `/lanas` route yet (correct, that's S3+) |
| Rollback boundary | Revert the 13 files/dirs listed in Files Changed — restores `YarnsTab.tsx`'s local `YarnSwatch`/`yarnSwatchColor`, removes the `Swatch` primitive and `yarn-swatch.ts` entirely, and reverts the debt-168 strike-through in the same commit (per the rollback row in the tasks forecast) |

### Full Verification (task 2.8) — real output

1. `pnpm lint` → `$ eslint .` — clean, zero output, exit 0
2. `pnpm typecheck` → `$ tsc --noEmit` — clean, zero output, exit 0
3. `pnpm test` (full repo) → `Test Files  101 passed | 3 skipped (104)` / `Tests  1859 passed | 13 skipped (1872)`, duration 89.40s, exit 0
4. `pnpm build` → `✓ Compiled successfully`, TypeScript pass clean, all 27 routes generated (no `/lanas` yet — correct for this slice), exit 0
5. **Manual browser check of the 13 swatch colours (REGLA 4 / debt 171): NOT RUN.** The apply executor has no browser tool. This is explicitly outstanding, not claimed as done — the orchestrator must run it before archiving.

### Deviations from Design

- **New, previously undocumented AST-resolver trap** (see section above) —
  fixed locally, no shared-harness edit, no design contradiction, but the
  design/tasks text did not anticipate this specific `EXTERNAL_SOURCES`
  divergence. Recorded here and in the Engram tasks artifact for future
  slices that call an external app-side class map from inside a
  `className` attribute.
- Otherwise none — `Swatch`'s props (`color`, `label?`, `size`, `className`),
  `yarnSwatchClass`'s unchanged 13-branch switch, and D4's "no tint prop"
  constraint all match design exactly.

### Issues Found

None beyond the trap above (resolved, not escalated).

### Remaining Tasks (as of end of Phase 2)

- [ ] 3.1-3.11 S3 list-cards-states
- [ ] 4.1-4.5 S4a disclosure-primitive
- [ ] 5.1-5.10 S4b yarn-filter-tree

### Workload / PR Boundary (Phase 2)

- Mode: chained PR slice (`feature-branch-chain`)
- Current work unit: S2 swatch-split (PR 2, base: S1 branch `feature/23-s1-backend-names`)
- Boundary: starts from `YarnsTab.tsx`'s local, app-coupled swatch and ends
  with a generic `Swatch` primitive in `shared/ui` plus an app-side
  `yarnSwatchClass` map in `shared/config`, composed back together in
  `YarnsTab.tsx` with unchanged visual/behavioral output (16/16 approval
  tests unchanged) and debt 168 settled in the same commit.
- Estimated review budget impact: **~366 changed lines** (116 insertions+
  deletions across 6 modified files per `git diff --numstat`, plus 250
  lines across 7 new files) — **over** this slice's own 140-200 forecast and
  this attempt's 200-line authority. Trimmed comment density once already
  (from ~426 to ~366 raw lines) without cutting required test assertions or
  mandated documentation content (13-branch switch verbatim, ledger
  protocol, full RTL+axe+import-inspection suite, public-api anchor, and a
  genuinely-required 62-line dead-code deletion in `YarnsTab.tsx`). Flagging
  this honestly rather than silently exceeding the budget or cutting
  required coverage to hit a number — the orchestrator should decide
  whether this stays inside PR 2 as one atomic settlement of debt 168, or
  needs a smaller sub-slice next time.

### Git (Phase 2)

Branch `feature/23-s2-swatch-split`, cut from `feature/23-s1-backend-names`
— working tree left uncommitted per instructions (orchestrator reviews and
commits). No push performed.

> **Note (S4b executor, hybrid-mode drift correction).** This file's mirror
> stopped at the end of Phase 2 even though Engram's `apply-progress`
> observation already carried Phases 3 and 4. Phases 3-4 below are
> transcribed from that Engram observation (condensed, not reworded in
> substance) so the file and Engram agree again, per the hybrid-mode
> contract. Phase 5 is this executor's own new work.

---

## Phase 3: S3 — list-cards-states (PR 3, base: S2 branch, branch `feature/23-s3-list-cards-states`)

**Status**: 11/11 tasks complete (3.1-3.11), except the manual browser pass
over `/lanas` inside task 3.11 — **OUTSTANDING**, no browser tool available
to the apply executor; the orchestrator must run it (REGLA 4).

### Budget rule correction (read before judging line count)

The maintainer changed the rule after S2: the 400-line review budget counts
**non-test lines only**. This slice's real numbers (`git diff --numstat`, all
files new, intent-to-add):

| File | Lines | Counts toward 400? |
|---|---|---|
| `docs/historial/deuda-tecnica.md` (debt 192) | 10 | Yes |
| `src/app/(app)/lanas/page.tsx` | 12 | Yes |
| `src/features/yarns/ui/index.ts` | 2 | Yes |
| `src/features/yarns/ui/types.ts` | 19 | Yes |
| `src/features/yarns/ui/yarn-copy.ts` | 7 | Yes |
| `src/features/yarns/ui/yarns-client.ts` | 68 | Yes |
| `src/features/yarns/ui/YarnCard.tsx` | 56 | Yes |
| `src/features/yarns/ui/YarnsView.tsx` | 125 | Yes |
| **Non-test subtotal** | **299** | under 400 |
| 4 test files (`yarns-client`/`YarnCard`/`YarnsView`/`yarns-ui.classes`) | 514 | excluded |
| **Total** | **813** | under the 900 runtime ceiling |

### Completed Tasks

Created `yarns-client.ts`+`types.ts` (`getYarns`, `SerializedYarnListItem`,
`YarnListPayload`); `yarn-copy.ts` (Spanish copy); `YarnCard.tsx` (composes
`Card`+`Swatch` tinted by `yarnSwatchClass`, documented no-op tap, debt 192);
`YarnsView.tsx` (`useState` filters + `reloadToken`→`requestKey`, three
states — skeleton/empty/error+retry/grid); `src/app/(app)/lanas/page.tsx`
(thin Server page) + `ui/index.ts` barrel; filed debt 192 (🟠) in the same
commit as the card; `yarns-ui.classes.test.ts` (compiled-CSS gate, mirrors
`projects-ui.classes.test.ts`, no `EXTERNAL_SOURCES` divergence this time —
S2's `swatchClass`-outside-`className` pattern reused clean on first run).

### Test Summary

28 new tests (6 client + 6 card + 8 view + 8 classes gate), all passing.
Full repo suite: 1901/1901 (13 unrelated skips). No refactoring tasks this
slice (S2 already did the `YarnsTab.tsx` refactor).

### Deviations from Design

1. Error copy is a fixed string ("Se enredó la madeja"), never the server's
   actual message — the spec's scenario fixes it explicitly, unlike
   `ProjectsView`'s pattern of surfacing the server text.
2. No "Agregar lana" action on the empty state — RFC-04 §4 mentions it but
   task 3.3/spec's empty-state scenario both omit it, and entry 25's create
   flow doesn't exist yet. Deferred.
3. No page-composition test for `/lanas` (the kind debt 111 notes as *extra*
   coverage for `/proyectos`, not gate-required). Skipped, out of scope.

### Full Verification (task 3.11) — real output

1. `pnpm lint` → clean, exit 0.
2. `pnpm typecheck` → clean, exit 0.
3. `pnpm test` → `Test Files 105 passed | 3 skipped (108)` / `Tests 1901
   passed | 13 skipped (1914)`, 90.90s.
4. `pnpm build` → compiled successfully, 17 static pages, `ƒ /lanas` listed
   for the first time.
5. Manual browser pass over `/lanas` (REGLA 4): **NOT RUN** — no browser
   tool; outstanding for the orchestrator.

### Git (Phase 3)

Branch `feature/23-s3-list-cards-states`, cut from `feature/23-s2-swatch-split`
— working tree left uncommitted and unstaged. No push performed.

---

## Phase 4: S4a — disclosure-primitive (PR 4, base: S3 branch, branch `feature/23-s4a-disclosure-primitive`)

**Status**: 5/5 tasks complete (4.1-4.5). Fully automated slice — the
primitive isn't wired into any page yet (that's S4b), so no manual browser
check applies.

### Completed Tasks

Created `src/shared/ui/primitives/disclosure/{Disclosure.tsx,
disclosure.variants.ts, index.ts, Disclosure.test.tsx,
Disclosure.boundary.test.ts}` per design D5 — native `<details>`/`<summary>`
wrapper, dual controlled/uncontrolled state with the `Toggle`-style "reports
the value it's moving TO" contract, `size: "sm"|"md"`, the RFC-03 E2(b)
contrast constraint (`<summary>` always `text-fg`, never `text-fg-inverse`)
asserted explicitly (trap #5); anchored `Disclosure`/`DISCLOSURE_SIZES`/
`disclosureVariants` in `primitives/index.ts` + `public-api.test.ts`.

### Trap discovered (environment-only, not a design/code defect)

happy-dom + `user-event` don't reproduce two pieces of native
`<details>`/`<summary>` behaviour design D5 assumes: (1) no CSS-based hiding
of closed-panel content (`getComputedStyle` never resolves `display:none` for
a closed `<details>`'s children in this environment), and (2) no
keyboard-default-action for `<summary>` (`user-event`'s Enter/Space
default-action tables don't special-case `<summary>` the way they do
`<button>`). **Fix, inside `Disclosure.tsx` only**: children mount only when
`resolvedOpen` (mirrors `Tabs`'s "only mount the selected panel"), and
`<summary>` gets an explicit `tabIndex={0}` plus its own `onKeyDown` that
`preventDefault()`s the native action and toggles state directly — a real
implementation choice (not test-only), documented at length in the
component's own JSDoc so it isn't "simplified" away later.

### Test Summary

19 new tests (17 behavior/RTL/axe + 2 boundary). Full repo suite: 1927/1927
(13 unrelated skips).

### Full Verification (task 4.5) — real output

1. `pnpm lint` → clean, exit 0.
2. `pnpm typecheck` → clean, exit 0.
3. `pnpm test` → `Test Files 107 passed | 3 skipped (110)` / `Tests 1927
   passed | 13 skipped (1940)`, 100.88s.
4. `pnpm build` → compiled successfully, 17 static pages, route table
   unchanged from S3 (`Disclosure` not consumed by any route yet).
5. Manual browser check: **N/A this slice** — nothing on screen to look at
   yet (REGLA 4 doesn't apply to an unmounted primitive).

### Deviations from Design

The literal `DisclosureProps` snippet in `design.md` D5 doesn't mention
mounting `children` only when open, or the explicit `tabIndex`/`onKeyDown` on
`<summary>` — both are additions this slice made to close the environment gap
above. They don't contradict any stated design property; they make it
enforceable by an explicit code path instead of assumed browser default
behaviour this repo's own test stack can't observe.

### Git (Phase 4)

Branch `feature/23-s4a-disclosure-primitive`, cut from
`feature/23-s3-list-cards-states` — working tree left uncommitted and
unstaged. No push performed.

---

## Phase 5: S4b — yarn-filter-tree (PR 5, base: S4a branch, tip of tracker, branch `feature/23-s4b-yarn-filter-tree`)

**Status**: 10/10 tasks complete (5.1-5.10), except task 5.9's browser half
(the literal keyboard-only pass in a real browser) — **OUTSTANDING**, this
executor has no browser tool; the orchestrator must run it (REGLA 4).

### Completed Tasks

- [x] 5.1 RED: `src/features/yarns/ui/YarnBrandTree.test.tsx` — 7 tests:
      "Toda la marca" sets `brandId` with no `typeId`; a type sets both;
      "Todas las marcas" clears both; one shared radio group spans the whole
      tree (asserted by `name` attribute equality across all mounted radios,
      opened panel included); a brand holding the active value stays marked
      (`"(elegida)"`) when its panel is closed and its radios are unmounted;
      a rejected `/api/brands` fetch degrades to a disabled panel while a
      sibling element stays in the document (list unaffected); `axe`. Written
      first, confirmed failing (`Failed to resolve import "./YarnBrandTree"`).
- [x] 5.2 GREEN: created `src/features/yarns/ui/YarnBrandTree.tsx` — one
      shared radio group (`name="yarn-scope"`, exported as
      `YARN_SCOPE_GROUP_NAME`) spanning a reset radio and, per brand, a
      `Disclosure` whose panel opens with "Toda la marca" then one radio per
      type. Fetches `GET /api/brands` then `Promise.all` over `GET
      /api/brands/:id/types` in one `useEffect` with empty deps (design D7:
      once, in parallel, filter-independent); any failure is caught inside
      the same async helper and degrades to a disabled-panel render, never a
      thrown exception. 7/7 passing on first implementation attempt.
- [x] 5.3 RED: `src/features/yarns/ui/ColorFamilyFilter.test.tsx` — 8 tests:
      `aria-pressed` reflects the active family and only it; re-clicking the
      active swatch clears (`onValueChange(undefined)`); clicking a
      different family fixes it regardless of prior selection; exactly 13
      controls (one per `ColorFamily`); Tab+Enter and Tab+Space both
      activate; `axe`. Written first, confirmed failing.
- [x] 5.4 GREEN: created `src/features/yarns/ui/ColorFamilyFilter.tsx` — a
      `role="group"` row of the shared `Toggle` primitive (not a hand-rolled
      button: `Toggle` already implements the `aria-pressed` contract and,
      because it is fully controlled from `value`, selecting a new family
      naturally deactivates the previous one without any inter-button
      coordination), each wrapping a decorative `Swatch` tinted by
      `yarnSwatchClass(family)`. 8/8 passing on first implementation attempt.
- [x] 5.5 RED: `src/features/yarns/ui/YarnFilterPanel.test.tsx` — unit tests
      for the pure `scopeOf`/`parseScope` codec (no rendering, zero mocks);
      an AND-composition test asserting brand→type→colour selections
      accumulate into one `YarnFilters` object without dropping earlier
      picks; a keyboard-only pass; `axe`.
- [x] 5.6 GREEN: created `src/features/yarns/ui/YarnFilterPanel.tsx`
      (`scopeOf`/`parseScope` translate between the single `YarnFilters`
      object and each child's own encoding) and wired it into
      `YarnsView.tsx` — `filters` is now `useState` fed by
      `setFilters`/`YarnFilterPanel`, laid out as a sidebar next to the
      existing states/grid; `requestKeyOf`/`getYarns` needed **no change**,
      they already read `filters.brandId`/`typeId`/`colorFamily` since S3.
      Also fixed a **pre-existing test-fixture bug this wiring exposed** in
      `YarnsView.test.tsx`: `serve()` used one shared `mockResolvedValue(...)`
      `Response` object for every `fetch` call; with a second concurrent
      fetch now in flight (`YarnBrandTree`'s `/api/brands`), both consumers
      raced to read the same `Response` body, and `.json()` on the
      already-consumed one corrupted `getYarns`'s result — the card list
      silently fell back to the error state. Fixed by making the mock
      URL-aware and returning a fresh `Response` per call; also replaced the
      empty-state test's brittle "zero buttons anywhere" assertion (broken
      now that the filter panel's 13 colour swatches are always mounted)
      with "no `<ul role="list">` grid", which is what "no cards" actually
      means. Added one new integration test proving the wire end-to-end:
      selecting a brand in the panel re-issues `getYarns` with `brandId` in
      the querystring.
- [x] 5.7 Updated `src/features/yarns/ui/yarns-ui.classes.test.ts` —
      `COMPONENTS` gained `YarnBrandTree.tsx`/`ColorFamilyFilter.tsx`/
      `YarnFilterPanel.tsx`; `EXTERNAL_SOURCES` gained one new name,
      `"family"` — `ColorFamilyFilter` calls `yarnSwatchClass(family)` where
      `family` is a `.map()` callback parameter, and the gate's resolver
      only tracks module-level `const`/`function` declarations as "local," so
      a function *parameter* is external to it exactly like `yarn` already
      was for `YarnCard` (same call, same shape, other side of the
      argument). Documented with a written reason, not reshaped away, per
      the prompt's explicit trap guidance. 11/11 passing after the update.
- [x] 5.8 Same review scope — added `## 7-bis. Enmienda E1` to
      `docs/design/rfc/RFC-04-lanas.md` (Spanish, RFC-03 heading format,
      dated 2026-09-19): E1(a) `GET /api/yarns` returns `brandName`/`typeName`
      additively, no consumer change; E1(b) the «ícono» of §1/§2 is the
      generic `Swatch` at card size, not a new asset; E1(c) the card's tap is
      a no-op until entry 24 ships the drawer.
- [x] 5.9 Verify — automated part done, see Full Verification below.
      **Browser keyboard-only pass over `/lanas` is OUTSTANDING** — no
      browser tool available to this executor. Two things the orchestrator's
      browser pass must specifically check:
      1. The S4a-inherited `preventDefault` question (above, unchanged):
         confirm Enter AND Space separately on a brand's `<summary>` don't
         double-toggle.
      2. **New discovery this slice**: because "yarn-scope" is one native
         radio group spanning multiple `Disclosure` panels, plain sequential
         `Tab` alone does **not** reach an unselected radio inside a panel —
         native HTML radio-group semantics give the whole group exactly ONE
         tab stop (whichever member is currently `checked`), and every other
         member is skipped by `Tab` regardless of whether its panel is open.
         Measured with a disposable scratch test before writing the real
         suite (confirmed: `Tab` after opening a panel landed on the *next*
         focusable element entirely, skipping both the newly-mounted
         "Toda la marca" radio and the type radio), then confirmed the real
         mechanism (`ArrowDown`/`ArrowRight` inside the group moves focus
         **and** selection together, exactly as design D5-bis's own text
         says: "Tab into the panel, then Space **or arrow keys** selects").
         `YarnFilterPanel.test.tsx`'s keyboard test now exercises the real
         path (Tab to the group → open the panel → Shift+Tab back to the
         group → ArrowDown twice → Tab onward to the colour row). The
         browser pass should confirm arrow-key navigation feels right to a
         real screen-reader/keyboard user, not just that it is technically
         reachable.
- [x] 5.10 Success Criteria from `proposal.md`, checked literally:
      1. `GET /api/yarns` returns `brandName`/`typeName`, filters/scoping/
         status codes unchanged — **Met** (S1, still true, untouched this
         slice).
      2. Generic `Swatch` in `shared/ui`, no `ColorFamily` import, app-side
         map in `shared/config`, no duplicate left in `features/` — **Met**
         (S2, untouched this slice).
      3. `/lanas` renders the card grid and its empty/error/loading states —
         **Met** (S3, untouched this slice; still green per this slice's own
         full-suite run).
      4. Brand→type tree and colour-family swatches filter the list and are
         keyboard-operable — **Filtering: Met** (wired this slice, proven by
         `YarnFilterPanel.test.tsx`'s AND-composition test and
         `YarnsView.test.tsx`'s new end-to-end wiring test). **Keyboard
         operability: Met by RTL/axe evidence, pending the outstanding
         browser confirmation from 5.9** — every control is reachable and
         operable via `Tab`/`Enter`/`Space`/arrow keys in the RTL suite, but
         this executor cannot certify a real browser matches happy-dom here,
         and 5.9 already flags one open question (arrow-key navigation
         "feeling right") that only a real browser/AT pass can close.
      5. `pnpm lint`/`typecheck`/`test`/`build` green; RTL+axe per SDD-01 §9
         — **Met**, real output below; every new component ships RTL
         behavior tests, a render smoke assertion, and an `axe` assertion.
      6. RFC-04 E1 written; debt 192 filed; debt 168 struck through — **Met**
         (E1 written this slice; 192 filed in S3; 168 struck in S2 — all
         three now exist in the tree).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 5.1/5.2 | `YarnBrandTree.test.tsx` | Integration (RTL+axe) | N/A (new) | ✅ Written, confirmed failing (`Failed to resolve import "./YarnBrandTree"`) | ✅ 7/7 passing on first implementation | ✅ 7 cases: brand-alone, brand+type, reset, shared-group, marked-while-closed, failed-fetch-degrades, axe | ✅ Clean, no refactor needed |
| 5.3/5.4 | `ColorFamilyFilter.test.tsx` | Integration (RTL+axe) | N/A (new) | ✅ Written, confirmed failing (`Failed to resolve import "./ColorFamilyFilter"`) | ✅ 8/8 passing on first implementation | ✅ 8 cases: pressed-state, clear-on-reclick, switch-family, no-prior-selection, exact-count, Enter, Space, axe | ✅ Clean |
| 5.5/5.6 | `YarnFilterPanel.test.tsx` | Unit (codec, zero mocks) + Integration (RTL+axe) | N/A (new) | ✅ Written, confirmed failing (`Failed to resolve import "./YarnFilterPanel"`) | ✅ 6/6 passing (1 iteration needed on the keyboard test — see Issues Found) | ✅ 3 codec cases (all/brand-only/brand+type) + AND-composition + keyboard pass + axe | ✅ Clean |
| 5.6 (wiring) | `YarnsView.test.tsx` (existing, extended) | Integration (RTL) | ✅ 8/8 baseline before touching `YarnsView.tsx` | N/A — wiring + one new end-to-end test, not a fresh RED/GREEN unit | ✅ 9/9 after fixing the shared-`Response` fixture bug the wiring exposed | ✅ New wiring test drives an actual brand click through to a re-issued `fetch` call | ✅ Clean, safety-net stayed green throughout |
| 5.7 | `yarns-ui.classes.test.ts` (existing, extended) | Unit (AST + compiled CSS) | ✅ 11/11 baseline (8 tests × existing 2 components, before adding 3 more) | N/A — extending an existing gate's `COMPONENTS`/`EXTERNAL_SOURCES` anchors, not a fresh cycle | ✅ 11/11 passing after adding `"family"` (predicted before running, confirmed on first run) | ➖ N/A (structural anchor) | ➖ None needed |

### Test Summary

- **Total tests written**: 21 new (7 `YarnBrandTree` + 8 `ColorFamilyFilter`
  + 6 `YarnFilterPanel`) + 1 new integration test appended to
  `YarnsView.test.tsx`
- **Total tests passing**: 1958/1958 full repo suite (13 unrelated skips) —
  up from 1927 at the end of S4a
- **Layers used**: Unit (3: the `scopeOf`/`parseScope` codec cases), Integration/RTL (remainder)
- **Approval tests**: None — no refactoring tasks this slice (only new files
  plus additive wiring)
- **Pure functions created**: `scopeOf`, `parseScope` (both zero-mock unit
  tested directly)

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/features/yarns/ui/YarnBrandTree.tsx` | Created | brand→type tree, one shared radio group, eager parallel fetch (D7), degrades to disabled panel on failure |
| `src/features/yarns/ui/YarnBrandTree.test.tsx` | Created | 7 RTL+axe tests |
| `src/features/yarns/ui/ColorFamilyFilter.tsx` | Created | colour-family swatch row on `Toggle`+`Swatch` |
| `src/features/yarns/ui/ColorFamilyFilter.test.tsx` | Created | 8 RTL+axe tests |
| `src/features/yarns/ui/YarnFilterPanel.tsx` | Created | composes tree+colour row; `scopeOf`/`parseScope` codec |
| `src/features/yarns/ui/YarnFilterPanel.test.tsx` | Created | codec unit tests + AND-composition + keyboard pass + axe |
| `src/features/yarns/ui/YarnsView.tsx` | Modified | `filters` is live `useState`, sidebar layout with `YarnFilterPanel` |
| `src/features/yarns/ui/YarnsView.test.tsx` | Modified | URL-aware fetch mock (fixed shared-`Response` bug), fixed empty-state assertion, +1 wiring test |
| `src/features/yarns/ui/yarns-ui.classes.test.ts` | Modified | `COMPONENTS` +3, `EXTERNAL_SOURCES` +`"family"` (documented) |
| `docs/design/rfc/RFC-04-lanas.md` | Modified | `## 7-bis. Enmienda E1` (E1(a)/(b)/(c)) |

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm vitest run src/features/yarns/ui/YarnBrandTree.test.tsx src/features/yarns/ui/ColorFamilyFilter.test.tsx src/features/yarns/ui/YarnFilterPanel.test.tsx src/features/yarns/ui/YarnsView.test.tsx src/features/yarns/ui/yarns-ui.classes.test.ts` → 5 files, 7+8+6+9+11 = **41/41 passing** |
| Runtime harness command/scenario and exact result | `pnpm build` → Next.js 16.2.10 (Turbopack), compiled successfully, TypeScript clean, `/lanas` still generated as `ƒ /lanas`, no route table regression |
| Rollback boundary | Delete `YarnBrandTree.{tsx,test.tsx}`, `ColorFamilyFilter.{tsx,test.tsx}`, `YarnFilterPanel.{tsx,test.tsx}`; revert `YarnsView.tsx` to its S3 shape (`useState<YarnFilters>({})` with no setter used) and `YarnsView.test.tsx`'s wiring test + fetch-mock fix; revert the 3 new `COMPONENTS` entries and `"family"` in `yarns-ui.classes.test.ts`; revert the RFC-04 amendment. `/lanas` keeps rendering cards without any filter tree — no other slice depends on S4b. |

### Full Verification (task 5.9, automated part) — real output

1. `pnpm lint` → `$ eslint .` — clean, zero output, exit 0.
2. `pnpm typecheck` → `$ tsc --noEmit` — clean, zero output, exit 0.
3. `pnpm test` (full repo) → `Test Files  110 passed | 3 skipped (113)` /
   `Tests  1958 passed | 13 skipped (1971)`, 107.25s, exit 0.
4. `pnpm build` → Next.js 16.2.10 (Turbopack), compiled successfully in
   9.3s, TypeScript finished in 10.4s, 17 static pages generated, full route
   table includes `ƒ /lanas` unchanged.
5. Manual browser keyboard-only pass over `/lanas` filters (REGLA 4):
   **NOT RUN** — no browser tool available to this executor; explicitly
   outstanding for the orchestrator, with the two specific things to check
   listed under task 5.9 above.

### Deviations from Design

None from `design.md`'s D5/D5-bis/D6/D7 — the shared-radio-group,
brand-alone-filters, `useState`-not-URL, and eager-parallel-fetch decisions
are all implemented exactly as specified. One **implementation-detail
discovery not anticipated by design/tasks**, already logged above: a single
`name`-grouped radio set spanning multiple `Disclosure` panels gives the
whole group exactly one native `Tab` stop, so reaching an unselected member
requires arrow keys once any group member has focus — this is not a defect,
it is exactly what design D5-bis's own text ("Tab into the panel, then Space
**or arrow keys** selects") already anticipated, but it is worth flagging
explicitly because a naive reading of the tasks' "keyboard operable (Tab,
Enter/Space)" phrasing could lead a future browser-pass reviewer to expect a
plain `Tab`-only sweep to reach every control, which it will not.

### Issues Found

One self-corrected test-design mistake, not a production defect: the first
draft of `YarnFilterPanel.test.tsx`'s keyboard-pass test assumed `Tab` alone
would walk sequentially through "Todas las marcas" → "Toda la marca" → the
type radio → the colour row. It failed on the third assertion (`Tab` landed
on the colour swatch directly, skipping both radios) — this is what surfaced
the native radio-group discovery above. Verified the real mechanism with a
disposable scratch test (two throwaway `.test.tsx` files, both deleted
before finalizing), then rewrote the test to use `Shift+Tab` back into the
group followed by `ArrowDown` — now passing and, more importantly, actually
asserting a mechanism a real keyboard user would use.

### Workload / PR Boundary (Phase 5)

- Mode: chained PR slice (`feature-branch-chain`), tip of the tracker.
- Current work unit: S4b yarn-filter-tree (PR 5, base: S4a branch
  `feature/23-s4a-disclosure-primitive`).
- Boundary: starts from `YarnsView.tsx`'s inert, unconnected
  `useState<YarnFilters>({})` (S3) and ends with a fully wired brand→type
  tree + colour-family row, filtering the real list, with the S4a `Disclosure`
  primitive as the only cross-slice dependency (unmodified).
- Estimated review budget impact: **390 non-test changed lines** —
  `YarnBrandTree.tsx` 177, `ColorFamilyFilter.tsx` 49, `YarnFilterPanel.tsx`
  65, `YarnsView.tsx` 74 (42 additions + 32 deletions), `RFC-04-lanas.md` 25 —
  **under** the 400-line hard budget (by 10 lines) and inside this slice's
  own 260-340 forecast (slightly over the top of that range, driven mostly by
  `YarnBrandTree.tsx`'s fetch-and-degrade logic, which doesn't compress
  further without dropping the D7 parallel-fetch or the failure-degradation
  path). Test-file lines (`YarnBrandTree.test.tsx` 143 +
  `YarnFilterPanel.test.tsx` 163 + `ColorFamilyFilter.test.tsx` 96 +
  `YarnsView.test.tsx` 67 + `yarns-ui.classes.test.ts` 27 = 496) excluded per
  the non-test-only rule. Total changed lines including tests: **886**, well
  under the 900-line runtime ceiling.

### Git (Phase 5)

Branch `feature/23-s4b-yarn-filter-tree`, cut from
`feature/23-s4a-disclosure-primitive` — working tree left uncommitted and
unstaged per instructions (used `git add -N .` for accurate `--numstat`,
then `git reset` immediately after — no snapshot, no commit, no push).

### Remaining Tasks

None for backlog entry 23 — this was its last child PR. Outstanding items
for the orchestrator before archiving:

- [ ] S2 task 2.8's manual browser check (13 swatch colours).
- [ ] S3 task 3.11's manual browser pass over `/lanas` (cards/empty/error/loading).
- [ ] S4b task 5.9's manual browser keyboard-only pass (including the two
      specific checks listed under 5.9 above: the S4a `preventDefault`
      question, and arrow-key navigation across the shared radio group).
