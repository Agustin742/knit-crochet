# Yarn Inventory Browsing Specification

## Purpose

Defines the `/lanas` page: a generic `Swatch` primitive and its app-side color-family token
map, the card grid with its three states, and the keyboard-operable brand→type filter tree
with color-family swatches. Every requirement touching a UI component restates the SDD-01 §9
verification bar: RTL behavior/accessibility test (`happy-dom` + `user-event`), a render smoke
test, `axe` assertions on primitives, and zero hardcoded style values (token-first).

## Requirements

### Requirement: Generic `Swatch` primitive

`src/shared/ui/` MUST expose a `Swatch` primitive driven only by props: a color value (a CSS
color or `var(--...)` custom-property reference), an accessible label, and a size variant
covering at least the filter-row size and the card size. `Swatch` MUST NOT import `ColorFamily`
or any module from `src/shared/config/`, and MUST NOT reference "yarn" in its name, props, or
implementation. It MUST satisfy the SDD-01 §9 bar: RTL behavior/a11y test, render smoke test,
`axe` assertion, and zero hardcoded style values.

#### Scenario: Renders with an accessible name

- GIVEN a `Swatch` rendered with `color="var(--yarn-red)"` and `label="Rojo"`
- WHEN queried by accessible role/name in a test
- THEN it exposes "Rojo" as its accessible name

#### Scenario: Size variants render distinctly

- GIVEN `Swatch` rendered once per supported size variant
- WHEN each instance is inspected
- THEN each renders its variant's token-driven size with no hardcoded pixel values

#### Scenario: No app-config coupling

- GIVEN the `Swatch` source file
- WHEN its imports are inspected
- THEN it imports nothing from `src/shared/config/` and no `ColorFamily` type

### Requirement: `ColorFamily` to token map

`src/shared/config/` MUST export a mapping from every `ColorFamily` value to its
`var(--yarn-*)` CSS custom property, typed as an exhaustive `Record<ColorFamily, string>` (or
equivalent exhaustive `switch`) so that a `ColorFamily` value missing a mapping entry MUST fail
`pnpm typecheck`.

#### Scenario: Every family maps to a token

- GIVEN the 13 `ColorFamily` values (`red, orange, yellow, green, blue, violet, pink, brown,
  gray, black, white, neutral, multicolor`)
- WHEN each is looked up in the map
- THEN each resolves to its corresponding `--yarn-*` custom property, with none missing

#### Scenario: Incomplete map fails typecheck

- GIVEN a hypothetical map missing one `ColorFamily` entry
- WHEN `pnpm typecheck` runs
- THEN it fails, because the map type is exhaustive over `ColorFamily`

### Requirement: Yarn card grid and page states

`/lanas` MUST render a thin server page composing a client view that fetches the enriched
yarn list and shows each yarn as a card containing: a `Swatch` (card size) tinted via the
`ColorFamily` token map, the text `"{brandName} · {typeName} · {colorName}"`, and `quantity`
(stock). The view MUST show exactly one of three states derived from fetch status: empty
(`"Sin lanas en el stash todavía"`), error (`"Se enredó la madeja"` with a retry action), or a
loading skeleton. The card MUST expose a tap/activation handler that opens the yarn detail
drawer for that card's yarn (backlog entry 24, settling debt 192). Each new/changed component
MUST satisfy the SDD-01 §9 bar.

(Previously: the card's tap handler was a documented no-op — no navigation, drawer, or state
change.)

#### Scenario: Cards render composed fields

- GIVEN an authenticated user with yarns in stash
- WHEN `/lanas` finishes loading
- THEN each card shows its swatch, `"marca · tipo · colorName"`, and stock quantity

#### Scenario: Empty state

- GIVEN an authenticated user with no yarns
- WHEN `/lanas` finishes loading
- THEN the page shows `"Sin lanas en el stash todavía"` and no cards

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

### Requirement: Brand→type filter tree and color-family swatch row

`/lanas` MUST offer a keyboard-navigable brand→type disclosure tree (selecting a brand
reveals its types; selecting a brand and/or type sets `brandId`/`typeId` query state) and a
row of `Swatch` instances per `ColorFamily` (selecting one sets `colorFamily` query state).
Selections across the tree and the swatch row MUST combine with AND semantics against the
yarn list, and every filter control MUST be operable via keyboard (`Tab` to focus,
`Enter`/`Space` to toggle/select), per RFC-04 §5. The tree MUST re-fetch its brand/type data,
without a page reload, whenever the catalogue panel (backlog entry 24) signals a successful
brand/type create or delete. If the active `brandId` or `typeId` filter references an id that
no longer exists after such a change, the view MUST clear that filter rather than keep a
dangling scope. Each new/changed component MUST satisfy the SDD-01 §9 bar.

(Previously: the tree fetched brands/types once via a `[]`-dependency effect with no refetch
trigger and no dangling-filter handling.)

#### Scenario: Selecting a brand filters the list

- GIVEN a stash with yarns across multiple brands
- WHEN the user selects a brand in the tree
- THEN the list narrows to yarns with that `brandId`

#### Scenario: Selecting a type narrows further

- GIVEN a brand already selected
- WHEN the user selects one of its types
- THEN the list narrows to yarns matching both that `brandId` and `typeId`

#### Scenario: Selecting a color family filters the list

- GIVEN a stash with yarns across multiple color families
- WHEN the user selects a swatch in the color-family row
- THEN the list narrows to yarns with that `colorFamily`

#### Scenario: Combined filters compose with AND

- GIVEN a brand, a type, and a color family all selected
- WHEN the list re-renders
- THEN only yarns matching all three selections are shown

#### Scenario: Keyboard operability

- GIVEN the filter tree and swatch row rendered
- WHEN a user navigates using only `Tab`, `Enter`, and `Space`
- THEN every brand, type, and swatch control can be focused and activated without a mouse

#### Scenario: Tree refetches after a catalogue change

- GIVEN the catalogue panel deletes a brand successfully
- WHEN the deletion resolves
- THEN the filter tree re-fetches and no longer lists that brand, without a full page reload

#### Scenario: Deleting the actively-filtered brand clears the filter

- GIVEN the filter tree's active `brandId` filter points at brand X
- WHEN brand X is deleted successfully from the catalogue panel
- THEN the `brandId` filter is cleared and the yarn list no longer scopes to it
