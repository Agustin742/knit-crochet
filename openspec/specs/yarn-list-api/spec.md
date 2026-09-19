# Yarn List API Specification

## Purpose

Defines the contract of `GET /api/yarns`, including the additive `brandName`/`typeName`
enrichment needed to label yarn cards, and states which existing yarn endpoints and types
MUST remain unaffected.

## Requirements

### Requirement: Enriched yarn list response

`GET /api/yarns` MUST return a JSON body `{ "yarns": YarnListItem[] }` with HTTP status `200`
on success, where `YarnListItem` is `YarnRecord` (unchanged: `id, userId, image, brandId,
typeId, colorName, colorCode, colorFamily, quantity, usedQuantity, length, fiber,
recommendedNeedle, thickness, lot, createdAt, updatedAt`) additively extended with
`brandName: string` and `typeName: string`. `YarnRecord` itself MUST NOT gain these fields.
The endpoint MUST return `401` with `{ "error": string }` when no valid session exists.

#### Scenario: Authenticated request returns enriched items

- GIVEN an authenticated user with yarns in stash
- WHEN they call `GET /api/yarns`
- THEN the response is `200` and every item includes `brandName` and `typeName` alongside
  every existing `YarnRecord` field

#### Scenario: No session

- GIVEN a request with no valid session cookie
- WHEN it calls `GET /api/yarns`
- THEN the response is `401` and no yarn data is returned

#### Scenario: Empty stash

- GIVEN an authenticated user with no yarns
- WHEN they call `GET /api/yarns`
- THEN the response is `200` with `{ "yarns": [] }`

### Requirement: userId scoping

Every query executed by `listYarns` MUST filter by the `userId` resolved from the session
JWT, not by any client-supplied identifier.

#### Scenario: Cross-user isolation

- GIVEN two users each with their own yarns
- WHEN user A calls `GET /api/yarns`
- THEN only user A's yarns are returned, never user B's

### Requirement: Filter contract preserved

`GET /api/yarns` MUST keep accepting `?brandId=&typeId=&colorFamily=`, all optional, combined
with AND semantics, validated by the existing `yarnFiltersSchema`. Supplying an invalid
`brandId`/`typeId` (non-UUID) or `colorFamily` (outside the 13-value enum) MUST return `400`
with a validation error body.

#### Scenario: Multiple filters combine with AND

- GIVEN a user with yarns across several brands, types, and color families
- WHEN they call `GET /api/yarns?brandId=X&colorFamily=blue`
- THEN only items matching both `brandId = X` AND `colorFamily = blue` are returned

#### Scenario: Invalid filter value

- GIVEN an authenticated user
- WHEN they call `GET /api/yarns?colorFamily=not-a-family`
- THEN the response is `400` and no yarn data is returned

### Requirement: Other yarn endpoints unaffected

`POST /api/yarns`, `GET/PATCH/DELETE /api/yarns/:id`, and `getYarnOptions` (used for
`YarnOption = Pick<YarnRecord, "id" | "colorName" | "colorFamily">`) MUST return byte-identical
response shapes and status codes to their current behavior; none of them MUST gain
`brandName`/`typeName`.

#### Scenario: Create/get/update/delete unaffected

- GIVEN an authenticated user
- WHEN they call `POST`, `GET /:id`, `PATCH /:id`, or `DELETE /:id` on `/api/yarns`
- THEN each response shape and status code matches current behavior exactly, with no
  `brandName`/`typeName` fields present

#### Scenario: YarnOption projection still valid

- GIVEN the projects feature calling `getYarnOptions`
- WHEN it receives the result
- THEN each item still satisfies `Pick<YarnRecord, "id" | "colorName" | "colorFamily">`
  unchanged
