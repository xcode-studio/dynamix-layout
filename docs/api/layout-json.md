# `LayoutJSON`

The saved-layout format: what `onLayoutChange` and `toJSON()` give you, and what `defaultLayout`, `layout`, `initialLayout` and `load()` accept.

```ts
const LAYOUT_VERSION = 2

interface LayoutJSON {
	version: 2
	root: RowJSON
	/** Id of the maximized tabset, if any. */
	maximizedTabsetId?: string
}

interface RowJSON {
	type: 'row'
	id: string
	/** Share of the parent's space above the minimum sizes (like CSS flex-grow). Ignored on the root. */
	weight: number
	direction: 'horizontal' | 'vertical'
	children: (RowJSON | TabsetJSON)[]
}

interface TabsetJSON {
	type: 'tabset'
	id: string
	weight: number
	activeTabId?: string
	/** Written only when true. */
	isFolded?: boolean
	children: TabJSON[]
}

interface TabJSON {
	type: 'tab'
	/** The id you gave the tab. */
	id: string
}
```

## Example

```json
{
	"version": 2,
	"root": {
		"type": "row", "id": "root", "weight": 100, "direction": "horizontal",
		"children": [
			{ "type": "tabset", "id": "ts-editor", "weight": 140, "activeTabId": "editor",
			  "children": [{ "type": "tab", "id": "editor" }] },
			{ "type": "row", "id": "row-1", "weight": 60, "direction": "vertical",
			  "children": [
				{ "type": "tabset", "id": "ts-terminal", "weight": 100, "activeTabId": "terminal",
				  "children": [{ "type": "tab", "id": "terminal" }] },
				{ "type": "tabset", "id": "ts-preview", "weight": 100, "activeTabId": "preview", "isFolded": true,
				  "children": [{ "type": "tab", "id": "preview" }] }
			] }
		]
	}
}
```

## Semantics

- **Weights are proportions, not pixels.** Each row gives its children their minimum size, then shares the rest by weight. Folded tabsets get no share. A weight of `0` is valid: it's what a panel dragged to its minimum gets. So a saved layout keeps its proportions at any container size, and resizing the container never changes the JSON.
- **Directions alternate.** A row's children never have its own direction; such rows are merged when loading. The root may be vertical.
- **Tabs are identified by your ids.** Rows and tabsets have generated ids that are kept across saves; `maximizedTabsetId` refers to one.
- **Splitters and pixel sizes are not stored.** Splitters are derived from the tree.

## Loading

Saved layouts are validated and repaired:

- Invalid weights become 100.
- An `activeTabId` that isn't in the tabset falls back to the first tab.
- Duplicate tabs keep their first occurrence.
- Empty tabsets and rows are removed.
- Single-child rows are dissolved.

Each repair is reported through `onWarning`. Input that can't be used throws `DynamixLayoutError` with the path of the problem.

The saved layout and the open `tabs` are reconciled:

- Tabs missing from `tabs` are removed.
- Tabs missing from the layout are added to the first tabset (they don't become active).

Layouts saved by v1 (`{ typNode, nodName, … }`) are recognized and migrated; see [`migrateLayoutFromV1`](./migrate-layout-from-v1.md).
