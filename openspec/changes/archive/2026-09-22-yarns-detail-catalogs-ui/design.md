# Design: Yarn detail drawer and catalogue management (backlog 24)

## Technical Approach

Two chained slices, zero backend work. **S1 `yarn-detail-drawer`** adds a generic `Stepper`
primitive, a prop-driven `YarnDetailDrawer` built on `Dialog placement="side"`, and the
`detailId` wiring that settles debt 192. **S2 `catalog-management`** adds a `YarnCatalogPanel`
collapsed inside `YarnFilterPanel`'s existing `Card`, a `brands-client.ts` extracted from
`YarnBrandTree`, and the `catalogToken` freshness plumbing of proposal D5. Every component
composes primitives that already ship; no new fetch layer, no Zustand, no Drizzle in UI.

## Architecture Decisions

### D1 — `Stepper` is controlled-only, bounded by optional `min`/`max`, announced through `<output>`

| Option | Tradeoff |
|---|---|
| Uncontrolled or dual-mode (`Disclosure`'s shape) | a numeric value that is **persisted server state** gains a second source of truth: a rejected `PATCH` would leave the primitive showing a number the server refused. `Disclosure` can afford dual mode because open/closed is ephemeral |
| `<input type="number">` as the value | browser-drawn spinners duplicate our two buttons, and free typing drags in locale parsing, an empty/`NaN` state and a commit moment — entry 25's form owns typed entry |
| `role="spinbutton"` on a `<div>` + arrow keys | a hand-rolled ARIA widget, which is exactly what D5 of #23 rejected for the tree |
| **Chosen: controlled `value` + `onValueChange`, two native `Button`s, value in `<output>`** | consumer adds three lines of `useState`; in exchange there is one truth and one callback to assert |

```ts
export interface StepperProps extends StepperVariants {
  value: number;
  /** The value it is moving TO, never the current one (same contract as `Toggle`/`Disclosure`). */
  onValueChange: (value: number) => void;
  label: ReactNode;                       // names the role="group"
  min?: number; max?: number; step?: number;   // step defaults to 1
  formatValue?: (value: number) => string;     // defaults to String
  decrementLabel?: string; incrementLabel?: string;
  disabled?: boolean; className?: string;
}
```

**`min` and `max` are both optional props, both `undefined` by default.** The primitive knows no
application (SDD-01 §1, debt 168), so it cannot own a floor; omitting `max` from the API instead
would encode *our one consumer's* absence of a ceiling into the design system — the drift the
proposal's risk table forbids. PRD-01 §4.5 therefore lives in `YarnDetailDrawer`, which passes
`min={0}` and no `max`. The primitive clamps: at a bound the corresponding `Button` is natively
`disabled` and **emits nothing**, and an out-of-range `value` pushed in by a consumer is never
re-emitted.

**Announcement.** The numeral renders inside `<output>`, whose implicit role is `status` — an
`aria-live="polite" aria-atomic="true"` region for free, so pressing `+` (focus is on the button,
not on the value) is announced without hand-rolling a live region. **Keyboard: no custom key
handling at all.** Two native `<button>`s are fully operable with Enter/Space, and `user-event`
*does* simulate button activation — the reason `Disclosure` needed an `onKeyDown`
(`Disclosure.tsx:49-57`) does not apply here, so adding arrow keys would invent a convention the
role never advertises.

**Composition and tokens.** The two controls are `Button variant="secondary" size="icon"`, which
already carries `min-w/min-h-(--touch-target)`, the `--focus` ring, `--border-width`, `--radius-md`
and the disabled `--surface-sunken`/`--fg-muted` pair — so `Stepper` adds no touch-target or focus
rule of its own. Its own classes consume `--space-3` (gap), `--space-8` (a min width on the
`<output>` so the number does not jitter the row), `--font-mono`, `--text-base`/`--leading-base`.
Foreground is `text-current`: the primitive **inherits** the surface's foreground (debt 17), it
never fixes one.

### D2 — the `PATCH` response folds in field-by-field, and the type system makes the trap a compile error

`PATCH /api/yarns/:id` returns `200 { yarn: YarnRecord }` (`api/yarns/[id]/route.ts:53-55`) — the
raw row, with no `brandName`/`typeName`, so a wholesale replacement blanks `YarnCard`'s
`marca · tipo · colorName` label (`YarnCard.tsx:12-14`). Four concrete measures, in order:

1. **`ui/types.ts` names the response shape separately**, reusing the existing `SerializedYarnDates`:
   `export type SerializedYarnRecord = Omit<YarnRecord, SerializedYarnDates> & { lot: string; createdAt: string; updatedAt: string }` and
   `export type YarnDetailPayload = { yarn: SerializedYarnRecord }`.
   **`patchYarnUsedQuantity` MUST NOT be typed as returning `SerializedYarnListItem`** — that
   widening compiles and delivers `undefined` labels at runtime. This is the only forbidden move
   in the change.
2. **A pure merge function**, `src/features/yarns/ui/merge-yarn.ts`, unit-tested without RTL:
   ```ts
   export function mergeYarnPatch(
     current: SerializedYarnListItem,
     patched: SerializedYarnRecord,
   ): SerializedYarnListItem {
     return { ...current, ...patched, brandName: current.brandName, typeName: current.typeName };
   }
   ```
   `...patched` cannot overwrite keys it does not have, so the spread alone preserves the names;
   the explicit re-pin is what makes the guarantee readable and what the test asserts. Because the
   declared return type is `SerializedYarnListItem`, `return patched` **does not typecheck**.
3. **The request carries `{ usedQuantity }` and nothing else**, so `brandId`/`typeId` provably
   cannot change — that is what licenses keeping the old names instead of refetching. A future
   patch that touches either MUST reload the list.
4. **`YarnsView` maps by `id`, never by index, and never touches `loaded.key`**:
   `setLoaded(prev => prev?.yarns ? { ...prev, yarns: prev.yarns.map(y => y.id === patched.id ? mergeYarnPatch(y, patched) : y) } : prev)`.
   No new `requestKey` means no refetch and no skeleton flash; an id no longer present makes the
   merge a silent no-op, so an interleaved refetch cannot write the value onto the wrong row.

**No optimistic update.** `Stepper` renders `yarn.usedQuantity` straight from list state; the
number moves only when the response merges. While in flight, `YarnDetailDrawer` passes
`disabled` to the stepper and renders an inline Spanish error on failure. Showing a number the
server never accepted is the same class of lie as blanking the labels, and the repo has no
rollback idiom. Accepted cost: one round trip per press, and rapid `+ + +` is serialised.

### D3 — `detailId` in `YarnsView`, keyed by id, resolved through `find`

`YarnsView` gains `const [detailId, setDetailId] = useState<string | null>(null)`; `YarnCard`
gains a required `onOpen: () => void` replacing `noOpTap`; the drawer receives
`yarn={yarns?.find(y => y.id === detailId) ?? null}` — `ProjectsView.tsx:229,684,700-706` exactly.
Keying by id rather than by a copied object is what lets D2's merge flow into an open drawer with
no second source of truth.

**When the list refetches and the yarn is gone**, `find` yields `undefined` → `?? null` → the
drawer early-returns `null` → `Dialog` unmounts, and its effect cleanup restores focus to the
opener (invariant 3) and releases the scroll lock (invariant 4, `Dialog.tsx:181-196`). The opener
card may be gone too; `trigger?.isConnected` (`Dialog.tsx:182`) already guards that, so focus
simply is not moved and nothing throws. **`detailId` is deliberately not cleared** on
disappearance — that would need an effect watching `yarns`, and a stale id is inert because every
read goes through `find`. It is cleared by `onClose` and by nothing else. During a filter change
`loaded` still holds the previous array, so the drawer stays open on stale data and closes only
when a list arrives without that yarn.

### D4 — the catalogue panel: a `Disclosure` per brand, `ConfirmDialog` before, `Dialog` after

`YarnCatalogPanel` is the last child of `YarnFilterPanel`'s `<Card>` (`YarnFilterPanel.tsx:49`),
itself wrapped in a closed-by-default `Disclosure summary="Catálogos"`.

**Surfaces, confirmed not assumed** (debt 196): `Card`'s default variant is `raised` →
`bg-surface-raised text-fg` (`card.variants.ts:16,21`), and the `Dialog` panel is
`bg-surface-raised text-fg` (`dialog.variants.ts:87`). Both new components therefore sit on the
same declared surface/foreground pair, and neither is on the page background. Reusing `Disclosure`
also inherits its `<summary>` marker fix (debt 197, `Disclosure.tsx:118-134`) and its measured
`text-fg`-never-`text-fg-inverse` rule.

**States** (SDD-01 §9 bar, RFC-04 §4 vocabulary): `loading` → `Skeleton` rows with `aria-busy`;
`failed` → inline message plus a retry that bumps a local token (the tree has no retry; the panel
needs one because it is the only way to repair the catalogue); `empty` → a short line **with the
create form still mounted**, never a dead end; `ready` → the brand list.

**Create and delete layout.** One brand-create `<form>` (`Field` + `Input` + `Button
variant="primary"`, Enter submits) → `POST /api/brands` → `201 { brand }`. Each brand is a nested
`Disclosure`: its `<summary>` shows the name, its panel holds that brand's types, each with a
`Button variant="danger" size="icon"` whose accessible name includes the name it deletes (never N
bare «Borrar»), plus **one** type-create form for that brand → `POST /api/brands/:id/types` →
`201 { type }`. Rejected: a flat type form with a brand `Select` (a second encoding of the
PRD-01 §4.4 hierarchy, and more code than reusing an anchored primitive); rejected: one form per
brand always mounted (N text inputs in the tab sequence — `Disclosure` mounts only the open
panel, so this is free).

**Two dialogs, two different jobs.** RFC-04 §1 still requires explicit confirmation before a
delete, and E2(b) only carves out the blocked case — so `ConfirmDialog` runs *before* the request
(two buttons, `tone="danger"`, focus on Cancel: a real confirm-or-cancel, which is exactly what
`ConfirmDialog.tsx:20-37,63-102` is for), and the single-action `Dialog` runs *after* a 409.

**How the counts reach the notice.** `brands-client.ts` returns discriminated results, so the
panel never touches `Response`:

```ts
export type DeleteBrandResult =
  | { ok: true }
  | { ok: false; kind: "blocked"; types: number; yarns: number }   // 409 { error, types, yarns }
  | { ok: false; kind: "error"; message: string };
export type DeleteTypeResult =
  | { ok: true }
  | { ok: false; kind: "blocked"; yarns: number }                  // 409 { error, yarns }
  | { ok: false; kind: "error"; message: string };
```

(`api/brands/params.ts:58-68` is the source of both bodies.) The panel stores
`notice: { target: "brand"; name: string; types: number; yarns: number } | { target: "type"; name: string; yarns: number } | null`
and renders **one** `Dialog` whose only control is its built-in header close, labelled
`closeLabel="Entendido"` — so the notice adds zero buttons and `Dialog`'s default initial focus on
the panel (`Dialog.tsx:77-80`) is already the right behaviour for an acknowledgement. Copy differs
per target and lives in `yarn-copy.ts` as `brandBlockedBody(types, yarns)` and
`typeBlockedBody(yarns)`, pluralising the way `stockLabel` does and **omitting a clause whose
count is 0**; both 0 cannot occur because the server would not have sent 409, and the client falls
back to the generic message if it ever does.

### D5 — freshness plumbing (details of proposal D5, not a relitigation)

`fetchTree` (`YarnBrandTree.tsx:43-73`) moves verbatim to `brands-client.ts` as `getBrandTree`,
taking `BrandTreeEntry`/`BrandTreeState` with it; `YarnBrandTree` imports it and gains
`catalogToken?: number` **defaulting to 0**, added to its effect's dependency array — additive, so
reverting S2 restores the `[]`-dep effect exactly. `YarnFilterPanel` forwards `catalogToken` and
raises `onCatalogChange(removed?: { brandId?: string; typeId?: string })`. `YarnsView`:

```ts
function handleCatalogChange(removed?: { brandId?: string; typeId?: string }) {
  setCatalogToken((token) => token + 1);
  setFilters((current) => {
    if (removed?.brandId !== undefined && current.brandId === removed.brandId) {
      return { colorFamily: current.colorFamily };          // brandId AND typeId drop together
    }
    if (removed?.typeId !== undefined && current.typeId === removed.typeId) {
      return { ...current, typeId: undefined };
    }
    return current;
  });
}
```

Dropping `brandId` drops `typeId` with it because `typeId` without a brand is unrepresentable
(#23 D5-bis). Functional updaters avoid a stale closure; the existing `cancelled` guards
(`YarnBrandTree.tsx:89-99`, `YarnsView.tsx:56-73`) already cover the token race.

### D6 — RFC-04 E2 is written in two halves, in writing order

The proposal declared four E2 items. Content stays verbatim, but the letters are reassigned to
**writing order** so the section reads top to bottom in one pass: S1 writes E2(a) (the stepper is
a generic primitive, floor 0 / no ceiling) and E2(b) (the «Editar» no-op); S2 appends E2(c) (panel
placement) and E2(d) (the single-action notice). Writing all four in S1 would leave the document
describing code that does not exist for a whole PR.

## Data Flow

    LanasPage (Server) ──> YarnsView ("use client")  filters · reloadToken · detailId · catalogToken
      ├─ getYarns(filters) ──> GET /api/yarns ──> loaded.yarns ─┬─> YarnCard[onOpen → setDetailId]
      │                                                         └─> find(detailId) ?? null
      │                                                              └─> YarnDetailDrawer (Dialog placement="side")
      │                                                                    └─> Stepper(min=0, no max)
      │                                            onUsedQuantityChange
      │        patchYarnUsedQuantity(id, n) ──> PATCH /api/yarns/:id ──> { yarn: SerializedYarnRecord }
      │                                            └─> mergeYarnPatch(current, patched)  ← names survive
      │                                                 └─> setLoaded(same key, one row replaced)
      └─> YarnFilterPanel (Card, raised)
            ├─> YarnBrandTree[getBrandTree, dep: catalogToken]
            ├─> ColorFamilyFilter
            └─> YarnCatalogPanel (Disclosure) ── createBrand/createYarnType/deleteBrand/deleteYarnType
                     ├─ ConfirmDialog (before delete)      ── onCatalogChange(removed?) ──┐
                     └─ Dialog (after 409, one action)                                    │
                                                          catalogToken++ + filter reset ←─┘

## File Changes

| File | Action | Slice |
|---|---|---|
| `src/shared/ui/primitives/stepper/{Stepper.tsx,stepper.variants.ts,index.ts}` | Create | S1 |
| `src/shared/ui/primitives/stepper/{Stepper.test.tsx,Stepper.boundary.test.ts}` | Create | S1 |
| `src/shared/ui/primitives/index.ts` | Modify | S1 — `export * from "./stepper"` |
| `src/shared/ui/public-api.test.ts` | Modify | S1 — anchor every name the barrel now exposes (`Stepper`, `STEPPER_SIZES`, `stepperVariants`, `STEPPER_DECREMENT_LABEL`, `STEPPER_INCREMENT_LABEL`) |
| `src/features/yarns/ui/YarnDetailDrawer.tsx` + `.test.tsx` | Create | S1 |
| `src/features/yarns/ui/merge-yarn.ts` + `merge-yarn.test.ts` | Create | S1 |
| `src/features/yarns/ui/YarnCard.tsx` + `.test.tsx` | Modify | S1 — `onOpen` replaces `noOpTap` (debt 192) |
| `src/features/yarns/ui/yarns-client.ts` + `.test.ts` | Modify | S1 — `patchYarnUsedQuantity` |
| `src/features/yarns/ui/types.ts` | Modify | S1 — `SerializedYarnRecord`, `YarnDetailPayload` |
| `src/features/yarns/ui/index.ts` | Modify | S1 — export the drawer |
| `src/features/yarns/ui/brands-client.ts` + `.test.ts` | Create | S2 — `getBrandTree` moved in + 4 mutations |
| `src/features/yarns/ui/YarnCatalogPanel.tsx` + `.test.tsx` | Create | S2 |
| `src/features/yarns/ui/YarnBrandTree.tsx` + `.test.tsx` | Modify | S2 — local `fetchTree` deleted, `catalogToken` dep |
| `src/features/yarns/ui/YarnFilterPanel.tsx` + `.test.tsx` | Modify | S2 — panel slot, `catalogToken`, `onCatalogChange` |
| **`src/features/yarns/ui/YarnsView.tsx` + `.test.tsx`** | Modify | **S1 then S2** |
| **`src/features/yarns/ui/yarn-copy.ts`** | Modify | **S1 then S2** |
| **`src/features/yarns/ui/yarns-ui.classes.test.ts`** | Modify | **S1 adds `YarnDetailDrawer.tsx`, S2 adds `YarnCatalogPanel.tsx`** |
| **`docs/design/rfc/RFC-04-lanas.md`** | Modify | **S1 E2(a)(b), S2 E2(c)(d)** |
| **`docs/historial/deuda-tecnica.md`** | Modify | **S1 strikes 192 + files the «Editar» no-op; S2 nothing new; 193 untouched** |

**S2 re-opens six files S1 already wrote** (bold rows). In the feature-branch chain S2 branches
off S1, so these are sequential edits, not conflicts — but `sdd-tasks` must sequence them and
`sdd-apply` must not reorder the slices.

**Client vs Server.** `Stepper` carries `"use client"`: it attaches `onClick` and lives in
`shared/ui`, where a Server Component may import it directly — same reason as `Disclosure` and
`Field`, and unlike `Swatch`, which has neither hooks nor handlers. `YarnDetailDrawer` and
`YarnCatalogPanel` are `"use client"` (`useState`, `useEffect`, handlers). `YarnCard` stays
**without** a directive exactly as it ships today: it is only ever reached through the already
client `YarnsView`, and receiving `onOpen` does not change that.

**Layering.** Nothing under `src/app/api/`, `schema.ts`, `validation.ts` or `src/proxy.ts` is
touched. `brands-client.ts` imports `BrandRecord`/`YarnTypeRecord` by internal path
(`@/features/yarns/types`), never through the feature barrel, for the reason recorded in
`yarns-client.ts:9-11` (the barrel drags `./api` → Drizzle into the browser bundle).

## Interfaces / Contracts

```ts
// features/yarns/ui/YarnDetailDrawer.tsx
export interface YarnDetailDrawerProps {
  yarn: SerializedYarnListItem | null;      // null → early return null, Dialog unmounts
  onClose: () => void;
  onUsedQuantityChange: (next: number) => void;
  usedQuantityPending?: boolean;            // disables the stepper while the PATCH is in flight
  usedQuantityError?: string | null;        // inline Spanish message under the stepper
  onEdit?: () => void;                      // documented no-op until entry 25 (proposal D6)
}

// features/yarns/ui/yarns-client.ts
export type YarnPatchResult =
  | { ok: true; data: SerializedYarnRecord }
  | { ok: false; message: string };
export function patchYarnUsedQuantity(id: string, usedQuantity: number): Promise<YarnPatchResult>;
```

**Design tokens consumed** — `--space-1/2/3/4/5/8`, `--touch-target`, `--focus`,
`--border-width`/`--border-width-heavy`, `--radius-sm`/`--radius-md`, `--surface-raised`,
`--surface-sunken`, `--fg`/`--fg-muted`, `--danger`, `--accent`/`--accent-fg`, `--z-overlay`/
`--z-modal` (via `Dialog`), `--font-body`/`--font-display`/`--font-mono` and the
`--text-*`/`--leading-*` pairs. Zero literal values; canonical v4 syntax only.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `mergeYarnPatch` | names survive a `usedQuantity`-only patch; unknown id is a no-op; dates stay strings |
| Unit | `patchYarnUsedQuantity` | body is exactly `{ usedQuantity }`; 200 shape; 400/404 and network → `ok:false` |
| Unit | `brands-client` | `getBrandTree` 1+N and its `failed` degradation (moved behaviour, same assertions); each mutation's 201/204; **409 → `kind:"blocked"` with both counts for a brand, one for a type** |
| UI (RTL+axe) | `Stepper` | `+`/`−` emit `value ± step`; at `min` the `−` is disabled and emits nothing; no `max` → `+` never stops; `<output>` is `role="status"` and carries the formatted value; Enter/Space on both buttons; group is named; `axe` clean |
| Gate | `Stepper.boundary.test.ts` | reads its own source (`Swatch.boundary.test.ts` shape): no `shared/config`, no `ColorFamily`, and no `yarn`/`usedQuantity`/`ovillo` |
| UI (RTL) | `YarnDetailDrawer` | all eleven fields render; `Escape`/close return focus to the card; stepper change calls back once; pending disables; error renders; «Editar» is a reachable `<button>` that changes nothing |
| UI (RTL) | `YarnsView` | tap opens the drawer for the tapped id; **after a stepper change the card still reads `marca · tipo · colorName` and no skeleton appears**; a refetch without the yarn closes the drawer |
| UI (RTL) | `YarnCatalogPanel` | loading/empty/error+retry; create appends; delete asks `ConfirmDialog` first; a 409 opens a one-button `Dialog` naming the counts; a 0 count is omitted |
| UI (RTL) | `YarnFilterPanel` + `YarnBrandTree` | deleting in the panel re-reads the tree (`catalogToken`); a delete of the active brand clears `brandId` **and** `typeId` and keeps `colorFamily` |
| Gates | repo-wide | `no-hardcode` / canonical-Tailwind auto-cover new files; `yarns-ui.classes.test.ts` and `public-api.test.ts` need a manual entry each |
| Manual | REGLA 4 | the drawer on a real `/lanas`, the stepper's round-trip latency, the nested `Disclosure` markers |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification or
process-integration boundary. No route is added; `src/proxy.ts` is untouched.

## Migration / Rollout

No migration: no schema, no endpoint, no auth, no cookie. Rollback per slice exactly as the
proposal states; S1 first if both must go.

## Open Questions

- [ ] S2 (panel + two dialogs + plumbing) may exceed the 400 non-test-line budget now that
      `ConfirmDialog` joins the 409 `Dialog`; `sdd-tasks` forecasts and, if high, splits it into
      `S2a catalog-read-create` / `S2b catalog-delete-409`.
