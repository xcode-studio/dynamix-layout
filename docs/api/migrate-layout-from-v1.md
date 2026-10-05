# `migrateLayoutFromV1` and `isLayoutV1`

Converts a layout saved by v1 (`DynamixLayoutCore._root.toJSON()`, or the `updateJSON` payload) to [`LayoutJSON`](./layout-json.md).

You rarely need to call it: `createLayout`, `layout.load()`, and the React and Solid components accept v1 trees and migrate them, with a `MIGRATED_FROM_V1` warning. Call it to convert stored data once, for example in a database migration.

```ts
import { isLayoutV1, migrateLayoutFromV1 } from '@dynamix-layout/core'

function isLayoutV1(input: unknown): input is LayoutTreeV1
function migrateLayoutFromV1(tree: LayoutTreeV1, options?: { onWarning?: (warning: LayoutWarning) => void }): LayoutJSON
```

| Parameter | Type | Description |
|---|---|---|
| `tree` | `LayoutTreeV1` | The v1 layout. |
| `options.onWarning` | `(warning) => void` | Receives each repair. Default: ignore. |

Returns the equivalent v2 layout. Throws `DynamixLayoutError('INVALID_LAYOUT')` when `tree` isn't a v1 layout.

## Example

```ts
const stored = JSON.parse(localStorage.getItem('layout') ?? 'null')
if (isLayoutV1(stored)) {
	localStorage.setItem('layout', JSON.stringify(migrateLayoutFromV1(stored)))
}
```

## Mapping

| v1 | v2 |
|---|---|
| `typNode` | `type` |
| row and tabset `uidNode` | `id` (kept, so `nodMaxd` still resolves) |
| tab `nodName` | tab `id`. A tab's identity in v1 was its label; tab `uidNode`s were regenerated every session and are dropped. |
| `nodPart` | `weight` (same meaning) |
| depth | `direction`: the root and even depths are `horizontal`, odd depths `vertical` |
| tabset `nodOpen` | `activeTabId` |
| tabset `nodFold: true` | `isFolded: true` |
| root `nodMaxd` | `maximizedTabsetId` |

**Migrated layouts render pixel-identically.** This was checked against 112 layouts recorded from the v1 engine. The exceptions are layouts saved in states caused by v1 bugs; for those, v2 shows the intended result:
- a row stuck at its minimum size next to a folded tabset;
- stale sizes when every open panel had weight 0.

## Edge cases

| v1 input | Result |
|---|---|
| A root with one nested row (left by some v1 moves) | The row is flattened into the root, which becomes vertical. The rendering is identical. |
| `nodOpen` naming a missing tab | The first tab is active (`INVALID_ACTIVE_TAB` warning). |
| Duplicate tab names | The first one wins, later ones are dropped (`DUPLICATE_TAB_ID`). |
| `nodPart` that is negative or `NaN` | `100` (`INVALID_WEIGHT`). `0` and fractions are kept. |
| Empty tabsets or rows | Removed. |
| A tab directly inside a row | Wrapped in a tabset `ts-<tab id>`. |
| A root that is a tabset | Wrapped in a root row. |
| `nodMaxd` naming a missing tabset | Dropped. |
| `bond` entries, unknown fields | Ignored. |
