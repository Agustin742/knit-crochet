# Yarn Create/Edit Specification

## Purpose

Defines the yarn create/edit modal (`YarnFormDialog`, RFC-04 §1, §2, §5, §7-ter E2(b); PRD-01
§4.4) that lets a user create a new yarn or correct an existing one, through two tabs —
Identidad and Ficha técnica — covering a required colour-family selection, a needle range, a
`lot` date, brand/type choose-or-create, and a photo upload. Zero backend change:
`POST /api/yarns`, `PATCH /api/yarns/:id`, `POST /api/brands`, `POST /api/brands/:id/types`, and
`POST /api/uploads/image` are consumed exactly as they already ship, with no new endpoint,
schema, or validation change.

## Requirements

### Requirement: Modal shell opens for create or edit, and remounts fresh per target

`YarnFormDialog` MUST render nothing when its target is `null`. Given a create target, it MUST
render an empty form. Given an edit target for a specific yarn, it MUST render a form pre-filled
with that yarn's current field values. Switching the target (from `null` to create, from create
to edit, or between two different yarns in edit mode) MUST discard any in-progress values from
the previous target — each opening starts from a clean state derived only from the new target.

#### Scenario: No target renders nothing

- GIVEN the modal's target is `null`
- WHEN the page renders
- THEN no dialog is present in the document

#### Scenario: Create target renders an empty form

- GIVEN the modal's target is a create target
- WHEN the modal opens
- THEN every field starts empty or at its default, with no values left over from a previous
  session

#### Scenario: Edit target renders a pre-filled form

- GIVEN the modal's target is an edit target for an existing yarn
- WHEN the modal opens
- THEN every field is pre-filled with that yarn's current values

#### Scenario: Opening a second yarn in edit mode discards the first

- GIVEN the modal is open in edit mode for yarn A with unsaved changes
- WHEN the modal is closed and reopened in edit mode for yarn B
- THEN the form shows yarn B's values, with none of yarn A's unsaved changes present

### Requirement: Form values survive switching between tabs

The modal MUST present its fields across two tabs, Identidad and Ficha técnica. A value entered
in one tab MUST remain present after switching to the other tab and back, even though only the
active tab's fields are visibly rendered at a given moment.

#### Scenario: A value survives a round trip through the other tab

- GIVEN the user has entered a value in a field on the Identidad tab
- WHEN the user switches to the Ficha técnica tab and back to Identidad
- THEN the previously entered value is still present in that field

#### Scenario: Values across both tabs are all submitted together

- GIVEN the user has filled fields on both tabs
- WHEN the user submits the form
- THEN the submitted data includes the values entered on both tabs

### Requirement: Brand and type can be chosen or created without leaving the form

The Identidad tab MUST let the user choose an existing brand or create a new one without opening
a separate modal stacked on top of the form (no dialog-in-dialog). Once a brand is chosen, the
user MUST be able to choose an existing type under that brand or create a new one, also without a
nested dialog. Choosing or creating a different brand MUST reset the selected type, since a type
is only meaningful under its brand. A successful inline brand or type creation MUST make the new
brand or type immediately selectable in the form and MUST also refresh the brand/type data used
elsewhere on the page (the filter tree and the catalogue panel), without a page reload.

#### Scenario: Choosing an existing brand and type

- GIVEN the form open on the Identidad tab
- WHEN the user selects an existing brand and then an existing type under it
- THEN both selections are recorded on the form and no additional dialog was opened

#### Scenario: Creating a new brand inline

- GIVEN the form open on the Identidad tab
- WHEN the user creates a new brand through the form's own controls and the creation succeeds
- THEN the new brand becomes the selected brand, is available for selection without reopening the
  form, and no modal is stacked on top of the form's own modal

#### Scenario: Creating a new type inline under the selected brand

- GIVEN a brand is already selected
- WHEN the user creates a new type under it through the form's own controls and the creation
  succeeds
- THEN the new type becomes the selected type and is available for selection without a nested
  dialog

#### Scenario: Changing the brand resets the type

- GIVEN a brand and one of its types are both selected
- WHEN the user selects a different brand
- THEN the previously selected type is cleared

#### Scenario: An inline creation refreshes dependent views

- GIVEN the form open with the filter tree and catalogue panel rendered elsewhere on the page
- WHEN the user creates a new brand or type inline and the creation succeeds
- THEN the filter tree and catalogue panel reflect the new brand or type without a page reload

#### Scenario: A late response from an inline creation does not override a newer selection

- GIVEN the user starts creating a brand, then before that request resolves changes their mind
  and selects or creates a different brand
