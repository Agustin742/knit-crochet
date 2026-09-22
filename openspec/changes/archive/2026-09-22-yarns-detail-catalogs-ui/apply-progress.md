# Apply Progress: yarns-detail-catalogs-ui (backlog 24)

> **Note on this file's history.** No `apply-progress.md` and no matching
> Engram observation existed on disk when this Phase-2 apply session started,
> despite Phase 1 (S1) being fully implemented and committed
> (`472d78c`/`061bd32`/`188cafe`). Phase 1 below is reconstructed from those
> three commits, `tasks.md`'s existing `[x]` marks, and the working tree, not
> transcribed from a prior progress artifact. Phase 2 is this session's own
> work, recorded live.

## Phase 1: S1 `yarn-detail-drawer` (PR 1, base: tracker `feature/24-...`)

**Status**: 21/21 tasks complete (1.1-1.21), including the browser pass —
reconstructed from commits, not run by this session.

### Completed Tasks (reconstructed)

- [x] 1.1-1.5 — `Stepper` primitive (`src/shared/ui/primitives/stepper/`):
      controlled-only `value`/`onValueChange`, optional `min`/`max` (no
      ceiling by default), two `Button variant="secondary" size="icon"`
      controls, value in `<output role="status">`, no custom key handling
      (native button activation covers Enter/Space). Boundary test mirrors
      `Swatch.boundary.test.ts` (no `shared/config` import, no
      `yarn`/`usedQuantity`/`ovillo` literal). Wired into
      `primitives/index.ts` and `public-api.test.ts`'s `PRIMITIVES` anchor.
      Commit `472d78c` (S1a).
- [x] 1.6-1.10 — `mergeYarnPatch` (`merge-yarn.ts`) folds a `PATCH` response
      into the existing list item, re-pinning `brandName`/`typeName` after
      the spread so the merge survives even though the declared return type
      (`SerializedYarnListItem`) makes `return patched` fail typecheck —
      the forbidden move is a compile error, not just a test. `types.ts`
      gained `SerializedYarnRecord`/`YarnDetailPayload`; `yarns-client.ts`
      gained `patchYarnUsedQuantity` sending exactly `{ usedQuantity }`.
- [x] 1.11-1.16 — `YarnDetailDrawer.tsx` (`Dialog placement="side" size="lg"`,
      prop-driven, no fetch of its own, all 11 fields, «Editar» reachable
      no-op); `YarnCard.tsx` gained `onOpen` replacing `noOpTap`;
      `YarnsView.tsx` gained `detailId` state resolved via
      `find(y => y.id === detailId) ?? null` and the PATCH merge wired by id
      (never index, never `loaded.key`).
- [x] 1.17-1.18 — `YarnDetailDrawer` exported from `features/yarns/ui/index.ts`;
      **known gap found during Phase 2 apply**: `yarns-ui.classes.test.ts`'s
      `COMPONENTS` list does NOT actually contain `YarnDetailDrawer.tsx` as
      of the start of this Phase 2 session, even though this task is marked
      `[x]` and the commit message doesn't mention it either. Flagged for
      `sdd-verify` — **not corrected by this Phase-2-scoped apply**, since
      Phase 3 is the only phase this executor is authorized to touch besides
      2, and this is a Phase 1 file/claim.
- [x] 1.19 — RFC-04-lanas.md `## 7-ter. Enmienda E2` added (between §7-bis
      and §8) with **E2(a)** (Stepper genérico, piso 0 sin techo) and
      **E2(b)** («Editar» no-op), Spanish, attributed to the SDD change.
- [x] 1.20 — `deuda-tecnica.md`: debt 192 struck with **Cómo se saldó**/
      **Dónde quedó la prueba**; new debt 199 filed 🟠 for the «Editar»
      no-op button's visual weight (later corrected in `188cafe`, see below);
      193 left untouched.
- [x] 1.21 — Browser verification (REGLA 4): per commit `188cafe`'s message,
      run with throwaway data (deleted afterwards): tapping a card opens the
      drawer, the stepper moves 2→3, the card keeps
      "marca · tipo · colorName" with no `undefined` and no skeleton flash.
      That same pass found the «Editar» button shipped `variant="primary"`
      — by far the widest, most prominent control in the panel — for a
      documented no-op; fixed to `variant="secondary"` in the same commit,
      with the measurement recorded in debt 199 rather than in a comment
      (the first version of that comment quoted pixel widths and tripped
      `no-hardcode`, which cannot tell a comment from a style value).

