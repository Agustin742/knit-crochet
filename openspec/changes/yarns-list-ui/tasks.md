# Tasks: Yarns list page with hierarchical filter (backlog 23)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 890-1420 (S1 150-220, S2 140-200, S3 300-400, S4a 90-140, S4b 260-340) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | tracker(23) → S1 → S2 → S3 → S4a → S4b |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

**S4 split.** Design's Open Question flagged S4 (`Disclosure` primitive + tree +
colour row + tests) as likely over budget. Forecast: primitive + RTL/axe ≈
90-140 lines, tree + colour row + wiring + RTL ≈ 260-340 lines — combined
350-480, above 400 with real risk of overrun. Split per proposal/design
authorization into **S4a `disclosure-primitive`** and **S4b
`yarn-filter-tree`**, each its own PR in the chain.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| S1 backend-names | `listYarns` join, `YarnListItem`, route | PR 1 (base: tracker `feature/23-yarns-list`) | `pnpm test store.test.ts yarns-route.test.ts` | `pnpm dev` → `GET /api/yarns` returns `brandName`/`typeName` | Revert S1 commit; route returns raw `YarnRecord[]` again, no consumer reads new fields yet |
| S2 swatch-split | `Swatch` primitive, `yarnSwatchClass` map, `YarnsTab` composition | PR 2 (base: S1 branch) | `pnpm test Swatch.test.tsx yarn-swatch.classes.test.ts public-api.test.ts` | N/A — no page changed yet, RTL+axe cover the primitive | Revert S2 commit; deletes new files, restores local `YarnSwatch`/`yarnSwatchColor` in `YarnsTab.tsx`; undo debt 168 strike-through with it |
| S3 list-cards-states | `/lanas` page, view, card, three states | PR 3 (base: S2 branch) | `pnpm test YarnsView.test.tsx YarnCard.test.tsx yarns-ui.classes.test.ts` | `pnpm dev` → visit `/lanas`, confirm cards/empty/error/loading (REGLA 4) | Delete `src/app/(app)/lanas/` and `src/features/yarns/ui/`; revert debt 192 entry with it |
| S4a disclosure-primitive | `Disclosure` primitive on `<details>`/`<summary>` | PR 4 (base: S3 branch) | `pnpm test Disclosure.test.tsx public-api.test.ts` | N/A — primitive only, no page wiring yet | Revert S4a commit; deletes the primitive, no other slice depends on it until S4b |
| S4b yarn-filter-tree | Brand→type tree + colour row wired to `/lanas` | PR 5 (base: S4a branch) — tip of tracker | `pnpm test YarnFilterPanel.test.tsx YarnBrandTree.test.tsx ColorFamilyFilter.test.tsx` | `pnpm dev` → keyboard-only pass over `/lanas` filters (Tab/Enter/Space) | Revert S4b commit; `/lanas` keeps rendering cards without filter tree |

Tracker branch `feature/23-yarns-list` accumulates S1→S4b; only the tracker
merges to `main`.

## Phase 1: S1 — backend-names (PR 1, base: tracker)

- [x] 1.1 RED: extend `src/features/yarns/api/store.test.ts` (or equivalent) —
      `listYarns` returns items with `brandName`/`typeName` populated from a
      joined row; assert row count unchanged vs. today's fixture.
- [x] 1.2 GREEN: in `src/features/yarns/api/store.ts`, change `listYarns`
      (`store.ts:234-249`) to `innerJoin(brands, …)` and
      `innerJoin(yarnTypes, …)` as `projects/api/store.ts:214` already does for
      `LinkedYarn`; select `...getTableColumns(yarns), brandName: brands.name,
      typeName: yarnTypes.name`.
- [x] 1.3 Add `YarnListItem` to `src/features/yarns/types.ts`:
      `YarnRecord & { brandName: string; typeName: string }`, additive,
      `YarnRecord` untouched.
- [x] 1.4 Update `src/features/yarns/api/list-yarns.ts` and
      `src/app/api/yarns/route.ts` to propagate `YarnListItem[]`; `{ yarns }`
      wrapper and status codes unchanged.
- [x] 1.5 Update `src/features/yarns/api/testing/in-memory-store.ts` so the
      test double's `listYarns` double mirrors the join (returns
      `brandName`/`typeName` from its seeded brand/type data).
