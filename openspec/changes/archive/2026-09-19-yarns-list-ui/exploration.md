# Exploration — `yarns-list-ui` (backlog entry 23)

Status: **partial** — three product decisions block a clean proposal.
Source of truth: `docs/design/rfc/RFC-04-lanas.md`, `docs/product/backlog-ui.md` entry 23.

## Current state

`src/features/yarns/` has **no `ui/` folder**. It contains only `schema.ts`, `types.ts`,
`validation.ts`, `api/*` and `index.ts`. The UI for this feature is a from-scratch build.

## A. Backend readiness

**A1 — The filters are real and compose.** `yarnFiltersSchema` accepts `brandId`, `typeId` and
`colorFamily`, all optional (`src/features/yarns/validation.ts:47-53`); the store pushes each into a
single `and(...conditions)` (`src/features/yarns/api/store.ts:234-249`); the route handler wires
them (`src/app/api/yarns/route.ts:16-27`). Nothing in RFC-04 §3's
`?brandId=&typeId=&colorFamily=` is ignored.

**A2 — The response carries no brand or type names.** `YarnRecord = typeof yarns.$inferSelect`
(`src/features/yarns/types.ts:13`) is the raw table row: `id, userId, image, brandId, typeId,
colorName, colorCode, colorFamily, quantity, usedQuantity, length, fiber, recommendedNeedle,
thickness, lot, createdAt, updatedAt` (`src/features/yarns/schema.ts:33-65`). The query is a bare
`.select().from(yarns)` with no join (`src/features/yarns/api/store.ts:245-249`), so `brandId` and
`typeId` arrive as UUIDs.

The card specified in RFC-04 §2 is `marca · tipo · colorName`. **Two of those three fields do not
exist in the response.** This is not an inference: two unrelated files already record the same
limitation in prose — `src/features/projects/ui/YarnsTab.tsx:73-78` explains that the yarn filter
dropdown labels yarns by color alone *because* `GET /api/yarns` returns the raw row with UUIDs, and
`src/shared/config/index.ts:125-130` says the same.

**A3 — Building the filter tree costs N+1 requests.** `GET /api/brands`
(`src/app/api/brands/route.ts:10-16`) returns a flat list of brands with no nested types;
`GET /api/brands/:id/types` (`src/app/api/brands/[id]/types/route.ts:28-46`) returns types for one
brand. An eager tree is 1 + one request per brand. A lazy tree (types fetched on expand) avoids the
burst but cannot label cards, because card labels need type names before any node is expanded.

## B. Can the card be painted?

**B4 — `colorCode` is not a color.** `z.string().trim().min(1).max(100)`
(`src/features/yarns/validation.ts:27-32`) — free text with no format constraint — unique per brand
through a plain uniqueness index (`src/features/yarns/schema.ts:62-64`). It behaves as a
manufacturer SKU, not a CSS value.

**B5 / B6 — A renderable color set already exists and is already in use.** `ColorFamily` is a closed
13-value enum (`src/shared/config/index.ts:104-119`) and a complete CSS token map backs it:
`--yarn-red` … `--yarn-multicolor` (`src/app/globals.css:62-100`), built for RFC-03's linked-yarns
swatch and consumed today by a feature-local `YarnSwatch`
(`src/features/projects/ui/YarnsTab.tsx:241-294`).

So the filter's colour-family swatches have **zero ambiguity**: reuse that token set, ideally by
promoting `YarnSwatch` into `src/shared/ui/`.

What is *not* resolved is the card. RFC-04 §1 calls it an **"ícono"**, wording it deliberately keeps
distinct from "swatch", and `src/shared/ui/motifs/` is **empty** — the repository has no icon asset
or icon primitive of any kind.

## C. UI inventory

**C7 — What exists in `src/shared/ui/`:** primitives `button`, `card`, `dialog` (used as a drawer
via `placement="side"`, see `ProjectDetailDrawer.tsx:108`), `field` (+ `Input`, `Textarea`,
`Select`), `file-input`, `confirm-dialog`, `progress-bar`, `skeleton`, `tabs`, `toggle` /
`ToggleGroup`, `segmented-control`; feedback `empty-state`, `error-state`, `state-panel`; layout
`app-shell`, `archive-nav`, `bottom-nav`, `account-band`; `three/ascii-yarn`.

