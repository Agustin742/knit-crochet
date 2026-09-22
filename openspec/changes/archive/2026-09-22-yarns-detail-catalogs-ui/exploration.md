# Exploration — `yarns-detail-catalogs-ui` (backlog entry 24)

Status: **ready for proposal**, once the open question below is answered.
Source of truth: `docs/design/rfc/RFC-04-lanas.md`, `docs/product/backlog-ui.md` entry 24.

## Current state

Entry 23 shipped `/lanas` with a card grid, a brand→type filter tree on the new
`Disclosure` primitive, a colour-family row, a generic `Swatch`, and
`GET /api/yarns` returning `brandName`/`typeName` additively. The card's tap is a
documented no-op (`src/features/yarns/ui/YarnCard.tsx:22-24,37-39`), filed as debt
192. This entry wires that tap to a detail drawer with a `usedQuantity` stepper,
and adds a brand/type catalogue panel to the same page.

## A. Backend readiness — nothing to build

Every endpoint this entry needs already exists. **Entry 24 requires zero backend
work**, unlike entry 23 which needed the join.

- `PATCH /api/yarns/:id` (`src/app/api/yarns/[id]/route.ts:40-60`) accepts
  `updateYarnSchema.partial()` (`src/features/yarns/validation.ts:43-45`), so
  `{ usedQuantity: n }` alone is a valid body. Returns `200 { yarn: YarnRecord }`
  — the raw row, **not** `YarnListItem`. `404` for missing or another user's yarn,
  `400` on validation, `409` only for a duplicate `colorCode`, which a
  `usedQuantity`-only patch cannot trigger.
- `DELETE /api/brands/:id` → `deleteBrand` (`src/features/yarns/api/delete-brand.ts:19-38`).
  `404` missing or another user's; **409 blocking, with no `?force`** when the
  brand still has types or yarns; otherwise `204`. The 409 body is exactly
  `{ error, types, yarns }` — both child counts
  (`src/features/yarns/api/errors.ts:67-79`, wired at `src/app/api/brands/params.ts:58-63`).
- `DELETE /api/brands/:id/types/:typeId` — same shape, **409 blocking** when the
  type still has yarns, body exactly `{ error, yarns }`, one count
  (`errors.ts:86-94`, wired at `params.ts:64-68`).
- `GET/POST /api/brands` and `GET/POST /api/brands/:id/types` exist, so the create
  side needs no backend work either.

**`usedQuantity` has no ceiling.** PRD-01 states it is independent of `quantity`
(`docs/product/PRD-01-estructura-funcional.md:239-240,253`): linking a yarn to a
project does not decrement stock, and consumption is a separate counter. The
stepper's only bound is a floor of 0.

## B. What to compose rather than rebuild

**The drawer.** `ProjectDetailDrawer.tsx:286-293` renders
`<Dialog open onClose title placement="side" size="lg">`. `ProjectsView` lifts a
`detailId: string | null` (`:229`), the card takes an `onOpenDetail` callback
(`:684`), and the drawer gets `project={projects?.find(e => e.id === detailId) ?? null}`
plus `onClose` (`:700-706`).

One difference matters: `ProjectDetailDrawer` fetches its own detail, because the
project card's data is a lighter summary. **The yarn drawer does not need that
fetch.** `SerializedYarnListItem` (`src/features/yarns/ui/types.ts:13-17`) already
carries every field a detail view shows — image, colorCode, colorFamily, length,
fiber, recommendedNeedle, thickness, lot, quantity, usedQuantity, brandName,
typeName. Only the `PATCH` needs a network call, and its response can be merged
into local state without reloading the list.

**The stepper does not exist.** A full listing of `src/shared/ui/primitives/`
confirms there is no increment/decrement control anywhere, in `shared/ui` or in any
feature. It is entirely new.

**`ConfirmDialog` is the wrong vehicle for the 409.** Its API
(`src/shared/ui/primitives/confirm-dialog/ConfirmDialog.tsx:20-37,63-102`) always
renders **two** buttons, defaults to `tone="danger"`, and puts initial focus on
Cancel — it is built for a real confirm-or-cancel decision. The blocking 409 has no
`force` and nothing to confirm: there is exactly one legal next action. The right
vehicle is the primitive `ConfirmDialog` itself wraps, `Dialog`
(`src/shared/ui/primitives/dialog/Dialog.tsx:134-146`), used directly with the
counts in the title and body and a single dismiss button.

## C. Scope — the drawer and the catalogue panel share almost nothing