- [x] 1.6 RED: extend the `GET /api/yarns` integration test — 401 with no
      session, 200 with every item carrying `brandName`/`typeName`, empty
      stash returns `{ yarns: [] }`, existing filter/AND scenarios still pass.
- [x] 1.7 GREEN: confirm the route test suite passes against 1.2-1.4.
- [x] 1.8 RED+GREEN: add/confirm a scenario asserting `POST`, `GET/:id`,
      `PATCH/:id`, `DELETE/:id` on `/api/yarns` and `getYarnOptions` are
      byte-identical (no `brandName`/`typeName` leak) — per
      `yarn-list-api/spec.md` "Other yarn endpoints unaffected".
- [x] 1.9 Verify: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
      green for this slice.

## Phase 2: S2 — swatch-split (PR 2, base: S1 branch)

- [x] 2.1 RED: create `src/shared/ui/primitives/swatch/Swatch.test.tsx` — RTL
      renders with `color="var(--yarn-red)"` `label="Rojo"` and asserts the
      accessible name; a decorative instance (no `label`) asserts
      `aria-hidden`; one test per size variant asserts a token-driven class,
      not a literal pixel value; an `axe` assertion; a render smoke test; an
      import-inspection assertion that the file imports nothing from
      `src/shared/config/` and no `ColorFamily` type.
- [x] 2.2 GREEN: create `src/shared/ui/primitives/swatch/{Swatch.tsx,
      swatch.variants.ts, index.ts}` — app-agnostic, props-only (`color`,
      `label?`, `size`, `className`), no hooks, no `"use client"` (mirrors
      `EmptyState`).
- [x] 2.3 **Move and rename**: relocate `yarnSwatchColor` (currently
      `YarnsTab.tsx:265-294`) to `src/shared/config/yarn-swatch.ts` and
      **rename it `yarnSwatchClass`**. Keep the 13-branch exhaustive `switch`
      body unchanged; only the file, name, and return-type framing (utility
      class, not a colour value) change. Re-export from
      `src/shared/config/index.ts`.
- [x] 2.4 Same commit as 2.3 — RED+GREEN: create
      `src/shared/config/yarn-swatch.classes.test.ts` — iterate every
      `ColorFamily` value, call `yarnSwatchClass(family)`, and assert
      `emitsRule(css, class)` using `compileGlobalsCss`/`emitsRule` from
      `src/shared/ui/testing/class-names-from-source.ts`. This is the
      compiled-CSS coverage handoff (trap #3) — it MUST land with the move,
      not as a follow-up.
- [x] 2.5 Same commit as 2.3/2.4 — in `docs/historial/deuda-tecnica.md`,
      strike entry **168**'s title through with `~~…~~` (never delete) and
      write underneath, in Spanish, per the ledger protocol: **Cómo se
      saldó** (the component was split along the portability line — `Swatch`
      generic in `shared/ui`, no `ColorFamily`; the `yarnSwatchClass` map
      stayed app-side in `shared/config`) and **Dónde quedó la prueba** (the
      S2 commit; `src/shared/ui/primitives/swatch/Swatch.test.tsx`,
      including its assertion that the primitive imports no `ColorFamily`;
      `src/shared/config/yarn-swatch.classes.test.ts`; this change's archive
      report). S2 is the slice that settles 168 — nothing in S3/S4a/S4b
      contributes to it, so the strike-through must revert with S2, not
      after it.
- [x] 2.6 GREEN: in `src/features/projects/ui/YarnsTab.tsx`, replace the
      `YarnSwatch` local component's body (`YarnsTab.tsx:241-248`, single
      call sites at `:147` and `:212`) to **compose** the new `Swatch`
      primitive with the imported `yarnSwatchClass`; delete the now-dead
      local `yarnSwatchColor` function and its `YARN_SWATCH_CLASSES`
      constant.
