# `createLayout`

Creates a layout engine instance. It's framework-agnostic: no DOM access, no timers, no module-level state. Every instance is independent, so you can run several layouts on a page, or one per server request.

```ts
import { createLayout } from '@dynamix-layout/core'

function createLayout(options: LayoutOptions): Layout
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `tabs` | `readonly TabInit[]` | required | The open tabs: `{ id: string; target?: DropTarget }`. Order only matters for the default layout. |
| `initialLayout` | `LayoutJSON \| LayoutTreeV1 \| null` | default layout | A saved layout. v1 trees are migrated automatically, with a `MIGRATED_FROM_V1` warning. |
| `minPanelSize` | `{ width: number; height: number }` | `{ width: 40, height: 40 }` | Smallest tabset size. |
| `splitterSize` | `number` | `10` | Splitter thickness. |
| `foldedSize` | `number` | `minPanelSize.height` | Size of a folded tabset along its row; usually the tab bar height. |
| `createId` | `(kind: 'row' \| 'tabset', hint?: string) => string` | deterministic | Id factory for rows and tabsets. The default gives `ts-<first tab id>` and `row-<n>`, the same on server and client. |
| `onLayoutChange` | `(layout: LayoutJSON, reason: LayoutChangeReason) => void` | | After every committed change. Not called for drag frames, container resizes or `load()`. |
| `onWarning` | `(warning: LayoutWarning) => void` | `console.warn` in development | Non-fatal problems such as repaired saved layouts or unknown ids. |

Default layout: each tab gets its own tabset, nested with alternating directions: `t1 | (t2 / (t3 | …))`.

## The `Layout` instance

Actions return `true` when they changed the layout and `false` when they were refused or did nothing. They never throw.

| Method | Description |
|---|---|
| `getSnapshot()` | The current [snapshot](#snapshots). |
| `subscribe(listener)` | Called with the new snapshot after every change. Returns an unsubscribe function. |
| `setContainerRect(rect)` | The area to fill. `x`/`y` offset everything, which is how adapters apply padding. |
| `setTabs(tabs)` | Replace the open tabs. Unlisted tabs are removed; new ones are added (at their `target`, else the last active tabset) and activated. |
| `setOptions({ minPanelSize?, splitterSize?, foldedSize? })` | Change sizes without rebuilding. |
| `moveTab(tabId, target)` | Move a tab. See [`DropTarget`](#droptarget). |
| `moveTabset(tabsetId, target)` | Move a whole tabset (into another tabset, beside one, or to an edge). |
| `selectTab(tabId)` | Make a tab active. |
| `addTab(tab, target?)` | Add one tab. |
| `removeTab(tabId)` | Remove one tab. Emptied tabsets and single-child rows are dissolved. |
| `resizeSplitter(splitterId, point)` | Move a splitter so its centre is at `point`, clamped to the neighbours' minimum sizes. |
| `moveSplitterBy(splitterId, delta)` | Move a splitter by `delta` px along its row (keyboard resizing). |
| `maximize(tabsetId)`, `restore()`, `toggleMaximize(tabsetId)` | Maximize one tabset over the whole layout; the others stay in place, hidden. Needs at least two tabsets. |
| `fold(tabsetId)`, `unfold(tabsetId)`, `toggleFold(tabsetId)` | Fold to a strip along its row. Folding a row's last open child unfolds the most recently folded sibling. Needs a sibling. |
| `startDrag(source)` | Start a drag of `{ type: 'tab', tabId }`, `{ type: 'tabset', tabsetId }` or `{ type: 'splitter', splitterId }`. Tab and tabset drags leave maximized mode first. |
| `updateDrag(point, measurements?)` | Move the drag. Tab drags update `snapshot.drag.target`; splitter drags move the splitter. Never calls `onLayoutChange`. |
| `setDragTarget(target, measurements?)` | Set the target directly (keyboard move mode). |
| `endDrag()` | Commit: move the tab, or keep the splitter position, with one `onLayoutChange`. |
| `cancelDrag()` | End without moving; a dragged splitter goes back. |
| `getDropTarget(point, source, measurements?)` | Hit testing without starting a drag. |
| `getDropIndicatorRect(target, measurements?)` | The indicator rect for a target. |
| `listDropTargets(source)` | Every valid target, in reading order. |
| `getSplitterBounds(splitterId)` | `{ value, min, max }` in px, for ARIA. |
| `load(layout)` | Replace the layout (v1 or v2) without calling `onLayoutChange`. |
| `reset()` | Back to `initialLayout`, or the default layout of the current tabs. |
| `toJSON()` | The current [`LayoutJSON`](./layout-json.md). Returns the same object until the layout changes. |
| `destroy()` | Remove all listeners. Later actions are ignored with a `DESTROYED` warning. |

`measurements` (`DropMeasurements`) describes the tab bars as rendered: `{ tabBars: Map<tabsetId, { rect, isRotated?, tabs: { id, rect }[] }> }`, in layout-root coordinates. The engine can't know label widths, so adapters measure them once when a drag starts. Without measurements, tab bars aren't targets, but panels and edges still are.

### `DropTarget`

```ts
type DropTarget =
	| { type: 'tabset'; tabsetId: string; position: 'top' | 'bottom' | 'left' | 'right' | 'center' }
	| { type: 'tab'; tabId: string; position: 'before' | 'after' }
	| { type: 'root'; position: 'top' | 'bottom' | 'left' | 'right' }
