# Yarn Detail Editing Specification

## Purpose

Defines the generic `Stepper` primitive, the yarn detail drawer, and `usedQuantity` editing
through the existing `PATCH /api/yarns/:id` contract (RFC-04 §1, §2, §5, §7; PRD-01 §4.5).
Zero backend change: every Route Handler behavior below is restated from what already ships.

## Requirements

### Requirement: Generic `Stepper` primitive

`src/shared/ui/primitives/stepper/` MUST expose a `Stepper` primitive driven only by props: a
numeric `value`, a `min` (floor), an optional `max` (its absence means no ceiling), an
accessible `label`, and `onChange(next: number)`. It MUST NOT reference "yarn" or
"usedQuantity" in its name, props, or implementation, and MUST NOT import from
`src/shared/config/`. A boundary test MUST read its own source and assert the absence of that
import, mirroring `Swatch.boundary.test.ts`. It MUST satisfy the SDD-01 §9 bar: RTL
behavior/a11y test, render smoke test, `axe` assertion, zero hardcoded style values.

#### Scenario: Increment/decrement call onChange

- GIVEN a `Stepper` at `value=3` with no `max`
- WHEN the user activates the `+` control via keyboard (`Enter`/`Space`) or click
- THEN `onChange(4)` is called

#### Scenario: Floor blocks decrement below min

- GIVEN a `Stepper` at `value=0` with `min=0`
- WHEN the user activates the `-` control
- THEN `onChange` is NOT called and the `-` control exposes a disabled/inactive state

#### Scenario: No ceiling by default

- GIVEN a `Stepper` with no `max` prop, at any `value`
- WHEN the user activates `+` repeatedly
- THEN `onChange` keeps being called with no upper bound enforced

#### Scenario: No app-config coupling

- GIVEN the `Stepper` source file
- WHEN its imports are inspected
- THEN it imports nothing from `src/shared/config/`

### Requirement: Yarn detail drawer

`src/features/yarns/ui/YarnDetailDrawer.tsx` MUST render
`<Dialog open onClose title placement="side" size="lg">` and, given a `SerializedYarnListItem`,
display every field it carries (image, colorName, colorCode, colorFamily, length, fiber,
recommendedNeedle, thickness, lot, quantity, usedQuantity, brandName, typeName) with no network
fetch of its own. It MUST render a keyboard-reachable «Editar» control (a real focusable
element, not a decorated `div`) whose activation causes no navigation and no state change,
documented as a no-op pending backlog entry 25. It MUST satisfy the SDD-01 §9 bar.

#### Scenario: Drawer shows every field

- GIVEN a yarn with all eleven detail fields populated
- WHEN its drawer opens
- THEN each field's value is present in the rendered output

#### Scenario: Closing the drawer

- GIVEN an open drawer
- WHEN the user dismisses it (close control or `Escape`)
- THEN `onClose` is called and no yarn data mutates

#### Scenario: «Editar» is a real no-op control

- GIVEN an open drawer
- WHEN the user focuses «Editar» via `Tab` and activates it via `Enter`/`Space`
- THEN it receives keyboard focus, and no navigation, drawer change, or state mutation occurs

### Requirement: `usedQuantity` editing via `PATCH /api/yarns/:id`

The drawer's stepper MUST call `PATCH /api/yarns/:id` with body `{ usedQuantity: number }`
only. The endpoint's existing contract MUST be honored as-is: success returns
`200 { yarn: YarnRecord }` — the raw row, without `brandName`/`typeName`; a non-integer or
negative value returns `400` with a validation error body; a missing or another user's yarn
returns `404`; `409` is reserved for a duplicate `colorCode`, which this request shape cannot
trigger. On `200`, the client MUST merge only the returned fields into the corresponding
`SerializedYarnListItem` already held in `YarnsView`'s list — never replace the item wholesale
— so `brandName`/`typeName`/`colorName` continue to render unchanged.

#### Scenario: Successful update merges without blanking labels

- GIVEN a loaded yarn card showing `"Marca X · Tipo Y · Rojo"`
- WHEN the stepper triggers a successful `PATCH` changing only `usedQuantity`
- THEN the card still shows `"Marca X · Tipo Y · Rojo"` and the updated `usedQuantity`

#### Scenario: Validation failure

- GIVEN a stepper change producing an invalid body
- WHEN the `PATCH` returns `400`
- THEN the drawer surfaces an error and the previous `usedQuantity` is preserved locally

#### Scenario: Not found

- GIVEN a yarn deleted by another request
- WHEN a `PATCH` for it returns `404`
- THEN the drawer surfaces an error and issues no further mutation
