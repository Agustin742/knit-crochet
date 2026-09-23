# Design: Yarn create/edit modal with tabs (backlog 25)

## Technical Approach

A thin `YarnFormDialog` shell copies `ProjectFormDialog`'s lifecycle (`target | null`, inner form
keyed per open so it remounts fresh, per-field errors, pending-focus tick, photo uploaded on file
choice, empty-patch short-circuit) and renders the shared `Tabs` primitive with two **controlled**
tab components, `YarnIdentityTab` and `YarnTechnicalTab`. **Every piece of state that must survive a
tab switch or an in-flight request lives in the shell**: form values, errors, the active tab, the
brand/type catalogue, upload progress and inline-create outcomes. Validation, the edit patch and
the zod-issue → field mapping are pure functions in a new `yarn-form.ts`, unit-tested without RTL.
The HTTP seam grows `createYarn`/`updateYarn` (409 → `colorCode`, D7) in `yarns-client.ts` and a
new generic `uploads-client.ts` owned by the `uploads` feature. `YarnsView` gains a `formRequest`,
the header/empty-state «Agregar lana» button (D9), the drawer's `onEdit`, and reload-after-save
(D8). Zero backend, schema, validation or `src/proxy.ts` changes.

Proposal positions: **D1, D2, D4, D5, D6, D7, D8, D9 confirmed**. **D3 confirmed with one
correction** (the catalogue panel does not listen to `onCatalogChange` today — see D3). The
upload wrapper moves from `yarns-client.ts` to `features/uploads/ui/uploads-client.ts` (D10).

## Architecture Decisions

### D1 — thin shell + one controlled component per tab (confirmed)

| Option | Tradeoff |
|---|---|
| One ~700-line `YarnFormDialog.tsx` (1:1 with `ProjectFormDialog`) | proven, but unreviewable in one PR and still needs artificial cuts |
| **Chosen: shell + `YarnIdentityTab` + `YarnTechnicalTab` + pure `yarn-form.ts`** | more prop plumbing; in exchange each tab is a presentational, independently tested unit and the chain gets real seams |

The shell keeps the **target/key remount** contract verbatim (`ProjectFormDialog.tsx:104-121`): the
child has no `open` state, returns `null` without a target, and the inner `YarnForm` is keyed
`"create"` or `` `edit|${yarn.id}` ``.

### D2 — shell-owned state; switch to the tab of the first invalid field, then focus it (confirmed, hard requirement)

**Evidence:** `Tabs.tsx:163-174` mounts **only the selected panel** (`selected.content` inside one
`role="tabpanel"`). State inside a tab dies on every switch, and a field in the inactive tab has no
DOM node to focus.

- The shell owns `values: YarnFormValues` (one object, text-typed like `ProjectFormDialog`'s
  `targetRoundsText`), `errors: YarnFormErrors`, `tab: YarnFormTab`, `catalog: BrandTreeState`,
  `uploading`, `fileName`, `formError`, `pending`, `catalogPending`.
- Tabs receive `values`, `errors`, `onChange(patch)`, `disabled` and **typed refs created by the
  shell** (one `useRef` per focusable field, as `ProjectFormDialog.tsx:150-155`).
- `reportErrors(errors)` sets the errors, picks `first = YARN_FORM_FIELDS.find(f => errors[f])`
  (screen order: Identidad fields, then Ficha técnica fields), calls `setTab(TAB_OF_FIELD[first])`
  and `requestFocus(first)` **in the same batch**. The existing pending-focus pattern
  (`pendingFocusRef` + `focusTick`, `ProjectFormDialog.tsx:220-248`) is what makes this work: the
  focus effect runs **after the commit that mounted the new panel**, so the ref is attached by then.
  No extra mechanism is needed.
- The same path handles the server's 409: `{ colorCode: message }` → switch to «Identidad» →
  focus `colorCode`.
- Errors persist until the next submit (precedent; no per-keystroke clearing).
- Default tab is `"identity"` in both modes. Values are held in the shell, so leaving and returning
  to a tab never loses input (RTL test).

### D3 — brand/type choose-or-create: form-local, reusing `brands-client`, no panel refactor (confirmed, with a correction)

**Confirmed.** `brands-client.ts` already exports `getBrandTree`, `createBrand` and
`createYarnType` with typed results; that is the reusable part. `YarnCatalogPanel`'s create UX is a
**modal** (`YarnCatalogPanel.tsx:414-461`), and opening a `Dialog` from inside the yarn `Dialog` is
what the backlog entry forbids ("crear o elegir inline"). The user's standing preference (visible
trigger, no creation hidden behind an accordion) is honoured: the trigger is always visible next to
the `Select`, and nothing is collapsed.

**New feature-local `ChooseOrCreateField`**, used twice (brand, then type):

