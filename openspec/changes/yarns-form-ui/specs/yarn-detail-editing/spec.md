# Delta for Yarn Detail Editing

## MODIFIED Requirements

### Requirement: Yarn detail drawer

`src/features/yarns/ui/YarnDetailDrawer.tsx` MUST render
`<Dialog open onClose title placement="side" size="lg">` and, given a `SerializedYarnListItem`,
display every field it carries (image, colorName, colorCode, colorFamily, length, fiber,
recommendedNeedle, thickness, lot, quantity, usedQuantity, brandName, typeName) with no network
fetch of its own. It MUST render a keyboard-reachable «Editar» control (a real focusable element,
not a decorated `div`), rendered with the `primary` variant, whose activation opens the yarn
create/edit modal in edit mode for the drawer's yarn (spec `yarn-create-edit`). It MUST satisfy
the SDD-01 §9 bar.
(Previously: «Editar» rendered as `variant="secondary"` and its activation caused no navigation
and no state change, documented as a no-op pending backlog entry 25.)

#### Scenario: Drawer shows every field

- GIVEN a yarn with all eleven detail fields populated
- WHEN its drawer opens
- THEN each field's value is present in the rendered output

#### Scenario: Closing the drawer

- GIVEN an open drawer
- WHEN the user dismisses it (close control or `Escape`)
- THEN `onClose` is called and no yarn data mutates

#### Scenario: «Editar» opens the edit modal for this yarn

- GIVEN an open drawer for a given yarn
- WHEN the user activates «Editar» via keyboard (`Tab` then `Enter`/`Space`) or via click
- THEN the yarn create/edit modal opens in edit mode, pre-filled with that yarn's values, and the
  drawer itself remains open and unaffected by the activation
