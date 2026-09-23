# Delta for Yarn Catalog Management

## ADDED Requirements

### Requirement: Catalogue panel refreshes on an external catalogue change

The panel MUST re-read its brand/type list when a consumer signals that the catalogue changed
outside the panel (for example, a brand or type created inline from the yarn create/edit modal,
spec `yarn-create-edit`). The signal MUST be additive and optional: without it, the panel keeps
fetching only on mount and on its own retry. The panel's own creates and deletes MUST NOT trigger
this external refresh, so they cost no extra round trip.

#### Scenario: A brand created from the yarn form appears in the panel

- GIVEN the catalogue panel rendered on `/lanas` in the ready state
- WHEN a brand is created inline from the yarn create/edit modal and the consumer signals the change
- THEN the panel re-reads the catalogue and lists the new brand without a page reload

#### Scenario: No external signal, no extra fetch

- GIVEN the catalogue panel rendered without an external change signal
- WHEN the user creates a brand from the panel itself
- THEN the panel appends it in memory and issues no additional catalogue read
