## Exploration: yarns-form-ui (backlog entry 25) — Yarn create/edit modal with tabs

> Materialized from Engram `sdd/yarns-form-ui/explore` (obs #534) by the orchestrator: the explore
> phase agent had no filesystem write tool.

### Current State

**API contract (already exists, no backend work needed for base CRUD):**
- `POST /api/yarns` (`src/app/api/yarns/route.ts`) validates with `createYarnSchema`, calls `createYarn`, returns `201 { yarn }`.
- `PATCH /api/yarns/:id` (`src/app/api/yarns/[id]/route.ts`) validates with `updateYarnSchema` (= `createYarnSchema.partial()` + "must not be empty" refine), returns `200 { yarn }`.
- `createYarnSchema` (`src/features/yarns/validation.ts:23`): `brandId`/`typeId` (uuid), `colorName`, `colorCode` (1-100 chars), `colorFamily` (enum `COLOR_FAMILIES`), `image` (url, nullable/optional), `quantity`/`usedQuantity` (nonneg int, optional), `length` (positive number), `fiber`, `recommendedNeedle: {min, max}` (both positive, refine `max >= min`), `thickness` (positive number), `lot` (`z.coerce.date`).
- **409 shape**: `DuplicateColorCodeError` → `yarnErrorResponse` (`src/app/api/yarns/params.ts:40`) → `errorResponse(message, 409)` = plain `{ error: string }`, **no field discriminator**. It's the only 409-without-`referencedBy` case for yarn create/update, so client code can safely treat any 409 from `createYarn`/`updateYarn` as the `colorCode` conflict.
- DB: unique constraint `yarns_brand_color_code_unique` on `(brandId, colorCode)` (`src/features/yarns/schema.ts:63`), detected via `isDuplicateColorCode` in `src/features/yarns/api/store.ts` (SQLSTATE 23505 + constraint name + cause-chain walk, depth 5).
- Brands/types: `POST /api/brands` (`createBrandSchema {name}`) and `POST /api/brands/:id/types` (`createYarnTypeSchema {name}`) already exist and are consumed by `src/features/yarns/ui/brands-client.ts` (`createBrand`, `createYarnType`, both typed `{ok:true,data}|{ok:false,message}`, network/unexpected-error messages included) and `getBrandTree()` (GET /api/brands + N GET .../types in parallel, returns `{status:"loading"|"ready"|"failed", entries: {brand, types}[]}`).
- Upload: single shared `POST /api/uploads/image` (`src/app/api/uploads/image/route.ts`), multipart `file` field only, folder/publicId derived from JWT userId server-side. Already consumed client-side by `uploadProjectImage` in `src/features/projects/ui/projects-client.ts` (pattern to mirror for yarns: validate with `uploadImageInputSchema` client-side before upload, upload on file *choice* not on submit, disable submit while `uploading`).

**Closest precedent — entry 22 `ProjectFormDialog.tsx`** (`src/features/projects/ui/ProjectFormDialog.tsx`, ~620 lines): full create/edit-in-one-Dialog pattern to copy:
- Outer `ProjectFormDialog` component takes `target: {mode:"create",...} | {mode:"edit", project} | null`, renders `null` if target is null, else mounts inner `ProjectForm` **with a `key`** derived from mode+id so it fully remounts (fresh state) per open — no prop-sync bugs.
- Field-level errors state (`Partial<Record<FieldName,string>>`) + `FOCUS_ORDER` array + `requestFocus`/`pendingFocusRef`+`focusTick` pattern to move focus to the first invalid field AFTER React commits disabled→enabled transitions (documented gotcha: calling `.focus()` synchronously after `await` can hit a still-disabled DOM node because state updates after `await` batch).
- `reportIssues(zodIssues)` maps zod issues to per-field errors in screen order.
- Photo uploads **on file choice**, not on submit, guarded by a `uploadImageInputSchema` client pre-check.
- Edit path computes a **patch** (`projectPatch(before, after)`) and short-circuits (closes without a network call) if the patch is empty — server also 400s on an empty PATCH via the schema refine.
- Uses `Dialog`, `Field`, `Input`, `Select`, `FileInput`, `Textarea`, `Button`, `Skeleton` from `@/shared/ui`.

**Design-system primitives available (`src/shared/ui/primitives/`)** — no gap for the modal shell itself:
- `Tabs` (`primitives/tabs/Tabs.tsx`) — full WAI-ARIA `tablist`/`tab`/`tabpanel` pattern (roving tabindex, arrow-key nav with wraparound, only mounts the active panel), with its own tests. **Not a gap.**
- `Dialog`, `Field` (label + `id`/`aria-invalid`/`aria-describedby`, error message styling via `fieldMessageVariants({invalid})`), `Input`, `Select`, `Textarea`, `FileInput`, `Button`, `ConfirmDialog`, `Toggle`, `Swatch`, `Skeleton`, `Disclosure` all exist with tests.

**`ColorFamilyFilter.tsx`**: existing swatch row is a filter, not a form control — `role="group"` of independently `aria-pressed` `Toggle`s wrapping `Swatch`, and re-clicking the active one deselects it (`value: ColorFamily | undefined`). `colorFamily` is **required** in `createYarnSchema`, so its deselect-to-clear semantics don't fit the form as-is.

**`YarnDetailDrawer.tsx`** already has a real `onEdit?: () => void` prop called from a `variant="secondary"` «Editar» button; its comment says entry 25 wires it and promotes it to `primary` (debt 199). `YarnsView.tsx` renders the drawer without `onEdit`, and its empty state renders a plain `EmptyState` with no create action (debt 193).

**Data available for edit**: `SerializedYarnListItem` (`src/features/yarns/ui/types.ts`) already carries the full row plus joined `brandName`/`typeName`; `YarnsView` holds the list in state, so no extra `GET /api/yarns/:id` is needed to open the edit modal.

### Affected Areas

- `src/features/yarns/ui/YarnFormDialog.tsx` (new) — modal, tabs, submit/patch logic, focus management.
- `src/features/yarns/ui/yarns-client.ts` — add `createYarn`/`updateYarn` with 409 → `colorCode` handling.
- `src/features/yarns/ui/yarn-copy.ts` — tab names, field labels, submit/cancel, photo copy.
- `src/features/yarns/ui/YarnsView.tsx` — empty-state «Agregar lana» (debt 193), `onEdit` to the drawer (debt 199), `formTarget` state like `ProjectsView`.
- `src/features/yarns/ui/YarnDetailDrawer.tsx` — «Editar» `secondary` → `primary`.
- `src/features/yarns/ui/YarnCatalogPanel.tsx` — candidate for extracting its brand/type create pattern (request-token guard).
- Possibly `src/shared/ui/primitives/` — only if design decides a new primitive is warranted.
- Tests: `YarnFormDialog.test.tsx`, `yarns-client.test.ts`, `YarnsView.test.tsx`.

### Gaps / Risks

1. **No required-selection swatch-group precedent** (`ColorFamilyFilter` is optional/deselectable). Options: new form-local single-select picker on `Swatch`/`Toggle`, or a `required` mode on `ColorFamilyFilter`.
2. **No `{min,max}` needle-range field precedent** (projects' `NeedlesField` is array-based). Feature-local vs `shared/ui` is a design call.
3. **No date-input precedent** — `lot` is the first date field exposed to a form; `Input type="date"` support not verified.
4. **Brand/type create: reuse vs duplication** of `YarnCatalogPanel`'s request-token-guarded create forms (extraction touches a shipped, tested file).
5. **Implicit 409 → field mapping** must be stated explicitly in design so a future second unique constraint doesn't silently break it.
6. **Debts closed by this entry**: 193 and 199 — in scope.

### Approaches

1. **Single large `YarnFormDialog.tsx`, 1:1 with `ProjectFormDialog.tsx`** — proven precedent, fastest first pass; likely 500-700+ lines, needs slicing anyway. Effort: Medium.
2. **Thin shell + per-tab components** (`YarnIdentityTab`, `YarnTechnicalTab`) plus small field components — slices along real seams; more prop plumbing. Effort: Medium-High.

### Recommendation

Approach 2 — aligns with the 400-line PR budget (auto-chain) without artificial cuts; the two tabs are genuinely different concerns. The shell keeps `ProjectFormDialog`'s target/key/remount pattern.

### Rough Slice Plan (first-pass estimate for `sdd-tasks`)

1. Client layer: `createYarn`/`updateYarn` + 409 mapping + unit tests. ~150-250 lines.
2. Design-system gap fill (if needed): colour-family picker and/or needle-range field. ~100-200 lines.
3. `YarnFormDialog` shell + Identidad tab (brand/type choose-or-create, colour fields, photo, 409-on-field test, axe). ~400-500 lines.
4. Ficha técnica tab + submit/patch + tests. ~300-400 lines.
5. Consumer wiring: empty-state action (debt 193), `onEdit` + primary «Editar» (debt 199), smoke update. ~100-150 lines.

### Open Questions

1. Extract `YarnCatalogPanel`'s brand/type create pattern into a shared piece, or accept a form-local copy?
2. New required swatch picker for `colorFamily`, or a `required` mode on `ColorFamilyFilter`?
3. `lot`: plain `Input type="date"` or a new `DateInput`?
4. Confirm the 5-slice cut before `sdd-tasks` locks boundaries.

### Ready for Proposal

Yes — none of the open items block the proposal; they can be resolved in `sdd-design`.