- A `Field` + `Select` (placeholder option `value=""`), with a visible `Button variant="secondary"`
  «Nueva marca» / «Nuevo tipo» beside it. Pressing it reveals **below the select** (the select
  stays mounted, so it remains a focus target for validation) an inline row: `Field` + `Input` +
  «Crear» + «Cancelar».
- **The inline row is not a `<form>`** — it lives inside the yarn `<form>` and nested forms are
  invalid HTML. «Crear» is `type="button"`; `Enter` in its input calls `preventDefault()` and
  triggers the create (otherwise it would submit the yarn form); `Escape` calls
  `stopPropagation()` and closes only the inline row (otherwise `Dialog.tsx:199-203` closes the
  whole modal).
- States from `catalog.status`: `loading` → `Skeleton` + named status region; `failed` → message +
  «Reintentar» (shell refetch); `ready` → select. The type field is `disabled` until a brand is
  chosen.
- The inline-row UI state (open, typed name, local pending/error) is **local** to the field and may
  be lost on a tab switch — acceptable for an abandoned inline create. The **outcome** is not local:
  the field awaits `onCreate(name)`, which the shell owns.

**Late-response guard: value-at-request, not a token.** The shell's `createBrandInline(name)`
captures `brandIdAtRequest = values.brandId` **before** `await createBrand(name)`. On `ok`, it
always appends the brand to `catalog` and calls `onCatalogChange()` (the server committed — same
rule as `YarnCatalogPanel.tsx:244-251`), and **selects** the new brand only through a functional
updater that checks `current.brandId === brandIdAtRequest`. If the user picked another brand while
the request was in flight, the late response does not override the choice. `createTypeInline` is
the same with `(brandId, typeId)` captured; the new type is appended to **its** brand's entry, and
selected only if `current.brandId === brandId && current.typeId === typeIdAtRequest`. This is the
E2(e) guarantee without refs, and no `useLatestRequest` extraction is needed at all. If the form
unmounts mid-request, `setState` is a no-op and `onCatalogChange` still fires. `catalogPending` (a
counter) disables submit while any inline create is in flight.

**Amended 2026-09-22 (review lineage review-7a5543c9e8b79ca4, finding R3-001).** The value-at-request
equality check above is **not monotonic**: an A→B→A sequence (including back to the empty
placeholder) lets a stale response win once it coincidentally matches the value again, and two
overlapping creates started from the same starting value let whichever resolves first override the
user's later intent instead of the later-started request winning. Fix: replace the equality check
with a **per-field monotonic request sequence** — a `brandRequestSeq`/`typeRequestSeq` counter ref
in the shell, incremented on every selection change *and* on every create start; `createBrandInline`/
`createTypeInline` capture their own sequence number at request start and apply the result only if
that number still equals the current counter when the response resolves. `onCatalogChange` still
always fires on `ok`, independent of the sequence check. New RTL coverage: an A→B→A sequence, and
two overlapping creates from the same starting value (S5, tasks 5.9–5.10).

Changing the brand resets the type — enforced once in the pure `applyChange(values, patch)`
(`yarn-form.ts`), not in the tab.

**Correction to the proposal — the catalogue panel does not refresh on `onCatalogChange`.**
`YarnCatalogPanel.tsx:140-150` refetches only on its own `retryToken`; `catalogToken` reaches only
`YarnBrandTree` (`YarnFilterPanel.tsx:62-71`, `YarnBrandTree.tsx:66`). RFC-04 E2(d) says the same:
the signal refreshes "el árbol marca→tipo del panel de filtro". To meet the success criterion
("an inline create refreshes the filter tree **and** the catalogue panel") with minimal blast
radius:

- `YarnCatalogPanel` gains `refreshToken?: number` (default `0`), added to its fetch effect's deps
  `[retryToken, refreshToken]`. Additive, ~3 lines; no token refs migrated, no refactor.
- `YarnFilterPanel` forwards `catalogPanelToken` → `refreshToken`.
- `YarnsView` keeps `handleCatalogChange` for the panel (unchanged), and adds
  `handleFormCatalogChange = () => { handleCatalogChange(); setCatalogPanelToken(t => t + 1); }`
  for the form. **A separate token, not `catalogToken`**: forwarding `catalogToken` into the panel
  would make every create/delete in the panel refetch the panel itself (an extra 1+N round trip for
  data it already appended in memory).

The fourth 1+N brand-tree fetch (tree, panel, form) is accepted and filed as a follow-up debt.

### D4 — `ColorFamilyPicker`: a new required single-select control (confirmed)

`ColorFamilyFilter.tsx:39-41` emits `undefined` when the pressed swatch is pressed again — the
filter's deselect semantics. `SegmentedControl` does not fit either: its `value` is required
(`NoInfer<TValue>`, no "none" for a blank create form) and it renders a joined text rail, not 13
swatches. A `required` mode on the filter would switch one shipped component's behaviour by flag
and couple two consumers' tests.