They share RFC-04, the `/lanas` page, and the `Dialog` primitive. They do not share
data (one is per-yarn, the other is global brand/type lists), state (`detailId`
lives in `YarnsView`; the panel needs its own fetch plus create and delete forms),
or any component.

`YarnBrandTree.tsx:43-99` already fetches `GET /api/brands` and
`GET /api/brands/:id/types` for the filter, but that fetch is private: internal
`useState`, no exposed refetch, radios only, no delete affordances. The catalogue
panel cannot reuse it and has to duplicate the same two-request shape.

**Consistency risk worth naming:** deleting a brand or type from the new panel will
not invalidate `YarnBrandTree`'s independent state, so the filter tree can show a
brand that no longer exists until the next page load. Real, but not a blocker.

## D. Debt 192 and 193

- **192 is settled by this entry.** `YarnCard`'s `noOpTap` needs exactly one thing:
  an `onOpen: () => void` prop replacing the current handler, threaded from a new
  `detailId` state in `YarnsView` into the new drawer, mirroring
  `ProjectsView.tsx:229,684,700-706`.
- **193 is NOT settled here.** It is blocked on entry 25
  (`docs/historial/deuda-tecnica.md:2929-2938`); no `POST /api/yarns` exists
  anywhere under `src/app/api/yarns/`. Do not close it in this change.

## E. Size — this splits

Precedent: `ProjectDetailDrawer.tsx` is 457 lines plus 656 of test, but it carries
four tabs and is far more complex than a tabless yarn detail. `ConfirmDialog.tsx` is
95 lines.

Non-test estimate: stepper primitive ~50-80; `YarnDetailDrawer` (no tabs, no own
fetch) ~150-220; `YarnsView`/`YarnCard` wiring ~20-40; catalogue panel (list, create
forms, delete, 409 dialog) ~180-260. **Combined ~400-600 non-test lines**, at or
over budget before counting the SDD-01 §9 test bar — which entry 23 undercounted for
exactly this reason.

Recommended split: **S1 `yarn-detail-drawer`** (stepper + drawer + wiring, settles
debt 192, ~180-260 non-test) then **S2 `catalog-management`** (brand/type CRUD + the
409 dialog, ~180-260 non-test).

## Resolved from the codebase

1. Every endpoint exists; entry 24 needs no backend work —
   `src/app/api/yarns/[id]/route.ts:40-60`, `src/app/api/brands/[id]/route.ts`,
   `src/app/api/brands/[id]/types/[typeId]/route.ts`.
2. The brand 409 body is `{ error, types, yarns }`; the type 409 body is
   `{ error, yarns }` — `errors.ts:67-94`, `params.ts:58-68`.
3. `usedQuantity` is independent of `quantity`, so the stepper needs no ceiling —
   `PRD-01:239-240,253`.
4. The yarn list already carries every field the drawer shows, so it needs no
   separate fetch — `src/features/yarns/ui/types.ts:13-17`.
5. No stepper primitive exists anywhere in the repository.
6. `ConfirmDialog` always renders two buttons and defaults to danger; it is not
   built for a single-action acknowledgement — `ConfirmDialog.tsx:20-37,63-102`.
7. `YarnBrandTree`'s fetch is private and not reusable by the catalogue panel —
   `YarnBrandTree.tsx:43-99`.
8. Debt 193 is blocked on entry 25 — `docs/historial/deuda-tecnica.md:2929-2938`.
9. The drawer-open pattern is `detailId` state + callback + `find(id) ?? null` —
   `ProjectsView.tsx:229,684,700-706`.

## Decisions taken by the orchestrator, with their evidence

These three were resolved without going to the user, because the codebase answers
them:

1. **Split into two slices.** No shared code, and the combined size clears the
   budget before tests. The session's `delivery_strategy` is `auto-chain`, which
   authorises splitting without asking.
2. **The 409 notice is built on `Dialog` directly**, not `ConfirmDialog`. A
   blocking 409 has nothing to confirm, and `ConfirmDialog` would render a second
   button with no meaning.
3. **The stepper goes in `src/shared/ui/primitives/stepper/`.** A numeric +/-
   control carries no application domain, so it sits on the portable side of the
   line debt 168 drew — the same reasoning that put `Swatch` and `Disclosure` there.

## Open question for the user

**Where the catalogue panel lives on `/lanas`.** RFC-04 §2 fixes that it is on the
same page but not where: a third region below the grid, a collapsible section
beside the filters, or something else. This is a layout and product decision, not
one the code can settle.

## Next

`sdd-propose` for slice S1, once the placement question is answered — though S1
(the drawer) does not depend on that answer, so it can start immediately.
