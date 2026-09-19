# Design: Yarns list page with hierarchical filter (backlog 23)

## Technical Approach

Four chained slices (S1 `backend-names` → S2 `swatch-split` → S3 `list-cards-states` → S4
`filter-tree`). S1 enriches `listYarns` with a join exactly as `projects/api/store.ts:214`
already does for `LinkedYarn`. S2 splits the swatch on the portability line. S3/S4 add a thin
Server page plus a client view that mirrors `ProjectsView` (`useState` filters, `requestKey`
derived loading, stale data kept across filter changes). No Zustand, no Drizzle in UI.

## Architecture Decisions

### D4 — Tint reaches the generic `Swatch` through its existing `className`

| Option | Tradeoff |
|---|---|
| Inline `style` custom property + `bg-(--swatch-tint)` | needs a second `kind` prop (multicolor is `conic-gradient`, invalid in `background-color`); the one live class sits in ungated `shared/ui` |
| `data-*` attribute + 13 rules in `globals.css` | duplicates the map in CSS; app selectors in the portable sheet |
| **Chosen: app-side map returns a utility class, passed as `className`** | `cn()`/`twMerge` already mandatory on every component; primitive gains no tint concept at all |

`yarnSwatchColor(family)` (`YarnsTab.tsx:265`) moves to `src/shared/config/yarn-swatch.ts`
**and is renamed `yarnSwatchClass`**: the 13-branch body is unchanged, but what it returns is a
utility class, and "Color" in a config module reads as a colour *value*. S2 updates its single
call site. Canonical v4 syntax is preserved (`bg-yarn-red`, `bg-(image:--yarn-multicolor)`); no
arbitrary-value form, no hardcoded colour. **No `tint` prop**: it would be a second
`className` and would invite the `ColorFamily` prop the proposal's risk table forbids.

**Verifiability (debt 170 stays untouched).** The source-scanning gate cannot follow an
imported function, so we assert the map's *runtime output* instead: a test in `shared/config`
iterates every `ColorFamily` value and requires `emitsRule(css, …)`, reusing
`compileGlobalsCss`/`emitsRule` from `shared/ui/testing/class-names-from-source.ts`. Stronger
than AST scanning and it cannot miss a family. `features/yarns/ui/` also gets its own
`yarns-ui.classes.test.ts`, mirroring `projects-ui.classes.test.ts`.

### D5 — Native `<details>`/`<summary>`, wrapped in a `Disclosure` primitive

Confirmed over a hand-rolled `role="tree"`: an APG treeview replaces Tab stops with roving
tabindex, so the type controls leave the tab sequence — worse keyboard access, not better, and
what the page needs is grouped selection, not single-item navigation. The wrapper goes to
`shared/ui` (not inline as RFC-03 E1(g) did) because it repeats once per brand and is the
page's primary structure; the "template is a SUELO" rule bars deciding this on gate cost.
**Deuda 142 (🔴) is the precedent**: it is this project's recorded case of `public-api.test.ts`
being anchored to a literal list and that cost deciding the interface. Paying the anchor here
is the point.

```tsx
interface DisclosureProps extends Omit<HTMLAttributes<HTMLDetailsElement>, "onToggle"> {
  summary: ReactNode; open?: boolean; defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void; size?: "sm" | "md";
}
```

Keyboard: `<summary>` is natively focusable, Enter/Space toggles, expanded state is exposed
without ARIA; focus ring from `--focus`, hit area `--touch-target`. Each brand summary is one
Tab stop; a closed panel holds none. **No interactive element goes inside `<summary>`**: the
summary element itself owns activation, so nested interactive content is not reliably operable
— plain HTML behaviour, not a repository amendment. **Contrast constraint from RFC-03 E2(b)**
(`RFC-03-proyectos.md:275-278`), measured, not theoretical: a `<summary>` placed on a `raised`
surface must use `text-fg`, never `text-fg-inverse` (crema on `raised` = 1.14:1). The tree's
summaries sit on a surface, so S4 inherits this — do not rediscover it by hand. The colour row
is separate: `aria-pressed` buttons where re-clicking clears — visually and behaviourally
distinct from the vertical radio list, per the "controls that behave differently look
different" rule.