**What is missing:** any accordion / tree / disclosure primitive, any shared swatch primitive (only
the feature-local one in `YarnsTab.tsx`), and any icon system (`motifs/` is empty).

**C8 — New work required:** a keyboard-navigable brand→type tree, a shared colour-family swatch, the
card's "ícono" (pending decision), the page and view, and a `yarns-client.ts` fetch wrapper.

**C9 — The established pattern to mirror** (`src/features/projects/ui/ProjectsView.tsx`,
`projects-client.ts`, `src/app/(app)/proyectos/page.tsx`): a thin Server Component page that renders
a client feature component; the client component fetches in `useEffect` keyed by a derived
`requestKey` string, so loading state is *derived* (`loaded?.key !== requestKey`) rather than held in
a separate boolean; filter state is plain `useState` — **not Zustand**, which the code notes is not
installed for this feature; `EmptyState` / `ErrorState` / `Skeleton` cover the three states; the HTTP
layer is a hand-rolled `request<T>` wrapper cloned per feature (documented debt 129,
`projects-client.ts:29-49`).

## D. Scope and size

**D10 — The tap/drawer boundary contradicts itself.** RFC-04 §2 and backlog entry 23 both say
"tap → drawer", but the drawer is entry 24's scope (`docs/product/backlog-ui.md`, entry 24). Entry 23
as literally written ships a tap affordance with nothing behind it.

**D11 — Entry 23 does not fit the 400-line review budget.** Comparable precedent already exceeds it
on its own: `ProjectCard.tsx` is 467 lines plus 729 lines of test; `ProjectsToolbar.tsx` is 237 plus
224. Entry 23 additionally needs a brand-new tree primitive with no precedent in the repository.
Realistic estimate including tests: **800-1400 changed lines.** The session's `delivery_strategy` is
`auto-chain`, so this splits.

## Resolved from the codebase

1. `brandId` / `typeId` / `colorFamily` are implemented and compose as AND —
   `src/features/yarns/validation.ts:47-53`, `src/features/yarns/api/store.ts:234-249`.
2. `GET /api/yarns` returns the raw row with UUIDs and no names —
   `src/features/yarns/types.ts:13`, `src/features/yarns/api/store.ts:245-249`, corroborated at
   `src/features/projects/ui/YarnsTab.tsx:73-78` and `src/shared/config/index.ts:125-130`.
3. `GET /api/brands` is flat; types are per-brand — an eager tree is N+1 —
   `src/app/api/brands/route.ts:10-16`, `src/app/api/brands/[id]/types/route.ts:28-46`.
4. `colorCode` is free-text, a manufacturer SKU rather than a colour —
   `src/features/yarns/validation.ts:27-32`, `src/features/yarns/schema.ts:62-64`.
5. `colorFamily` has a complete, already-consumed CSS token map —
   `src/app/globals.css:62-100`, `src/features/projects/ui/YarnsTab.tsx:241-294`.
6. `src/shared/ui/` has no tree/accordion primitive, no shared swatch, and no icon system.
7. The list-page pattern is thin server page → client view, `useState` filters, `requestKey`-derived
   loading — `src/features/projects/ui/ProjectsView.tsx`, `src/app/(app)/proyectos/page.tsx`.
8. No shared browser HTTP client exists; each feature clones `request<T>` (debt 129) —
   `src/features/projects/ui/projects-client.ts:29-49`.

## Open questions for the user

1. **Brand and type names on the card.** Extend `GET /api/yarns` to additively return `brandName` /
   `typeName` (one request, no N+1, and it also lifts the existing limitation recorded at
   `YarnsTab.tsx:73-78`), or join client-side from the catalogue endpoints (no backend change, but
   N+1 on load or mismatched lazy labels)?
2. **What the card's "ícono coloreado con el color de la lana" actually is.** A new skein-shaped SVG
   asset tinted by the `colorFamily` token — which requires design input and a first entry in the
   empty `motifs/` — or a larger instance of the circular swatch that already exists?
3. **Tap behaviour in entry 23 while entry 24 does not exist.** Ship the card non-interactive and let
   entry 24 add both the drawer and the tap, or ship a tap that is a documented no-op?

## Next

`sdd-propose`, once questions 1-3 are answered. The split into slices follows from
`delivery_strategy: auto-chain` and needs no separate approval.