- WHEN the first, now-stale creation request resolves
- THEN it does not override the brand the user is now looking at

### Requirement: Colour family is a required selection that cannot be cleared once chosen

The Identidad tab MUST offer a colour-family selection covering every `ColorFamily` value. Once a
value is chosen, re-activating the currently selected value MUST NOT clear the selection — a
colour family, once chosen, can only be replaced by choosing a different one, never cleared back
to empty. Submitting the form with no colour family chosen MUST be rejected with a visible error
on that control, and the control MUST expose that invalid state to assistive technology (an
accessible invalid state tied to the error message).

#### Scenario: Choosing a colour family

- GIVEN the form open with no colour family chosen yet
- WHEN the user chooses one of the available colour families
- THEN that value is recorded and visibly indicated as selected

#### Scenario: Re-activating the selected value is a no-op

- GIVEN a colour family is already selected
- WHEN the user activates that same, already-selected value again
- THEN the selection is unchanged — it is not cleared

#### Scenario: Choosing a different value replaces the selection

- GIVEN a colour family is already selected
- WHEN the user chooses a different colour family
- THEN the newly chosen value replaces the previous selection

#### Scenario: Submitting with no colour family chosen is rejected

- GIVEN no colour family has been chosen
- WHEN the user submits the form
- THEN submission is rejected, an error is shown on the colour-family control, and the control
  exposes an accessible invalid state

### Requirement: Needle range requires a minimum and a maximum, with the maximum at least equal to the minimum

The Ficha técnica tab MUST offer entry of a recommended needle range as a minimum and a maximum
value. Submitting a maximum smaller than the minimum MUST be rejected, and the resulting error
MUST be shown on the maximum field, not on the minimum field and not as a page-level error.

#### Scenario: A valid range is accepted

- GIVEN a minimum and a maximum where the maximum is greater than or equal to the minimum
- WHEN the user submits the form
- THEN the range is accepted with no error on either field

#### Scenario: A maximum below the minimum is rejected on the maximum field

- GIVEN a minimum value entered
- WHEN the user enters a maximum smaller than that minimum and submits
- THEN submission is rejected and the error is shown on the maximum field

#### Scenario: An equal minimum and maximum is accepted

- GIVEN a minimum and maximum set to the same value
- WHEN the user submits the form
- THEN the range is accepted, since the maximum needs only to be greater than or equal to the
  minimum

### Requirement: `lot` is entered as a date and round-trips unchanged through edit

The Ficha técnica tab MUST offer entry of `lot` as a date. A date entered on create, once saved
and later reopened for edit, MUST display as the same calendar date the user originally entered —
regardless of the browser's or server's time zone offset from UTC. No day-shift MUST occur in
either direction.

#### Scenario: A date entered on create is saved and later reopened unchanged

- GIVEN the user enters a specific calendar date for `lot` while creating a yarn
- WHEN the yarn is saved and its edit form is later reopened
- THEN the `lot` control shows the same calendar date the user originally entered

#### Scenario: No day shift under a non-UTC local time zone

- GIVEN the browser's local time zone is offset from UTC (either ahead or behind)
- WHEN a `lot` date is entered, saved, and the edit form is reopened
- THEN the displayed date is the same calendar date, not shifted by one day in either direction

### Requirement: A photo uploads as soon as it is chosen, not deferred to submit

The Identidad tab MUST offer a photo upload control. Choosing a file MUST start its upload
immediately, before the user submits the rest of the form. While an upload is in progress, form
submission MUST be disabled. A failed upload MUST surface an error without blocking the rest of
the form from being filled or corrected.

#### Scenario: Choosing a file starts the upload immediately

- GIVEN the form open with no photo chosen yet
- WHEN the user chooses an image file
- THEN the upload starts immediately, before any submit action

#### Scenario: Submit is disabled while an upload is in progress

- GIVEN a photo upload is in progress
- WHEN the user attempts to submit the form
- THEN submission is disabled or blocked until the upload finishes

#### Scenario: A failed upload surfaces an error without blocking the form

- GIVEN the user chose a photo and its upload fails
- WHEN the failure is returned
- THEN an error is shown for the photo control, and the rest of the form remains fillable

### Requirement: Submitting with an invalid field on the inactive tab switches to that tab and focuses the field

If the currently visible tab is valid but a required or invalid field exists on the other,
not-currently-visible tab, submitting the form MUST first switch to the tab containing that
invalid field, then move keyboard focus to it, so the user is never left looking at a valid tab
while submission silently fails.

