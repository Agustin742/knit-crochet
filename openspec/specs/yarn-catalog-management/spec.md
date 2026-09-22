# Yarn Catalog Management Specification

## Purpose

Defines the brand/type catalogue panel on `/lanas` (RFC-04 §1, §2, §5, §7 amendment E2):
create and delete for brands and types, the blocking-409 acknowledgement, and the change
signal that keeps the filter tree fresh. Zero backend change: every Route Handler behavior
below is restated from what already ships.

## Requirements

### Requirement: Catalogue panel — list and create

`src/features/yarns/ui/YarnCatalogPanel.tsx` MUST render as a collapsible section (built on
the existing `Disclosure` primitive) inside `YarnFilterPanel`'s `Card`, positioned below the
filter tree and the color-family row. It MUST list existing brands and, per brand, its types
via `GET /api/brands` (`200 { brands: BrandRecord[] }`) and `GET /api/brands/:id/types`
(`200 { types: YarnTypeRecord[] }`, `404` for an unknown/foreign brand), and offer a create
form for a brand and, per brand, a create form for a type. Create calls `POST /api/brands` or
`POST /api/brands/:id/types` with body `{ name: string }` (non-empty, trimmed, max 200
chars); success returns `201 { brand: BrandRecord }` or `201 { type: YarnTypeRecord }`; an
invalid body returns `400` with a validation error body; creating a type under an
unknown/foreign brand returns `404`. The panel MUST show distinct loading, error (with
retry), and empty states, and satisfy the SDD-01 §9 bar in full.

#### Scenario: Creating a brand succeeds

- GIVEN the panel open with an empty name field
- WHEN the user submits a valid brand name and `POST /api/brands` returns `201`
- THEN the new brand appears in the panel's list

#### Scenario: Creating a type under a deleted brand

- GIVEN a brand that no longer exists server-side
- WHEN the user submits a type for it and the request returns `404`
- THEN the panel shows an error and creates nothing

#### Scenario: Empty catalogue

- GIVEN a user with no brands yet
- WHEN the panel loads
- THEN it shows an empty state distinct from the loading and error states

### Requirement: Blocking 409 acknowledgement

Deleting a brand or type MUST call `DELETE /api/brands/:id` or
`DELETE /api/brands/:id/types/:typeId`. Success returns `204` and removes the row from the
panel. A missing/foreign brand or type returns `404`. A brand or type still holding children
returns `409` — brand body exactly `{ error, types, yarns }` (both child counts), type body
exactly `{ error, yarns }` (one count) — with no `?force` parameter and nothing to confirm. On
`409`, the panel MUST show a single-action acknowledgement built on the `Dialog` primitive
directly (not `ConfirmDialog`), stating the exact counts from the response body, with exactly
one dismiss control and no destructive action offered.

#### Scenario: Blocked brand deletion shows both counts

- GIVEN a brand with 2 types and 5 yarns
- WHEN the user attempts to delete it and the API returns `409 { error, types: 2, yarns: 5 }`
- THEN the notice displays both counts and offers exactly one dismiss control; the brand
  remains listed

#### Scenario: Blocked type deletion shows the yarn count

- GIVEN a type with 3 yarns
- WHEN the user attempts to delete it and the API returns `409 { error, yarns: 3 }`
- THEN the notice displays that count and offers exactly one dismiss control; the type
  remains listed

#### Scenario: Successful deletion removes the row

- GIVEN a brand with no types and no yarns
- WHEN the user deletes it and the API returns `204`
- THEN the brand no longer appears in the panel's list

### Requirement: Catalogue change signal

After every successful brand/type create or delete, the panel MUST invoke an
`onCatalogChange` callback so a consumer can refresh dependent views. It MUST NOT invoke this
callback after a failed (`400`/`404`/`409`) create or delete.

#### Scenario: Successful create signals

- GIVEN the panel with `onCatalogChange` wired
- WHEN a create resolves `201`
- THEN `onCatalogChange` is called exactly once

#### Scenario: Successful delete signals

- GIVEN the panel with `onCatalogChange` wired
- WHEN a delete resolves `204`
- THEN `onCatalogChange` is called exactly once

#### Scenario: Blocked delete does not signal

- GIVEN the panel with `onCatalogChange` wired
- WHEN a delete resolves `409`
- THEN `onCatalogChange` is NOT called