`ColorFamilyPicker` (feature-local) composes the same primitives (`Toggle`, `Swatch`,
`yarnSwatchClass`, `COLOR_FAMILY_LABELS`) inside a **`<fieldset>` + `<legend>`** — the implicit
`role="group"` named by the legend, the same shape as `NeedlesField.tsx:70-73` — with `aria-pressed`
buttons (the project's single-select convention, `SegmentedControl.tsx:94-98`).

- Pressing the selected swatch is a **no-op** (`onPressedChange(false)` is ignored); it never clears.
- The error renders in a `<span id>` with the danger message style; the fieldset carries
  `aria-describedby` to it and `aria-invalid="true"` when the `axe` test passes on the fieldset.

  **Amended 2026-09-22 (review lineage review-7a5543c9e8b79ca4, finding R3-003).** Dropping
  `aria-invalid` when axe rejects it on the fieldset contradicts this same spec's accessible-invalid-
  state requirement (`yarn-create-edit`, "Submitting with no colour family chosen is rejected"). The
  form MUST NOT ship without an accessible invalid state. Fallback: if axe flags `aria-invalid` on
  the `<fieldset>`/group, move `aria-invalid="true"` onto each individual `Toggle` swatch instead
  (still keeping `aria-describedby` on the fieldset pointing at the error `<span id>`) — the invalid
  state is then exposed at the control level rather than the group level, satisfying the requirement
  either way.
- The selected family's name is rendered as visible text beside the legend (`aria-hidden`, since
  `aria-pressed` already announces it): a swatch alone communicates by colour only.
- `focusRef` attaches to the pressed toggle, or to the first toggle when none is pressed.
- Filter and picker never share a screen (the modal covers the page), so the "controls that behave
  differently must look different" rule is not violated by the shared swatch look.

### D5 — `lot`: native `Input type="date"`; no new primitive (confirmed)

- **`Input` forwards `type`:** `Input.tsx:23-28` spreads `...props` onto `<input>`.
- **Surface and `color-scheme`:** there is **no** `color-scheme` declaration anywhere in `src/`
  (searched), so native controls render with the UA's light scheme. The `Input` paints
  `bg-surface-raised text-fg` (`Input.tsx:13`, `--surface-raised: #fffdf6`, `--fg: espresso`), and
  the `Dialog` panel is also `bg-surface-raised` (`dialog.variants.ts:87`). The date control is
  dark text and a dark calendar glyph on a light field — the legible combination. The "dark
  surface" risk does not apply inside the modal. **Do not add `color-scheme: dark`**: it would
  invert the glyph to light-on-light.
- The value is `YYYY-MM-DD`, exactly what `z.coerce.date` parses; `new Date("YYYY-MM-DD")` is UTC
  midnight by spec.

**Amended 2026-09-22 (review lineage review-7a5543c9e8b79ca4, finding R3-004).** The unit test named
above pins only a negative UTC offset (Buenos Aires). Add a second case under a **positive** UTC
offset (`Asia/Tokyo`) for both `lotInputValue` and the create-payload `lot` serialisation, asserting
the same UTC calendar date in both directions — both already operate on the ISO/UTC string, never
local-time methods, so no production change is expected; the test only closes the coverage gap (S2,
tasks 2.6–2.7).
- **Remaining gate is the browser (REGLA 4):** before closing the create slice, open the picker in
  the real modal and check the glyph, the popup and the focus ring. The generic `DateInput`
  primitive (with boundary test) is created **only** if that check fails. Not planned.

**UTC handling (the off-by-one risk).** `lot` is `timestamp` without time zone (`schema.ts:58`);
Drizzle maps it through UTC, and the list serialises it as `"2026-03-05T00:00:00.000Z"`.
`formatDate` already renders it with `timeZone: "UTC"` (`format.ts:34`). The edit prefill is
`lotInputValue(iso) = new Date(iso).toISOString().slice(0, 10)` (or `""` if unparsable) — **the UTC
date part, never `getDate()`/local formatting**. Unit test runs with `process.env.TZ` set to a
negative offset (`America/Argentina/Buenos_Aires`) and asserts `"2026-03-05"`. The patch compares
the `YYYY-MM-DD` strings, so an untouched lot never enters the patch.

### D6 — `NeedleRangeField`: feature-local `fieldset` with two inputs (confirmed)

`<fieldset>` + `<legend>` «Aguja recomendada (mm)», two `Field`s («Mínimo», «Máximo»), each an
`Input inputMode="decimal"` with its own error and ref. Feature-local: `{min,max}` is yarn-specific
and projects' `NeedlesField` is array-based. Error mapping (in `yarn-form.ts`): zod path
`["recommendedNeedle","min"]` → `needleMin`, `["recommendedNeedle","max"]` → `needleMax`, and the
object-level refine (path `["recommendedNeedle"]`, "El máximo debe ser >= al mínimo.") →
`needleMax`.

### D7 — any 409 from `createYarn`/`updateYarn` → `colorCode` (confirmed)