### Full Verification (Phase 1, per `061bd32`/`188cafe` commit messages)

`pnpm lint`, `typecheck`, `test` (2011 passed, 13 skipped) and `build` all
green; 358 non-test changed lines, within the 400-line budget.

### Git (Phase 1)

Commits `472d78c` (S1a), `061bd32` (S1b), `188cafe` (fix). Already merged
into the working branch history — this session found them already committed
on `feature/24-s2a-catalog-read-create`'s ancestry.

---

## Phase 2: S2a `catalog-read-create` (PR 2, base: S1 branch)

**Status**: 12/12 automated tasks complete (2.1-2.12). Task **2.13 (browser
verification) LEFT OPEN** — this executor has no browser tool.

### Completed Tasks

- [x] 2.1 RED — `src/features/yarns/ui/brands-client.test.ts` (new, 12
      tests): `getBrandTree` 1+N happy path (two brands, one with a type, one
      without), `failed` on a non-200 `/api/brands`, `failed` on any
      per-brand types `GET` failing, `failed` on a network rejection;
      `createBrand`/`createYarnType` 201 shapes, 400/404, and network
      failure all → `ok:false`. Written and confirmed failing first
      (`Cannot find module './brands-client'`) before any production code.
- [x] 2.2 GREEN — `src/features/yarns/ui/brands-client.ts` (new): `getBrandTree`
      is `YarnBrandTree.tsx`'s old module-level `fetchTree` moved verbatim
      (same 1+N `fetch` shape, same try/catch-to-`failed` degradation,
      `BrandTreeEntry`/`BrandTreeState` exported instead of file-local);
      `createBrand(name)` → `POST /api/brands` `{ name }` → `201 { brand }`;
      `createYarnType(brandId, name)` → `POST /api/brands/:id/types`
      `{ name }` → `201 { type }`. Record types (`BrandRecord`,
      `YarnTypeRecord`) imported via `@/features/yarns/types`, never the
      feature barrel (same reason as `yarns-client.ts:9-11`: the barrel
      drags `./api` → Drizzle into the browser bundle). 12/12 passing.
- [x] 2.3 RED (extend) — `YarnBrandTree.test.tsx` gained two tests: a
      `catalogToken` change re-issues `GET /api/brands` (asserted by
      counting calls to that exact URL before/after `rerender`); a plain
      re-render with no `catalogToken` change does NOT re-issue it. Safety
      net run first: 9/9 passing baseline before touching production code.
      Confirmed RED for the right reason (`expected 1 to be 2`, not an
      import/syntax error).
- [x] 2.4 GREEN — `YarnBrandTree.tsx`: deleted the local `fetchTree` and its
      file-local `BrandTreeEntry`/`BrandTreeState` types, imports both from
      `./brands-client`; added `catalogToken?: number` (default `0`) to the
      component's props, added purely to the fetch effect's dependency
      array (`[catalogToken]` instead of `[]`) — additive, so reverting S2
      restores the exact `[]`-dep effect. 11/11 passing (9 existing + 2 new).
- [x] 2.5 RED — `src/features/yarns/ui/YarnCatalogPanel.test.tsx` (new, 9
      tests): `aria-busy` on the panel's own `role="group"` region while its
      independent fetch is in flight (deferred promise, resolved mid-test);
      `failed` shows the error message and a retry that re-fetches
      successfully; `empty` shows the empty message AND still mounts the
      brand-create form; `ready` shows the brand and its existing type;
      brand-create 201 appends to the list, clears the field, calls
      `onCatalogChange` exactly once; brand-create 400 shows an alert, adds
      nothing, never calls `onCatalogChange`; type-create 201 appends inside
      that brand's own nested panel and calls `onCatalogChange` once;
      type-create 404 (brand deleted elsewhere) shows an alert, never calls
      `onCatalogChange`; one `axe` assertion on the populated, open panel.
      Confirmed RED (`Failed to resolve import "./YarnCatalogPanel"`).