#### Scenario: Submitting from Identidad with an empty required field on Ficha técnica

- GIVEN the Identidad tab is active and fully valid, and a required field on the Ficha técnica tab
  is empty
- WHEN the user submits the form
- THEN the Ficha técnica tab becomes active and the invalid field receives keyboard focus

#### Scenario: Submitting from Ficha técnica with an invalid field on Identidad

- GIVEN the Ficha técnica tab is active and fully valid, and a required field on the Identidad tab
  is invalid
- WHEN the user submits the form
- THEN the Identidad tab becomes active and the invalid field receives keyboard focus

#### Scenario: No tab switch is needed when the invalid field is already visible

- GIVEN the active tab itself contains the only invalid field
- WHEN the user submits the form
- THEN the invalid field on the already-active tab receives keyboard focus, with no tab switch

### Requirement: A duplicate colour code is reported on the colour-code field, not as a page-level error

Submitting a `colorCode` that already exists for the selected brand MUST be reported as an error
on the `colorCode` field specifically — with that field exposing an accessible invalid state —
never as a generic page-level or toast-only error. If the field carrying the error sits on the
inactive tab, the tab-switch-and-focus behavior above MUST apply to it as well.

#### Scenario: A duplicate colour code under the same brand shows on the field

- GIVEN a `colorCode` that already exists for the currently selected brand
- WHEN the user submits the form with that `colorCode`
- THEN an error is shown on the `colorCode` field, with an accessible invalid state, and no
  page-level error is shown instead

#### Scenario: The same colour code under a different brand is accepted

- GIVEN a `colorCode` that already exists under brand A, and brand B is currently selected
- WHEN the user submits the form with that `colorCode` under brand B
- THEN the submission succeeds — the uniqueness constraint is scoped to the selected brand

#### Scenario: The duplicate-colour-code error switches to its tab

- GIVEN the Ficha técnica tab is active when a duplicate `colorCode` error is returned
- WHEN that error lands
- THEN the Identidad tab becomes active and the `colorCode` field receives focus

### Requirement: Editing submits only the changed fields, and an unchanged form closes without a request

In edit mode, submitting the form MUST send only the fields whose values differ from the yarn's
original values. If the user opens the edit form and submits without changing anything, the
modal MUST close without issuing any network request.

#### Scenario: Editing one field sends only that field

- GIVEN the edit form open with its original values, and the user changes exactly one field
- WHEN the user submits
- THEN the request sent contains only the changed field, not the entire form

#### Scenario: Submitting an unchanged edit form issues no request

- GIVEN the edit form open with its original values, unmodified
- WHEN the user submits
- THEN the modal closes and no network request is issued

### Requirement: `usedQuantity` never appears in the create/edit form

Neither the Identidad tab nor the Ficha técnica tab MUST offer any control for `usedQuantity`. It
is edited exclusively through the yarn detail drawer's stepper (spec `yarn-detail-editing`).

#### Scenario: `usedQuantity` is absent from both tabs

- GIVEN the form open in either create or edit mode
- WHEN both tabs are inspected
- THEN no control for `usedQuantity` is present on either tab

### Requirement: A successful save reloads the list rather than merging locally

After a create or an edit succeeds, the yarn list MUST be reloaded from the server rather than
patched in place. This MUST hold even when an edit changes the yarn's brand or type, so a card's
displayed brand/type name is never left stale, and so a yarn that no longer matches the active
filters is dropped from (or added to) the visible list as appropriate. If the yarn detail drawer
is open for the yarn being edited, it MUST show the updated values once the reload completes.

#### Scenario: A successful create adds the new yarn to the list

- GIVEN an empty or non-empty list
- WHEN a create submission succeeds
- THEN the list reload includes the newly created yarn, subject to the active filters

#### Scenario: An edit that changes the brand updates the displayed name

- GIVEN a yarn card showing its current brand and type names
- WHEN an edit changes that yarn's brand and the submission succeeds
- THEN the reloaded list shows the yarn's new brand name, not the previous one

#### Scenario: An edit that no longer matches the active filters is dropped from view

- GIVEN a yarn currently visible under an active brand or colour-family filter
- WHEN an edit changes a field the active filter depends on, so the yarn no longer matches
- THEN after the reload, that yarn is no longer shown in the filtered list

#### Scenario: An open drawer for the edited yarn reflects the update after reload

- GIVEN the yarn detail drawer is open for a yarn that is also being edited
- WHEN the edit submission succeeds and the list reload completes
- THEN the open drawer displays the updated field values for that yarn