```

- **`tabset` + `center`:** append to that tabset.
- **`tabset` + a side:** beside it. If the side runs across the tabset's row, the tabset is wrapped in a new row.
- **`tab`:** into that tab's tabset, before or after it.
- **`root`:** at an edge of the whole layout.

Refused moves:

- a tab onto itself;
- a lone tab onto its own tabset;
- a tabset onto itself or its own tabs;
- the only tabset, or the only tab, in the layout.

## Snapshots

```ts
interface LayoutSnapshot {
	root: RowNode                                  // the tree
	tabsets: ReadonlyMap<string, TabsetState>      // id, tabIds, activeTabId, parentDirection, isFolded, isMaximized, isHidden, canFold, canMaximize
	splitters: ReadonlyMap<string, SplitterState>  // id, rowId, direction, beforeId, afterId, isLocked, isHidden
	tabs: ReadonlyMap<string, TabState>            // id, tabsetId, isActive, isVisible
	rects: LayoutRects                             // container, rows, tabsets, splitters (layout-root coordinates)
	maximizedTabsetId: string | null
	drag: DragState | null                         // source, target, indicator
}
```

Snapshots are immutable and **share unchanged parts by reference**:

- A container resize changes `rects`, but not `tabsets`, `splitters` or `tabs`.
- Selecting a tab replaces one `TabsetState` and two `TabState`s; every other entry keeps its identity.

Compare with `===` at any depth. In development the snapshot objects are frozen.

## Errors and warnings

`createLayout` and `load` throw `DynamixLayoutError` for input they can't use:

| `code` | When |
|---|---|
| `INVALID_LAYOUT` | Malformed saved layout. `error.path` says where, e.g. `root.children[1].weight`. |
| `UNSUPPORTED_VERSION` | A `version` other than 2. |
| `DUPLICATE_TAB_ID` | Duplicate ids in `tabs`, in development. In production the first one wins and a warning is reported. |

`onWarning` receives `{ code, message, path? }` with these codes:

- `MIGRATED_FROM_V1`
- `DUPLICATE_TAB_ID`
- `INVALID_ACTIVE_TAB`
- `INVALID_WEIGHT`
- `UNKNOWN_ID`
- `DESTROYED`

## Example

```ts
const layout = createLayout({
	tabs: [{ id: 'editor' }, { id: 'terminal' }],
	initialLayout: JSON.parse(localStorage.getItem('layout') ?? 'null'),
	onLayoutChange: (json) => localStorage.setItem('layout', JSON.stringify(json)),
})

const unsubscribe = layout.subscribe((snapshot) => render(snapshot))
layout.setContainerRect({ x: 0, y: 0, width: 1200, height: 800 })

// A splitter drag: transient frames, one change at the end.
layout.startDrag({ type: 'splitter', splitterId })
layout.updateDrag({ x: 400, y: 300 })
layout.endDrag()
```

More in [Using the core without React](../guides/core-without-react.md).