`yarnErrorResponse` (`api/yarns/params.ts:40-57`) emits a plain-`{ error }` 409 only for
`DuplicateColorCodeError`; the other 409 (`YarnReferencedError`, with `referencedBy`) is
DELETE-only. The client maps `409` to `{ ok: false, field: "colorCode", message:
DUPLICATE_COLOR_CODE_MESSAGE }` using a **client constant** (deterministic, test-stable, not coupled
to the server's wording), with a comment naming the assumption. A unit test pins it: a 409 from
POST and from PATCH both yield `field: "colorCode"`. Every other non-2xx and network failure yields
`field: null` and the existing `UNEXPECTED_ERROR_MESSAGE` / `NETWORK_ERROR_MESSAGE`, shown as the
form-level alert.

### D8 — reload after save, never merge (confirmed)

The POST/PATCH response is a raw `SerializedYarnRecord` (no `brandName`/`typeName`), an edit can
change brand/type, and a saved yarn may stop matching the active filters. `YarnsView.handleSaved`
clears `formRequest` and bumps `reloadToken`. `loaded.yarns` survives while the new key loads
(`YarnsView.tsx:93-96`), so there is no skeleton flash; the drawer resolves by id and shows the
updated yarn once the reload lands (or closes if the yarn no longer matches the filters —
existing D3 behaviour of entry 24). `mergeYarnPatch` stays exclusively for the stepper.

### D9 — one «Agregar lana» button: header when the grid has yarns, empty state when not (confirmed, user-accepted)

`ProjectsView.tsx:541-575,651-661` pattern: `emptyShown = !failed && yarns !== null &&
yarns.length === 0`; the header row (a `div`, not `<header>`, to avoid a second `banner`) shows the
`primary` button unless `emptyShown`, in which case it sits in `EmptyState`'s `action`. Never both.

**Amended 2026-09-22 (user-accepted scope addition): filtered-empty is its own state.**
`emptyShown` above is the **stash** empty state and also requires that no filter is active
(`!filters.brandId && !filters.typeId && !filters.colorFamily`). When the list is empty **with** a
filter active, `YarnsView` renders a no-matches `EmptyState` (title/description copy in
`yarn-copy.ts`, mirroring `ProjectsView`'s `NO_FILTER_MATCHES_TITLE`/`CLEAR_FILTERS_LABEL`,
`ProjectsView.tsx:95-98`) whose action is «Quitar filtros»: `setFilters({})`, which already feeds
`requestKey` and re-reads the list. The filter controls are controlled by `filters`, so they clear
with it — an RTL test asserts the tree and the colour row show no selection afterwards. In that
state «Agregar lana» stays in the header. Lands in **S6** (+~40 authored lines with tests).
The drawer's «Editar» becomes `variant="primary"` and calls `setFormRequest({ mode: "edit", id })`.
The form `Dialog` opens **stacked over** the drawer (the projects precedent,
`ProjectsView.tsx:705-709`); both are portals, `Escape` stops propagation, and closing returns
focus to «Editar».

### D10 — the photo upload client lives in the `uploads` feature (refines the proposal)

`uploadProjectImage` (`projects-client.ts:582-679`) cannot be imported across features by internal
path, and entry 28 (patterns form) will need the same upload. Rather than a fifth copy inside
`yarns-client.ts`, a new `src/features/uploads/ui/uploads-client.ts` exports
`uploadImage(file): Promise<{ ok: true; data: string } | { ok: false; message: string }>` with the
same three contract points (multipart `file`, no manual content-type, success **= 201** only) and
the 400/401/502 fallbacks derived from `ACCEPTED_IMAGE_TYPES`/`MAX_IMAGE_BYTES`. Projects keeps its
copy; migrating it is a follow-up debt (debt 129 stays open). The shell pre-checks with
`uploadImageInputSchema` before any network call, exactly as `ProjectFormDialog.tsx:351-378`.

**Amended 2026-09-22 (review lineage review-7a5543c9e8b79ca4, finding R3-002).** As specified, there
is no guard against overlapping uploads. Add an `uploadRequestSeq` counter ref in the shell,
incremented on every file choice *and* on «quitar foto»; each `uploadImage` call captures its
sequence number at request start and applies its result (`uploading`, `fileName`, `values.image`)
only if that number still equals the current counter when the response resolves — a response that
resolves after a later file choice, or after the photo was removed, is ignored. The file input stays
disabled while `uploading` regardless, as a first line of defence; the sequence guard is what makes
out-of-order resolution safe. New RTL coverage: out-of-order upload resolution, and remove-photo
during an in-flight upload (S5, tasks 5.11–5.12).

### D11 — numbers are typed as text, parsed once at submit, with Spanish copy for unparsable input

Numeric inputs are `Input inputMode="decimal"` (`quantity`: `inputMode="numeric"`), not
`type="number"` (the entry-24 stepper decision and the projects `targetRounds` precedent).
`parseDecimal` accepts a comma decimal (`"4,5"`). zod 4's own message for a non-number is English
("Invalid input: expected number…"), so validation runs **both** layers in one pass:
`errors = { ...issuesToErrors(zodIssues), ...copyOverrides(values) }`, where the overrides replace
the message for empty/unparsable numerics, an empty brand/type/colour family, and an empty `lot`.
The user sees every invalid field at once, in Spanish. Create starts `quantity` at `"0"`.

## Data Flow

    YarnsView  formRequest · reloadToken · catalogToken · catalogPanelToken · detailId
      ├─ «Agregar lana» (header | EmptyState.action) ──> formRequest = {mode:"create"}
      ├─ YarnDetailDrawer «Editar» (primary) ─────────> formRequest = {mode:"edit", id}
      ├─ toFormTarget(formRequest, yarns) ──> YarnFormDialog (target | null)
      │     └─ YarnForm (key = mode|id)   values · errors · tab · catalog · uploading · pending
      │          ├─ getBrandTree() on mount ──> catalog
      │          ├─ Tabs(tab)
      │          │   ├─ YarnIdentityTab ── ChooseOrCreateField ×2 · ColorFamilyPicker · photo
      │          │   │      onCreate ──> shell: createBrand/createYarnType ──> append + guarded select
      │          │   │                                         └─> onCatalogChange()
      │          │   └─ YarnTechnicalTab ── NeedleRangeField · Input type="date" · numerics
      │          ├─ file choice ──> uploadImageInputSchema ──> uploadImage ──> values.image
      │          └─ submit ──> validateCreate | validateEdit (yarn-form.ts)
      │                 ├─ errors ──> setTab(tab of first) + requestFocus(first)
      │                 ├─ empty patch ──> onClose (no request)
      │                 └─ createYarn / updateYarn ──> 409 ──> {colorCode} ──> same error path
      │                                              └─> ok ──> onSaved ──> reloadToken++
      └─ handleFormCatalogChange ──> catalogToken++ (tree) + catalogPanelToken++ (panel)

## File Changes

| File | Action | Slice |
|---|---|---|
| `src/features/yarns/ui/yarns-client.ts` + `.test.ts` | Modify | S1 — `createYarn`, `updateYarn`, `YarnSaveResult`, `DUPLICATE_COLOR_CODE_MESSAGE` (D7) |
| `src/features/uploads/ui/uploads-client.ts` + `.test.ts` | Create | S1 — `uploadImage` (D10) |
| `src/features/yarns/ui/yarn-form.ts` + `.test.ts` | Create | S2 — values, parsing, `applyChange`, `validateCreate`/`validateEdit`, `yarnPatch`, `issuesToErrors`, `lotInputValue`, field order/tab map |
| `src/features/yarns/ui/yarn-copy.ts` (+ `yarn-copy.test.ts` if it pins copy) | Modify | S2 — form copy; S5/S6 add the rest |
| `src/features/yarns/ui/ColorFamilyPicker.tsx` + `.test.tsx` | Create | S3 (D4) |
| `src/features/yarns/ui/NeedleRangeField.tsx` + `.test.tsx` | Create | S3 (D6) |
| `src/features/yarns/ui/YarnTechnicalTab.tsx` + `.test.tsx` | Create | S3 |
| `src/features/yarns/ui/ChooseOrCreateField.tsx` + `.test.tsx` | Create | S4 (D3) |
| `src/features/yarns/ui/YarnIdentityTab.tsx` + `.test.tsx` | Create | S4 |
| `src/features/yarns/ui/YarnFormDialog.tsx` + `.test.tsx` | Create | S5 (create mode) → S7 (edit mode) |
| `src/features/yarns/ui/YarnsView.tsx` + `.test.tsx` | Modify | S6 (create entry points, reload, catalogue signal) → S7 (edit) |
| `src/features/yarns/ui/YarnFilterPanel.tsx` + `.test.tsx` | Modify | S6 — forward `catalogPanelToken` |
| `src/features/yarns/ui/YarnCatalogPanel.tsx` + `.test.tsx` | Modify | S6 — `refreshToken?: number` effect dep (D3 correction) |
| `src/features/yarns/ui/YarnDetailDrawer.tsx` + `.test.tsx` | Modify | S7 — «Editar» `primary`, comment updated |
| `src/features/yarns/ui/yarns-ui.classes.test.ts` | Modify | S3, S4, S5 — add each new component to `COMPONENTS` (the compiled-CSS gate is a fixed list) |
| `docs/design/rfc/RFC-04-lanas.md` | Modify | S6 writes E3(a)–(e); S7 appends E3(f)–(g) (letters in writing order, as E2) |
| `docs/historial/deuda-tecnica.md` | Modify | S1 files "projects upload → uploads-client"; S6 strikes 193 and files "fourth brand-tree fetch"; S7 strikes 199 |
| `src/shared/ui/**` | None | D5 fallback not planned |

Untouched by contract: `src/app/api/**`, `src/features/*/schema.ts`, `validation.ts`,
`src/proxy.ts`. `yarn-form.ts` imports `createYarnSchema`/`updateYarnSchema` from
`@/features/yarns/validation` **by internal path** (zod + `shared/config` only; the barrel drags
Drizzle into the browser — same exception as `ProjectFormDialog.tsx:12-21`).

**Client directives.** `YarnFormDialog`, `ChooseOrCreateField` and `YarnIdentityTab` carry
`"use client"` (state/handlers). `ColorFamilyPicker`, `NeedleRangeField` and `YarnTechnicalTab` are
presentational and only reached through the client shell, so they follow `ColorFamilyFilter`
(no directive).

## Interfaces / Contracts

```ts
// features/yarns/ui/yarns-client.ts
export type YarnSaveResult =
  | { ok: true; data: SerializedYarnRecord }
  | { ok: false; field: "colorCode"; message: string }  // any 409 (D7)
  | { ok: false; field: null; message: string };
export function createYarn(payload: CreateYarnPayload): Promise<YarnSaveResult>;           // POST, 201
export function updateYarn(id: string, patch: UpdateYarnPayload): Promise<YarnSaveResult>; // PATCH, 200

// features/uploads/ui/uploads-client.ts
export type UploadImageResult = { ok: true; data: string } | { ok: false; message: string };
export function uploadImage(file: File): Promise<UploadImageResult>;

// features/yarns/ui/yarn-form.ts
export const YARN_FORM_FIELDS = [
  "brandId", "typeId", "colorName", "colorCode", "colorFamily", "image",          // identity
  "length", "fiber", "needleMin", "needleMax", "thickness", "lot", "quantity",    // technical
] as const;
export type YarnFormField = (typeof YARN_FORM_FIELDS)[number];
export type YarnFormTab = "identity" | "technical";
export const TAB_OF_FIELD: Record<YarnFormField, YarnFormTab>;
export type YarnFormErrors = Partial<Record<YarnFormField, string>>;
export interface YarnFormValues {
  brandId: string; typeId: string; colorName: string; colorCode: string;
  colorFamily: ColorFamily | null; image: string | null;
  length: string; fiber: string; needleMin: string; needleMax: string;
  thickness: string; lot: string /* YYYY-MM-DD */; quantity: string;
}
export function emptyYarnFormValues(): YarnFormValues;                     // quantity "0"
export function yarnFormValuesOf(yarn: SerializedYarnListItem): YarnFormValues;
export function lotInputValue(iso: string): string;                        // UTC date part or ""
export function applyChange(values: YarnFormValues, patch: Partial<YarnFormValues>): YarnFormValues; // brand change resets type
export function parseDecimal(text: string): number | null;                 // "4,5" | "4.5"
export function parseCount(text: string): number | null;                   // non-negative int
export function issuesToErrors(issues: readonly { path: PropertyKey[]; message: string }[]): YarnFormErrors;
export function firstInvalidField(errors: YarnFormErrors): YarnFormField | undefined;
export function validateCreate(values: YarnFormValues):
  | { ok: true; payload: CreateYarnPayload } | { ok: false; errors: YarnFormErrors };
export function validateEdit(before: YarnFormValues, after: YarnFormValues):
  | { ok: true; patch: UpdateYarnPayload | null /* null = nothing changed */ }
  | { ok: false; errors: YarnFormErrors };
// yarnPatch compares PARSED values (so "4,50" vs 4.5 is no change), recommendedNeedle as a whole
// object (sent whole if either bound changed), lot as its YYYY-MM-DD string.

// features/yarns/ui/YarnFormDialog.tsx
export type YarnFormTarget =
  | { mode: "create" }
  | { mode: "edit"; yarn: SerializedYarnListItem };   // edit arm added in S7
export interface YarnFormDialogProps {
  target: YarnFormTarget | null;       // null → renders nothing
  onClose: () => void;
  onSaved: (yarn: SerializedYarnRecord) => void;
  onCatalogChange: () => void;         // after every successful inline create
}

// features/yarns/ui/ChooseOrCreateField.tsx
export type InlineCreateOutcome = { ok: true } | { ok: false; message: string };
export interface ChooseOrCreateFieldProps {
  label: string; placeholder: string;
  options: readonly { id: string; name: string }[];
  value: string; onValueChange: (id: string) => void;
  status: "loading" | "failed" | "ready"; onRetry: () => void;
  createTriggerLabel: string; createFieldLabel: string;
  onCreate: (name: string) => Promise<InlineCreateOutcome>;
  error?: string; disabled?: boolean;
  selectRef: RefObject<HTMLSelectElement | null>;
}

// features/yarns/ui/ColorFamilyPicker.tsx
export interface ColorFamilyPickerProps {
  value: ColorFamily | null;
  onValueChange: (value: ColorFamily) => void;   // never emits "none"
  error?: string; disabled?: boolean;
  focusRef?: RefObject<HTMLButtonElement | null>;
}

// features/yarns/ui/NeedleRangeField.tsx
export interface NeedleRangeFieldProps {
  min: string; max: string;
  onMinChange: (text: string) => void; onMaxChange: (text: string) => void;
  minError?: string; maxError?: string; disabled?: boolean;
  minRef?: RefObject<HTMLInputElement | null>; maxRef?: RefObject<HTMLInputElement | null>;
}

// Tabs (controlled, presentational)
interface YarnTabProps {
  values: YarnFormValues; errors: YarnFormErrors;
  onChange: (patch: Partial<YarnFormValues>) => void; disabled: boolean;
}
// YarnIdentityTab adds: catalog, onRetryCatalog, onCreateBrand, onCreateType,
//   photo { fileName, uploading, onFile, onRemove }, refs for its six fields.
// YarnTechnicalTab adds: refs for its seven fields.

// YarnsView (S6/S7)
type FormRequest = { mode: "create" } | { mode: "edit"; id: string };  // id, never the object
// YarnCatalogPanel: refreshToken?: number (default 0) — additive effect dependency
```

**Dialog usage.** `Dialog size="lg"`, `initialFocusRef` = the brand `Select` ref. While the catalogue
is still loading the ref is unmounted and `Dialog` falls back to the panel by design
(`Dialog.tsx:174-179`); the title is announced first. The form keeps `noValidate method="post"`
(debts 39/43). The action row (Cancelar `secondary`, Guardar `primary` with `loading={pending}`,
disabled while `uploading || catalogPending > 0`) sits **outside** `Tabs`, visible on both tabs.
The form-level error is an inline `<p role="alert">` (no cross-feature import of projects'
`ActionError`).

**Tokens consumed:** `--space-1..8`, `--touch-target`, `--focus`, `--border-width`/`-heavy`,
`--radius-sm/md`, `--surface-raised`, `--surface-sunken`, `--fg`/`--fg-muted`, `--danger`,
`--accent`/`--accent-fg`, the `--yarn-*` family tokens via `yarnSwatchClass`, font/text/leading
pairs. `fieldset` resets (`m-0 border-0 p-0 min-w-0`) as in `NeedlesField`. Zero literal values.

## Testing Strategy

Strict TDD (RED → GREEN → REFACTOR) with `pnpm test` (Vitest 4, RTL + `user-event` 14 on happy-dom,
`vitest-axe`). SDD-01 §9: behaviour + a11y + render smoke; typecheck/lint/build as gates.

| Layer | What | Approach |
|---|---|---|
| Unit | `createYarn`/`updateYarn` | POST/PATCH bodies and methods; 201/200 → `ok` with raw record; **409 on each → `field: "colorCode"`** (D7 pin); 400/404/network/unreadable body → `field: null` |
| Unit | `uploadImage` | `FormData` with only `file`, no manual content-type; **200 is not success**; 400/401/502 fallbacks; server `{ error }` wins when readable |
| Unit | `yarn-form.ts` | `lotInputValue` under `TZ=America/Argentina/Buenos_Aires` → same UTC day; `parseDecimal("4,5") === 4.5`; `applyChange` brand change resets type; `issuesToErrors` maps the needle refine to `needleMax`; Spanish overrides replace zod's English number message; `validateEdit` returns `patch: null` when nothing changed, including `"4,50"` vs `4.5` and an untouched lot; needle sent whole; create payload's `lot` serialises to `YYYY-MM-DDT00:00:00.000Z` |
| UI (RTL+axe) | `ColorFamilyPicker` | 13 named `aria-pressed` buttons in a legend-named group; pressing emits the family; pressing the selected one emits nothing; error wiring (`aria-describedby` always; `aria-invalid` on the fieldset if axe allows, else on each toggle — R3-003); `axe` clean |
| UI (RTL+axe) | `NeedleRangeField` | legend names the group; two labelled inputs; each error on its own input |
| UI (RTL) | `YarnTechnicalTab` | every field controlled; `lot` is `type="date"`; `usedQuantity` absent; errors wired; smoke |
| UI (RTL+axe) | `ChooseOrCreateField` | loading/failed+retry/ready; trigger reveals inline row with focus in its input; **`Enter` creates and does not submit an enclosing form**; **`Escape` closes only the row** (inside a `Dialog`); error on failure; disabled state |
| UI (RTL) | `YarnIdentityTab` | brand/type/colour/photo wiring; type disabled without brand; smoke |
| UI (RTL+axe) | `YarnFormDialog` (create) | **fill «Identidad», switch to «Ficha técnica» and back → values survive**; **submit from «Identidad» with «Ficha técnica» empty → tab switches and focus lands on `length`**; 409 → «Identidad» selected, message on `colorCode` with `aria-invalid`, no page-level alert; inline brand create selects it and calls `onCatalogChange` once; **late brand-create response after the user picked another brand does not override it**; upload pre-check blocks a bad file without fetch; submit disabled while uploading; `axe` clean |
| UI (RTL) | `YarnFormDialog` (edit, S7) | prefilled values (lot unshifted); untouched submit closes **without a request**; brand change resets type and PATCHes brand+type |
| UI (RTL) | `YarnsView` | empty stash → «Agregar lana» in `EmptyState`, not in header; non-empty → header only; create → list reloads and the card appears; drawer «Editar» is `primary` and opens the prefilled modal; **brand change in edit updates the card's «marca · tipo»** (reload, not merge); inline create refreshes the filter tree **and** the catalogue panel |
| UI (RTL) | `YarnCatalogPanel` | bumping `refreshToken` refetches; its own create does **not** trigger an extra refetch |
| Gates | repo-wide | `no-hardcode` and canonical-Tailwind sweep new files automatically; `yarns-ui.classes.test.ts` needs each new component added by hand |
| Manual | REGLA 4 | date picker glyph/popup/focus ring in the real modal (D5 gate); stacked modal over drawer; tab switch on error; mobile width via iframe |

**Gotcha to confirm in RED:** `user-event` typing into `type="date"` under happy-dom may not
update the value; if it does not, set it with `fireEvent.change(input, { target: { value } })` for
that one field only, and keep `user-event` everywhere else.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification or
process-integration boundary. No route is added; `src/proxy.ts` is untouched.

## Slice Plan (auto-chain, ~400 authored changed lines per PR; `sdd-tasks` owns final boundaries)

| Slice | Content | Forecast (src + tests) | User-visible |
|---|---|---|---|
| **S1** `yarn-save-client` | `createYarn`/`updateYarn` (D7), `uploads-client` (D10), debt entry | ~140 + ~200 ≈ **340** | No |
| **S2** `yarn-form-model` | `yarn-form.ts` + form copy | ~170 + ~210 ≈ **380** (+Tokyo TZ case, R3-004) | No |
| **S3** `yarn-technical-controls` | `ColorFamilyPicker`, `NeedleRangeField`, `YarnTechnicalTab`, classes-gate entries | ~190 + ~205 ≈ **395** (+per-toggle `aria-invalid` fallback, R3-003) | No |
| **S4** `yarn-identity-tab` | `ChooseOrCreateField`, `YarnIdentityTab`, gate entries | ~220 + ~200 ≈ **420** (split `ChooseOrCreateField` alone if the forecast runs high) | No |
| **S5a** `yarn-form-shell-create` | `YarnFormDialog` create mode: state, tabs, focus/tab switch, create submit, 409 | ~150 + ~150 ≈ **300** | No |
| **S5b** `yarn-form-async-inputs` | photo upload and inline brand/type create, each built directly with its monotonic request sequence (R3-001/R3-002) — split applied 2026-09-22 because S5 had grown to ≈565 | ~135 + ~130 ≈ **265** | No |
| **S6** `yarn-create-wiring` | `YarnsView` header/empty action, reload, `handleFormCatalogChange`, panel `refreshToken`, RFC-04 E3(a)–(e), strike debt 193 | ~90 + ~130 ≈ **220** | **Yes: create works** |
| **S7** `yarn-edit` | edit arm of the shell (prefill, `validateEdit`, empty-patch close, `updateYarn`), drawer «Editar» `primary` + wiring, E3(f)–(g), strike debt 199 | ~90 + ~170 ≈ **260** | **Yes: edit works** |

Total ≈ 2,580 authored lines (amended 2026-09-22, review lineage review-7a5543c9e8b79ca4: R3-001,
R3-002, R3-003, R3-004 add ~180 lines, concentrated in S5). Each slice depends only on earlier ones;
revert from the top down. S1–S5 ship tested but unmounted code, accepted in the proposal. Budget
risk: **Medium-High** (S4 near the line, S5 now well over it; both have a named split point).

## Migration / Rollout

No migration: no schema, endpoint, auth or cookie change. Rollback per slice: reverting S6 restores
the action-less `EmptyState` (reopen debt 193) and the panel's `[retryToken]` effect; reverting S7
restores the no-op `secondary` «Editar» (reopen debt 199). S1–S5 are new files plus additive client
functions with no consumer.

## Open Questions

- [ ] None blocking. Non-blocking, recorded for `sdd-tasks`/apply: whether `aria-invalid` on the
      colour-family `fieldset` passes `axe` (D4 has the fallback); whether `user-event` drives a date
      input under happy-dom (Testing Strategy has the fallback).
- [x] ~~Observation outside scope~~ — **brought into scope by the user on 2026-09-22.** `YarnsView`
      showed «Sin lanas en el stash todavía» also when **filters** yield zero results. Resolved by
      the D9 amendment (no-matches state with «Quitar filtros», S6) and the `yarn-inventory-browsing`
      delta.