- [x] 2.6 GREEN — `src/features/yarns/ui/YarnCatalogPanel.tsx` (new, 293
      lines): outer `Disclosure summary="Catálogos"` (closed by default,
      same primitive the tree already uses); its content is a
      `role="group" aria-label="Catálogos"` region carrying `aria-busy`
      while `getBrandTree()` (its OWN call, independent of the tree's) is
      in flight. Four states exactly per design D4: `loading` → two
      `Skeleton` rows; `failed` → `role="alert"` message + a `Button` that
      bumps a local `retryToken` (re-runs the same effect); `ready` with
      zero entries → empty message, form still mounted; `ready` with
      entries → one nested `Disclosure` per brand (own
      `role="group" aria-label={brand.name}` panel: existing types listed,
      one type-create form), plus one brand-create form at the end. Both
      create forms append the 201 result **in memory** (no refetch — the
      server already returned the object) and call `onCatalogChange`
      exactly once, only on that success path. Submission errors render as
      a local `<p role="alert">`, deliberately NOT through `Field`'s `error`
      prop — that prop wires `aria-describedby` for field-level validation,
      a different semantic from an action-level failure alert (same split
      `ActionError` makes in `projects/ui/DetailTabParts.tsx`). 9/9 passing.
- [x] 2.7 RED (extend) — `YarnFilterPanel.test.tsx` gained three tests: the
      "Catálogos" section renders; a `catalogToken` change reaches the tree
      through the panel (more `/api/brands` `GET` calls after a token bump);
      a successful brand create inside the mounted catalog panel raises the
      parent's `onCatalogChange` exactly once. Safety net: 7/7 baseline.
      Confirmed RED (3 failing / 7 passing — `getByText("Catálogos")` not
      found, right reason).
- [x] 2.8 GREEN — `YarnFilterPanel.tsx`: added `catalogToken?`/
      `onCatalogChange?` props, forwarded `catalogToken` to `YarnBrandTree`
      unchanged, mounted `YarnCatalogPanel` as the `Card`'s last child (same
      surface as the tree and colour row — debt 196 not repeated) with
      `onCatalogChange` forwarded straight through. 10/10 passing.
- [x] 2.9 RED (extend) — `YarnsView.test.tsx` gained one test: a successful
      create inside the catalog panel increases the count of `GET
      /api/brands` calls made specifically by the tree (proving
      `catalogToken` actually propagated end to end, not just that the
      panel shows the new brand locally). Safety net: 14/14 baseline.
      Confirmed RED (1 failed timing out waiting for a second `GET` call
      that never came / 14 passed — right reason).
- [x] 2.10 GREEN — `YarnsView.tsx`: added `catalogToken` state and
      `handleCatalogChange` (`setCatalogToken(t => t + 1)`), passed both to
      `YarnFilterPanel`. The dangling-filter branch
      (`removed?: { brandId?; typeId? }`) from design D5 is **deliberately
      not implemented yet** — S2a has no delete path to produce a `removed`
      value, and task 2.10's own text defers that branch to S2b (tasks
      3.7-3.8). 15/15 passing.
- [x] 2.11 — `yarns-ui.classes.test.ts`: `COMPONENTS` gained
      `"YarnCatalogPanel.tsx"`. No `EXTERNAL_SOURCES` change needed — the
      panel introduces no external class source (no `className` prop, no
      app-side class map). 12/12 passing.
- [x] 2.12 — `docs/design/rfc/RFC-04-lanas.md` §7-ter gained **E2(c)**: the
      panel lives in the filter column, as the last child of the same
      `Card` as the tree and colour row (debt 196 not repeated), reusing the
      generic `Disclosure` for both the section and each brand. Spanish,
      attributed to the SDD change via the section's existing intro
      paragraph (never to "leader" — that role was deleted with the old
      harness).