### D5-bis — A brand filters on its own; one radio group spans the whole tree

Settled upstream: `?brandId=` without `typeId` is already implemented
(`validation.ts:47-53`, `store.ts:234-249`), so the tree must reach it.

**Affordance.** `<summary>` owns *expand* only; *select* is a native radio inside the panel.
One group, `name="yarn-scope"`, spans the entire tree with values `"all"` | `brandId` |
`` `${brandId}:${typeId}` ``. Each brand panel opens with **"Toda la marca"** (brand alone),
followed by one radio per type. Two intents, two controls, both keyboard-only: Enter/Space on
the summary expands; Tab into the panel, then Space or arrow keys selects. A brand is
selectable without reading its types — it is the first radio in its own panel.

*Rejected*: making `<summary>` itself select the brand. One control carrying two meanings makes
"expand just to look at the types" impossible without changing the list underneath, and leaves
the user no way to read a brand's contents before committing to it.

**Deselection.** A **"Todas las marcas"** radio sits above the tree, in the same group; it is
the reset and the initial value. Colour family clears independently by re-clicking its swatch.

**Brand/type interaction.** A type belongs to exactly one brand (FK), so selecting a type sets
`brandId` **and** `typeId`. Selecting "Toda la marca" drops `typeId`, keeps `brandId`. Because
a single exclusive group holds the whole tree, "type chosen while its brand is cleared" is
unrepresentable: clearing the brand *is* moving the one selection to `"all"`, which drops the
type with it. Disclosure state is orthogonal — collapsing a brand never changes the filter, so
a brand holding the active selection marks it on its summary and stays legible when closed.

### D6 — Filter state is React state only, not the page URL

`useSearchParams` forces a `<Suspense>` boundary and a router write per interaction, and no
page in the repo does it. RFC-04 §3's `?brandId=&typeId=&colorFamily=` is the **API** contract,
which `yarns-client.ts` still builds. Cost: filters are not shareable or back-button aware.

### D7 — The brand tree loads eagerly, in parallel, once

Lazy per-expansion would make Enter reveal an empty group while the request flies; a keyboard
user Tabs past the types and AT announces an expanded empty node. Eager `GET /api/brands` then
`Promise.all` over `/api/brands/:id/types` is bounded by hand-created brands and is filter
independent (one effect, like `getYarnOptions`). A failed tree degrades to a disabled panel and
never blanks the list. If N grows the fix is a backend `?include=types` — out of scope here.

## Data Flow

    LanasPage (Server) ──> YarnsView ("use client")
        useState{brandId,typeId,colorFamily} + reloadToken -> requestKey; loading = loaded.key !== requestKey
          ├─ getYarns(filters) ─> GET /api/yarns?…            -> 1 request, names included (D1)
          ├─ getBrandTree()    ─> GET /api/brands (+N types)  -> once, parallel (D7)
          ├─> YarnFilterPanel ─> YarnBrandTree[Disclosure + one radio group] + ColorFamilyFilter[Swatch]
          └─> YarnCard[Card+Swatch+yarnSwatchClass] | EmptyState | ErrorState | Skeleton

## File Changes

| File | Action | Description |
|---|---|---|
| `src/features/yarns/api/store.ts` | Modify | `listYarns` inner-joins `brands`/`yarnTypes`; returns `YarnListItem[]` |
| `src/features/yarns/types.ts` | Modify | additive `YarnListItem`; `YarnRecord` untouched |
| `src/features/yarns/api/list-yarns.ts`, `src/app/api/yarns/route.ts` | Modify | propagate the type; `{ yarns }` wrapper and status codes unchanged |
| `src/features/yarns/api/testing/in-memory-store.ts` | Modify | double mirrors the join |
| `src/shared/ui/primitives/swatch/{Swatch.tsx,swatch.variants.ts,index.ts}` | Create | app-agnostic `Swatch` (`size`, optional `label`, `className`) |
| `src/shared/ui/primitives/disclosure/{Disclosure.tsx,disclosure.variants.ts,index.ts}` | Create | native `<details>` wrapper |
| `src/shared/ui/primitives/index.ts`, `public-api.test.ts` | Modify | anchor `Swatch`, `SWATCH_SIZES`, `swatchVariants`, `Disclosure`, `disclosureVariants` |
| `src/shared/config/yarn-swatch.ts` (+ `index.ts` re-export) | Create | `yarnSwatchColor` moved here and renamed `yarnSwatchClass`, + its compiled-CSS test |
| `src/features/projects/ui/YarnsTab.tsx` | Modify | composes `Swatch` + imported `yarnSwatchClass`; local `YarnSwatch` and `yarnSwatchColor` deleted |
| `src/app/(app)/lanas/page.tsx` | Create | Server page: routes and composes only |
| `src/features/yarns/ui/{YarnsView,YarnCard,YarnFilterPanel,YarnBrandTree,ColorFamilyFilter}.tsx` | Create | client components (state, effects, handlers) |
| `src/features/yarns/ui/{yarns-client.ts,types.ts,yarn-copy.ts,index.ts,yarns-ui.classes.test.ts}` | Create | fetch wrapper, serialized types, Spanish copy, barrel, class gate |

