# Delta for Yarn Inventory Browsing

## MODIFIED Requirements

### Requirement: Yarn card grid and page states

`/lanas` MUST render a thin server page composing a client view that fetches the enriched
yarn list and shows each yarn as a card containing: a `Swatch` (card size) tinted via the
`ColorFamily` token map, the text `"{brandName} · {typeName} · {colorName}"`, and `quantity`
(stock). When the fetch returns no yarns, the view MUST distinguish two empty states by whether
any filter (brand, type or colour family) is active: with **no** filter active it is the stash
empty state (`"Sin lanas en el stash todavía"`, with an «Agregar lana» action that opens the yarn
create/edit modal in create mode, spec `yarn-create-edit`); with **at least one** filter active it
is the no-matches state, which MUST say that no yarn matches the filters (never that the stash is
empty) and MUST offer a «Quitar filtros» action that clears every active filter and re-reads the
list — mirroring the projects page's no-matches state. The other states are error
(`"Se enredó la madeja"` with a retry action) and a loading skeleton. Whenever the view is not in
the stash empty state, the page header MUST offer the «Agregar lana» action. The action MUST
appear in exactly one place at a time — the stash empty state's own action slot, or the page
header in every other state — never in both places at once and never absent altogether. The card MUST expose a tap/activation handler that
opens the yarn detail drawer for that card's yarn (backlog entry 24, settling debt 192). Each
new/changed component MUST satisfy the SDD-01 §9 bar.

(Previously: the empty state offered no action and the page offered no create entry point at any
list size; a filter combination with no results showed the same «Sin lanas en el stash todavía»
message as a genuinely empty stash; the card's tap handler was a documented no-op — no
navigation, drawer, or state change.)

#### Scenario: Cards render composed fields

- GIVEN an authenticated user with yarns in stash
- WHEN `/lanas` finishes loading
- THEN each card shows its swatch, `"marca · tipo · colorName"`, and stock quantity

#### Scenario: Empty state offers a create action

- GIVEN an authenticated user with no yarns and no filter active
- WHEN `/lanas` finishes loading
- THEN the page shows `"Sin lanas en el stash todavía"`, no cards, and an «Agregar lana» action
  that opens the yarn create/edit modal in create mode

#### Scenario: Header offers the create action when the list is non-empty

- GIVEN an authenticated user with at least one yarn
- WHEN `/lanas` finishes loading
- THEN the page header shows an «Agregar lana» action, and the empty state (and its own action)
  is not rendered

#### Scenario: Filters with no results do not claim the stash is empty

- GIVEN an authenticated user with yarns, and a brand, type or colour-family filter active
- WHEN `/lanas` finishes loading with no yarn matching those filters
- THEN the page says no yarn matches the filters, does NOT show `"Sin lanas en el stash todavía"`,
  offers «Quitar filtros», and the «Agregar lana» action stays in the page header

#### Scenario: «Quitar filtros» restores the full list

- GIVEN the no-matches state with filters active
- WHEN the user activates «Quitar filtros»
- THEN every filter is cleared, the filter controls show no selection, and the list is re-read
  without filters

#### Scenario: The create action never appears in both places at once

- GIVEN `/lanas` in the stash empty, no-matches, or non-empty state
- WHEN the page is inspected
- THEN exactly one «Agregar lana» action is present — never zero and never two

#### Scenario: Error state with retry

- GIVEN `GET /api/yarns` fails
- WHEN `/lanas` finishes loading
- THEN the page shows `"Se enredó la madeja"` with a retry action that re-issues the fetch

#### Scenario: Loading state

- GIVEN a fetch in flight
- WHEN `/lanas` is rendered before the response resolves
- THEN a skeleton is shown instead of cards or state messages

#### Scenario: Card tap opens the detail drawer

- GIVEN a rendered card for a given yarn
- WHEN the user taps/activates it
- THEN the yarn detail drawer opens showing that yarn's fields, with no page navigation