- [ ] 2.13 — Browser verification (REGLA 4): **NOT RUN.** This executor has
      no browser tool. The orchestrator must, on a real `/lanas`: create a
      brand and a type through the panel, confirm the brand→type tree
      refreshes without a page reload, and check contrast on the panel's
      `Card` surface (same class of check that caught debt 196 originally —
      confirmed here only by code inspection that the panel is the `Card`'s
      last child, never assumed).

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.1/2.2 | `brands-client.test.ts` | Unit (fetch mocks) | N/A (new file) | ✅ Written — failed on missing module | ✅ 12/12 passing | ✅ 12 cases: 1+N happy path, 3 distinct `failed` triggers, 4 create-brand cases, 4 create-type cases | ➖ None needed — direct HTTP wrapper, matches `yarns-client.ts` shape |
| 2.3/2.4 | `YarnBrandTree.test.tsx` | Integration (RTL) | ✅ 9/9 baseline | ✅ Written — failed on wrong call count (`expected 1 to be 2`) | ✅ 11/11 passing | ✅ 2 cases: token change re-fetches, plain re-render does not | ➖ None needed |
| 2.5/2.6 | `YarnCatalogPanel.test.tsx` | Integration (RTL+axe) | N/A (new file) | ✅ Written — failed on missing module | ✅ 9/9 passing | ✅ 9 cases: loading/failed+retry/empty+form/ready, brand-create success+failure, type-create success+failure, axe | ✅ Removed a synchronous `setState` in the fetch effect's body after `pnpm lint` flagged `react-hooks/set-state-in-effect`; behavior unchanged (initial `loading` state comes from `useState`'s initializer, not a reset) |
| 2.7/2.8 | `YarnFilterPanel.test.tsx` | Integration (RTL) | ✅ 7/7 baseline | ✅ Written — failed on missing "Catálogos" text (3/10 failing) | ✅ 10/10 passing | ✅ 3 cases: section renders, token forwarding, onCatalogChange forwarding | ➖ None needed |
| 2.9/2.10 | `YarnsView.test.tsx` | Integration (RTL) | ✅ 14/14 baseline | ✅ Written — failed on `waitFor` timeout (no second `/api/brands` call) | ✅ 15/15 passing | ➖ Single scenario — the wiring is a direct increment, no branching to triangulate yet (branching arrives in S2b) | ➖ None needed |
| 2.11 | `yarns-ui.classes.test.ts` | Unit (AST + compiled CSS) | ✅ 12/12 baseline (before adding the new entry) | N/A — extending an existing gate's `COMPONENTS` anchor, not a fresh cycle | ✅ 12/12 passing after adding the entry | ➖ N/A (structural anchor) | ➖ None needed |

### Test Summary

- **Total tests written**: 27 new (12 `brands-client` + 2 `YarnBrandTree` +
  9 `YarnCatalogPanel` + 3 `YarnFilterPanel` + 1 `YarnsView`), 0 in
  `yarns-ui.classes.test.ts` (structural anchor only)
- **Total tests passing (full repo suite)**: 2043/2043 (13 unrelated skips,
  up from 2011 at the start of this session)
- **Layers used**: Unit (`brands-client.test.ts`), Integration/RTL+axe (the
  rest)
- **Approval tests**: None — no refactoring tasks this slice, only new files
  plus additive wiring
- **Pure functions created**: 0 net new standalone pure functions (the
  create/get wrappers are thin `fetch` I/O, same shape as `yarns-client.ts`)

### Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/features/yarns/ui/brands-client.ts` | Created | `getBrandTree` (moved verbatim), `createBrand`, `createYarnType` |
| `src/features/yarns/ui/brands-client.test.ts` | Created | 12 unit tests |
| `src/features/yarns/ui/YarnCatalogPanel.tsx` | Created | read+create catalogue section, own fetch/loading/error/empty/ready states |
| `src/features/yarns/ui/YarnCatalogPanel.test.tsx` | Created | 9 RTL+axe tests |
| `src/features/yarns/ui/YarnBrandTree.tsx` | Modified | local `fetchTree` deleted, imports `getBrandTree`, `catalogToken?` added to effect deps |
| `src/features/yarns/ui/YarnBrandTree.test.tsx` | Modified | +2 tests for `catalogToken` |
| `src/features/yarns/ui/YarnFilterPanel.tsx` | Modified | mounts `YarnCatalogPanel` as `Card`'s last child, forwards `catalogToken`/`onCatalogChange` |
| `src/features/yarns/ui/YarnFilterPanel.test.tsx` | Modified | +3 tests |
| `src/features/yarns/ui/YarnsView.tsx` | Modified | `catalogToken` state + `handleCatalogChange` (increment only) |
| `src/features/yarns/ui/YarnsView.test.tsx` | Modified | +1 end-to-end wiring test |
| `src/features/yarns/ui/yarn-copy.ts` | Modified | catalogue panel copy constants (Spanish) |
| `src/features/yarns/ui/yarns-ui.classes.test.ts` | Modified | `COMPONENTS` +`YarnCatalogPanel.tsx` |
| `docs/design/rfc/RFC-04-lanas.md` | Modified | §7-ter gains **E2(c)** |

### Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm vitest run src/features/yarns/ui/brands-client.test.ts src/features/yarns/ui/YarnCatalogPanel.test.tsx src/features/yarns/ui/YarnBrandTree.test.tsx src/features/yarns/ui/YarnFilterPanel.test.tsx src/features/yarns/ui/YarnsView.test.tsx src/features/yarns/ui/yarns-ui.classes.test.ts` → 6 files, **12+9+11+10+15+12 = 69/69 passing** |
| Runtime harness command/scenario and exact result | `pnpm build` → Next.js 16.2.10 (Turbopack), compiled successfully, TypeScript clean, all 17 static + dynamic pages including `ƒ /lanas`, route table unchanged from Phase 1 (no new route this slice) |
| Rollback boundary | Delete `brands-client.{ts,test.ts}` and `YarnCatalogPanel.{tsx,test.tsx}`; revert `YarnBrandTree.tsx` to its inline `fetchTree` (restores the `[]`-dep effect exactly, per design D5); revert `YarnFilterPanel.tsx` to not mount the catalog panel; revert `YarnsView.tsx`'s `catalogToken`/`handleCatalogChange`; revert the `yarn-copy.ts` catalogue constants, the `yarns-ui.classes.test.ts` entry, and the RFC-04 E2(c) paragraph. S1's drawer/stepper path is untouched by any of this and keeps working. |

### Full Verification (real output, this session)

1. `pnpm lint` → `$ eslint .` — clean, zero output, exit 0 (one error found
   and fixed mid-session: `react-hooks/set-state-in-effect` on
   `YarnCatalogPanel.tsx`'s fetch effect; fixed by removing the synchronous
   `setState({status:"loading"})` call at the top of the effect body — the
   initial `loading` state already comes from `useState`'s own initializer,
   so nothing behavioral changed).