**Client vs Server.** `LanasPage` is a Server Component (routes and composes only, like
`ProjectsPage`). All five `features/yarns/ui/*.tsx` are `"use client"`: `YarnsView` holds
`useState` + `useEffect`, the rest take change handlers. `Disclosure` is `"use client"` because
it forwards a toggle event — its open/close still works without JS. `Swatch` has no hooks and
no handlers, so it ships **without** `"use client"`, like `EmptyState`.

`/lanas` needs no `src/proxy.ts` edit: the whitelist is fail-closed and only `/login`,
`/register` are public.

## Interfaces / Contracts

```ts
// features/yarns/types.ts — additive, YarnRecord untouched
export type YarnListItem = YarnRecord & { brandName: string; typeName: string };

// api/store.ts — every yarn column survives a future migration for free
.select({ ...getTableColumns(yarns), brandName: brands.name, typeName: yarnTypes.name })
.from(yarns).innerJoin(brands, eq(brands.id, yarns.brandId))
            .innerJoin(yarnTypes, eq(yarnTypes.id, yarns.typeId))

// features/yarns/ui/types.ts — Date lies across the wire (cf. SerializedProject)
export type SerializedYarnListItem =
  Omit<YarnListItem, "lot" | "createdAt" | "updatedAt">
  & { lot: string; createdAt: string; updatedAt: string };
export type YarnListPayload = { yarns: SerializedYarnListItem[] };
```

**Design tokens consumed**: `--yarn-*` (tints), `--space-*`, `--surface`/`--surface-sunken`,
`--border`/`--border-width`, `--radius-*`, `--focus`, `--touch-target`, `--font-body`/
`--font-display`/`--font-mono` and the `--text-*`/`--leading-*` pairs. Zero literal values.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `yarnSwatchClass` | exhaustive over `ColorFamily`; each returned class must emit a real rule in the compiled CSS |
| Unit | `listYarns` service | in-memory double: filters ANDed, `userId` scoped, names present, order preserved |
| Integration | `GET /api/yarns` | 401, each filter, wrapper shape, additive keys, unchanged row count |
| UI (RTL+axe) | `Swatch`, `Disclosure` | decorative vs labelled, size variants; Enter/Space toggle, `onOpenChange`, closed panel holds no Tab stop |
| UI (RTL) | `YarnsView`, tree, colour row | skeleton→cards, empty, error+retry, Tab order, arrow keys; brand alone requests `brandId` with no `typeId`; type sets both; "Todas las marcas" clears both; `aria-pressed` clears colour |
| Gates | repo-wide | `no-hardcode`, `canonical-tailwind-classes` auto-cover new files; new `yarns-ui.classes.test.ts` |
| Manual | 13 swatches in browser | REGLA 4 / debt 171 — real data now exists |

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, executable-file classification or
process-integration boundary. The one route added is a page under the existing fail-closed
`src/proxy.ts` whitelist, not a dispatch change.

## Migration / Rollout

No migration: read-only join, no schema, no auth. Rollback per slice as stated in the proposal.

## Open Questions

- [ ] S4 (primitive + tree + colour row + tests) may exceed 400 lines; `sdd-tasks` forecasts and
      splits it into `S4a disclosure-primitive` / `S4b yarn-filter-tree` if so.