- [x] 2.7 Update `src/shared/ui/primitives/index.ts` and
      `src/shared/ui/public-api.test.ts` to anchor `Swatch` (and any exported
      size constant/`swatchVariants`) in the same commit as 2.2 — the
      literal-list test fails in both directions (trap #2).
- [x] 2.8 Verify: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
      green; manually confirm all 13 swatch colours render in browser
      (REGLA 4 / debt 171 note in design's Testing Strategy).
      **Automated part done** (see apply-progress). **Manual browser check
      of the 13 swatch colours is OUTSTANDING** — the apply executor has no
      browser tool; the orchestrator must run it.

## Phase 3: S3 — list-cards-states (PR 3, base: S2 branch)

- [x] 3.1 RED: `src/features/yarns/ui/yarns-client.ts` test — `getYarns`
      builds the querystring from filters, parses `YarnListPayload`,
      surfaces fetch failure as a typed error.
- [x] 3.2 GREEN: create `src/features/yarns/ui/yarns-client.ts` and
      `src/features/yarns/ui/types.ts` (`SerializedYarnListItem`,
      `YarnListPayload` per design's Interfaces/Contracts).
- [x] 3.3 GREEN: create `src/features/yarns/ui/yarn-copy.ts` — Spanish copy
      constants (`"Sin lanas en el stash todavía"`, `"Se enredó la madeja"`,
      retry label).
- [x] 3.4 RED: `src/features/yarns/ui/YarnCard.test.tsx` — RTL renders swatch
      + `"{brandName} · {typeName} · {colorName}"` + quantity; tap/activate
      triggers the documented no-op handler (no navigation, no drawer, no
      state change); render smoke; `axe`.
- [x] 3.5 GREEN: create `src/features/yarns/ui/YarnCard.tsx` — composes
      `Card` + `Swatch` (card size) tinted via `yarnSwatchClass`; no-op tap
      handler with an inline comment pointing at debt 192 / entry 24.
- [x] 3.6 RED: `src/features/yarns/ui/YarnsView.test.tsx` — skeleton while
      loading, cards on success, empty state message with no cards, error
      state message with a retry action that re-issues the fetch (mirrors
      `ProjectsView`'s `useState` filters + `requestKey`-derived loading
      pattern).
- [x] 3.7 GREEN: create `src/features/yarns/ui/YarnsView.tsx` — `useState`
      filters + `reloadToken` → `requestKey`; renders `EmptyState`/
      `ErrorState`/`Skeleton` from `src/shared/ui/feedback` or the card grid.
- [x] 3.8 GREEN: create `src/app/(app)/lanas/page.tsx` — thin Server
      Component, routes and composes `YarnsView` only (mirrors
      `ProjectsPage`); create `src/features/yarns/ui/index.ts` barrel.
- [x] 3.9 Same commit — file debt **192** in
      `docs/historial/deuda-tecnica.md` (Spanish, next sequential number,
      not recycled), severity 🟠 per the two-axis scale: the card tap is a
      documented no-op with no navigation/drawer; scenario = user taps a
      card and nothing visible happens; settled by entry 24 (drawer).
- [x] 3.10 GREEN: create `src/features/yarns/ui/yarns-ui.classes.test.ts`
      mirroring `src/features/projects/ui/projects-ui.classes.test.ts` — the
      compiled-CSS gate for every class emitted by `YarnCard`/`YarnsView`.
- [x] 3.11 Verify: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
      green (real output below). **Automated part done.** Manual browser
      pass over `/lanas` (REGLA 4) is **OUTSTANDING** — this executor has no
      browser tool; the orchestrator must run it before archiving.

## Phase 4: S4a — disclosure-primitive (PR 4, base: S3 branch)

- [x] 4.1 RED: `src/shared/ui/primitives/disclosure/Disclosure.test.tsx` —
      Enter/Space on `<summary>` toggles open state; `onOpenChange` fires;
      a closed panel holds no Tab stop; `open`/`defaultOpen` controlled vs.
      uncontrolled; render smoke; `axe`. Also
      `Disclosure.boundary.test.ts` (portability boundary, Node env, mirrors
      `Swatch.boundary.test.ts`). Both written first and confirmed failing
      (missing module) before any production code.
- [x] 4.2 GREEN: create
      `src/shared/ui/primitives/disclosure/{Disclosure.tsx,
      disclosure.variants.ts, index.ts}` per design D5 — native
      `<details>`/`<summary>` wrapper, `"use client"` (forwards a toggle
      event), `size: "sm" | "md"`, focus ring from `--focus`, hit area
      `--touch-target`.
- [x] 4.3 Same commit as 4.2 — a test asserting the primitive's own
      `<summary>` styling never applies `text-fg-inverse` on a `raised`
      surface (inherited contrast constraint from RFC-03 E2(b),
      `RFC-03-proyectos.md:275-278`: crema on `raised` measured 1.14:1); if
      the primitive ships a default surface-aware style, it MUST resolve to
      `text-fg` — write this as an explicit assertion, not a comment (trap
      #5).
- [x] 4.4 Update `src/shared/ui/primitives/index.ts` and
      `src/shared/ui/public-api.test.ts` to anchor `Disclosure` (and
      `disclosureVariants` if exported) in this same commit (trap #2).
- [x] 4.5 Verify: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
      green for this slice. **Done, real output recorded in
      apply-progress.**

## Phase 5: S4b — yarn-filter-tree (PR 5, base: S4a branch, tip of tracker)

- [ ] 5.1 RED: `src/features/yarns/ui/YarnBrandTree.test.tsx` — selecting a
      brand's "Toda la marca" radio sets `brandId` with no `typeId`;
      selecting a type sets both `brandId` and `typeId`; selecting "Todas
      las marcas" clears both; one radio group (`name="yarn-scope"`) spans
      the whole tree; a brand holding the active selection stays marked when
      its panel is closed; failed tree fetch degrades to a disabled panel,
      list stays populated.
- [ ] 5.2 GREEN: create `src/features/yarns/ui/YarnBrandTree.tsx` — wraps
      `Disclosure` per brand; eager `GET /api/brands` then `Promise.all`
      over `GET /api/brands/:id/types` (design D7), one effect, filter
      independent.
- [ ] 5.3 RED: `src/features/yarns/ui/ColorFamilyFilter.test.tsx` —
      `aria-pressed` swatch buttons, re-clicking the active one clears
      `colorFamily`; keyboard operable (Tab, Enter/Space); render smoke;
      `axe`.
- [ ] 5.4 GREEN: create `src/features/yarns/ui/ColorFamilyFilter.tsx` — row
      of `Swatch` instances per `ColorFamily`, tinted via `yarnSwatchClass`.
- [ ] 5.5 RED: `src/features/yarns/ui/YarnFilterPanel.test.tsx` — composes
      tree + colour row; combined brand+type+colorFamily selections AND
      together against the list; full keyboard pass (Tab/Enter/Space only)
      reaches every brand, type, and swatch control.
- [ ] 5.6 GREEN: create `src/features/yarns/ui/YarnFilterPanel.tsx`;
      wire into `YarnsView.tsx` — filter state stays React `useState`, not
      the URL (design D6); `yarns-client.ts` still builds
      `?brandId=&typeId=&colorFamily=` for the API call.
- [ ] 5.7 Update `src/features/yarns/ui/yarns-ui.classes.test.ts` to cover
      classes emitted by the new tree/colour-row components.
- [ ] 5.8 Same commit — in `docs/design/rfc/RFC-04-lanas.md`, add
      `## 7-bis. Enmienda E1` (Spanish, matching the RFC-03 amendment
      heading format `## 7-bis. Enmienda E1 — <title> (<date>)`) stating:
      §3's `GET /api/yarns` now returns `brandName`/`typeName` additively,
      no existing consumer changes; the card's «ícono» of §1/§2 is the
      generic `Swatch` at card size tinted by the app-side colour-family
      map, not a new asset; in entry 23 the card's tap is a no-op until
      entry 24 ships the drawer.
> **Pendiente heredado de S4a, verificar en el pase de teclado de 5.9:** el
> `<summary>` de `Disclosure` lleva un `onKeyDown` propio que llama a
> `preventDefault()` para cancelar la activación nativa. No se pudo comprobar en
> navegador (la inyección de teclas no llegó a la página: cero eventos `keydown`
> observados, o sea fallo de herramienta, no hallazgo). Razonando sobre el
> código los dos caminos convergen en el mismo valor —el handler pone
> `!resolvedOpen` y `onToggle` sincroniza desde el DOM—, así que no debería
> haber doble conmutación. **Compruébese con Enter Y con Espacio por separado**:
> difieren en qué evento dispara la activación por defecto.

- [ ] 5.9 Verify: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
      green; browser keyboard-only pass over `/lanas` filters (Tab, Enter,
      Space reach every brand/type/swatch control) — REGLA 4.
- [ ] 5.10 Confirm all Success Criteria in `proposal.md` are met; this is
      the tracker's final child PR.