2. `pnpm typecheck` → `$ tsc --noEmit` — clean, zero output, exit 0 (one
   error found and fixed mid-session: `brands-client.test.ts`'s `fetchSpy`
   was declared as `vi.fn(defaultFetch)`, which narrowed `mock.calls`'
   element type to `defaultFetch`'s single-argument signature and broke the
   `init` destructuring used by the create tests; fixed by declaring it as
   untyped `vi.fn()`, matching `yarns-client.test.ts`'s existing pattern).
3. `pnpm test` (full repo, `vitest run`) → **`Test Files  116 passed | 3
   skipped (119)`** / **`Tests  2043 passed | 13 skipped (2056)`**, 116.09s,
   exit 0. (Up from 2011 passed/13 skipped at session start — net +32 tests:
   27 new tests listed above, plus safety-net re-runs are not double-counted
   here since they're the same test files before/after.)
4. `pnpm build` → `✓ Compiled successfully in 12.1s`, TypeScript finished in
   13.1s, 17 static pages generated (3 workers), full route table unchanged
   from Phase 1 (`ƒ /lanas` present, no new routes this slice — correct,
   S2a adds no endpoint).

### Deviations from Design

None from `design.md` D4/D5 — `YarnCatalogPanel`'s own independent fetch +
four states, `Disclosure`-on-`Disclosure` nesting, in-memory append on
create, and the one-directional `onCatalogChange` signal all match design
exactly. Two implementation details the design's prose didn't spell out,
both resolved without contradicting it:

1. **Where `catalogToken` stops.** Design D5 says the panel "raises
   `onCatalogChange`" and the tree "gains `catalogToken?`" — it does not
   say whether the panel itself also *consumes* a `catalogToken`. Resolved
   as: no. The panel manages its own list via in-memory append on success,
   so it never needs an externally-driven refetch in this slice; only the
   separate `YarnBrandTree` instance (a different component, a different
   fetch, reading the same server data for a different purpose) consumes
   the token. This keeps the signal genuinely one-directional as the prompt
   required, rather than a shared cache both sides poll.
2. **Submission-error presentation.** Design doesn't specify whether create
   failures render through `Field`'s `error` prop or a separate alert.
   Resolved by following the existing `ActionError` precedent
   (`projects/ui/DetailTabParts.tsx`): a local `<p role="alert">`, because
   `Field`'s `error` wires `aria-describedby` for field-level validation, a
   different accessibility contract from an action-level failure that
   needs to interrupt (RTL confirmed `Field`'s plain `<span>` message has
   no implicit alert role, so this was a real choice, not a style nit).

### Issues Found

1. **Pre-existing gap, not fixed here** (see Phase 1's 1.17-1.18 entry
   above): `yarns-ui.classes.test.ts`'s `COMPONENTS` list is missing
   `YarnDetailDrawer.tsx` despite task 1.18 claiming it was added. The gate
   still passes (12/12) because it iterates whatever list is present — it
   cannot detect its own incompleteness. Flagged for `sdd-verify`; correcting
   it is a Phase 1 file and outside this session's Phase-2-only scope.
2. Two gate-driven mid-session fixes, both already covered under Full
   Verification above (the `react-hooks/set-state-in-effect` lint error and
   the `brands-client.test.ts` typing error) — neither changed any tested
   behavior, both caught by the gates exactly as designed.

### Budget (Phase 2 / S2a) — reported honestly, not trimmed

`tasks.md`'s forecast for S2a was **~180 non-test / ~220 test**. The actual
numbers, computed from `git diff --numstat` (tracked, modified files) plus
raw line counts of the new untracked files (no deletions to net against):

| File | Status | Non-test lines | Test lines |
|---|---|---|---|
| `brands-client.ts` | New | 122 | — |
| `brands-client.test.ts` | New | — | 164 |
| `YarnCatalogPanel.tsx` | New | 293 | — |
| `YarnCatalogPanel.test.tsx` | New | — | 243 |
| `YarnBrandTree.tsx` | Modified (+16/-49) | 65 | — |
| `YarnBrandTree.test.tsx` | Modified (+41/-0) | — | 41 |
| `YarnFilterPanel.tsx` | Modified (+12/-1) | 13 | — |
| `YarnFilterPanel.test.tsx` | Modified (+68/-0) | — | 68 |
| `YarnsView.tsx` | Modified (+15/-1) | 16 | — |
| `YarnsView.test.tsx` | Modified (+42/-0) | — | 42 |
| `yarn-copy.ts` | Modified (+15/-0) | 15 | — |
| `yarns-ui.classes.test.ts` | Modified (+1/-0) | — | 1 |
| `RFC-04-lanas.md` | Modified (+9/-0) | 9 | — |
| **Subtotal** | | **533** | **559** |

**Non-test: 533. Test: 559. Total changed lines: 1092.** This is well over
both the slice's own forecast (~180/~220) and the hard 400-line non-test
budget the design's own open question anticipated splitting S2 to stay
under. The two largest contributors are `YarnCatalogPanel.tsx` (293 lines —
a four-state panel with two nested create forms and their own
loading/error/empty handling is inherently more code than a single-state
component) and its test file (243 lines — 9 scenarios × RTL setup).
Reported as-is per instruction; nothing was trimmed to look smaller, and no
required coverage (the four states, both create paths, both failure paths,
axe) was cut to hit a number. **Flagged as a risk for the orchestrator**:
this PR's real size may warrant a narrower split next time (e.g. panel
list+read vs. panel create, or extracting `BrandCreateForm`/`TypeCreateForm`
review separately), but that decision belongs to the orchestrator/maintainer,
not to this executor mid-slice.

### Git (Phase 2)

Branch `feature/24-s2a-catalog-read-create`, cut from
`feature/24-s1b-detail-drawer` per the prompt. Working tree left
**uncommitted and unpushed**, exactly as instructed.

### Remaining Tasks

- [ ] 2.13 — Browser verification (REGLA 4), orchestrator only (see above).
- [ ] 3.1-3.11 — Phase 3, S2b `catalog-delete-409` (deletion, `ConfirmDialog`,
      409 notice, dangling-filter reset). **Explicitly not started** per the
      prompt's instruction to stop at the end of Phase 2.

### Workload / PR Boundary

- Mode: chained PR slice (`feature-branch-chain`)
- Current work unit: S2a `catalog-read-create` (PR 2, base: S1 branch
  `feature/24-s1b-detail-drawer`)
- Boundary: starts from `YarnBrandTree.tsx`'s inline, non-reusable
  `fetchTree` with no freshness signal, and ends with a shared
  `brands-client.ts`, a read+create `YarnCatalogPanel` mounted in the same
  filter `Card`, and a working one-directional `catalogToken`/
  `onCatalogChange` signal from panel → tree — with delete, the 409 notice,
  and the dangling-filter reset explicitly deferred to S2b (Phase 3).
- Estimated review budget impact: **533 non-test / 559 test changed lines**
  (see Budget section above) — over this slice's own forecast and the
  400-line non-test ceiling. Flagged, not hidden.
