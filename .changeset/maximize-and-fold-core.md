---
'@dynamix-layout/core': minor
---

Maximize and fold tabsets (engine):

- `maximize(id)`, `restore()`, `toggleMaximize(id)` and `maximizedId`: one tabset fills the whole layout; the others are hidden but stay mounted, and restoring brings back the exact previous split.
- `collapse(id)`, `expand(id)`, `toggleCollapse(id)`: a tabset folds to a strip along its row (its tab bar). Siblings share the freed space, unfolding restores the previous size, and folding the last open child of a row unfolds its most recently folded sibling.
- New `collapsedSize` option (defaults to `minH`); pass the tab bar height.
- Computed options expose `nodFold`, `nodMaxd`, `nodHidden`, `nodLocked`, `nodFoldable` and `nodMaximizable`; saved layouts keep `nodFold` (tabsets) and `nodMaxd` (root).
- Bonds next to a folded tabset are locked; any drag-and-drop move ends maximize; a dragged or drop-target tabset unfolds.
- Fix: a layout created from a single tab now fills the whole area (an empty row used to take half of it).
