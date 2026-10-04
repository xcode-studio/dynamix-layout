# dynamix-layout v2 — Phase 2 design

Status: **proposal, waiting for approval**. Builds on [01-audit.md](./01-audit.md); `F*`, `R*`, `P*` and `B*` refer to items there.
No source code changes in this phase.

---

## 0. Decisions taken (please confirm or overturn)

The open questions from the audit were answered "go ahead", so I took the recommended option for each. Every one is cheap to flip now and expensive later.

| # | Decision | Why |
|---|---|---|
| D1 | **PR #83 (maximize and fold) merges before v2 work starts.** v2 ports it. | It's done and reviewed; porting it once is cheaper than rebasing v2 onto it later. |
| D2 | **`@dynamix-layout/solid` also gets a major (2.0.0).** It's a minimal port: props unchanged, but it now reads and writes the v2 JSON. | Solid depends on core types and APIs that v2 removes. A minor bump would break Solid users, which violates semver. |
| D3 | **`tabs` is the list of open tabs; the layout only decides where they go.** A tab in `tabs` that's missing from the layout is added to the last active tabset (or to its `target`). A layout tab that's missing from `tabs` is removed. | It fixes B8, and it gives one source of truth for "which tabs exist". Closing a tab means removing it from `tabs` (see §3.4). |
| D4 | **Keep v1's sizing semantics, and name the field `weight`, not `size`.** A weight works like CSS `flex-grow` with `flex-basis` set to the minimum size. | Migration stays lossless (v1 layouts restore pixel-exact). Splitter and resize behaviour doesn't change. A field named `size` would suggest pixels or percentages, and it would be neither. |
| D5 | **Duplicate tab ids throw in development. In production the first occurrence wins, and an `onWarning` is emitted.** | Fixes B9 loudly where developers see it, without crashing production apps. |
| D6 | **Delete `examples/svelte`** (it contains only a stale `dist/`). | Dead weight (B23). |
| D7 | **Tab drag moves from HTML5 DnD to pointer events.** | Touch support; one drag model for tabs and splitters; drop targets computed from engine rects instead of DOM overlays; Escape to cancel; a keyboard move mode becomes possible. See §3.9. |
| D8 | **All rects are relative to the layout root, not the viewport.** | Fixes B25. Positioning becomes independent of where the layout sits on the page or how far the page is scrolled. |
| D9 | **React's imperative handle has no `addTab`/`removeTab`.** Tabs are added or removed by changing the `tabs` prop. Core keeps `addTab`/`removeTab` for headless and vanilla users. | In React, a handle that adds tabs would create a second, content-less source of truth that competes with the `tabs` prop (see D3). |
| D10 | **Publish a final v1.x patch** (packaging fixes plus `@deprecated` JSDoc, no runtime warnings). See §7. | React 18 users are broken today (B2) and shouldn't have to wait for v2. |

---

## 1. Goals and non-goals

**Goals**
- Instance-based, fully typed, pure core: no globals, no timers, no DOM at import time.
- A small React API at three levels: component, headless hooks, and state/actions anywhere.
- Lossless migration of saved v1 layouts.
- SSR-safe, StrictMode-safe and accessible.
- Fix every **H** and **M** bug in the audit.
- **Keep the behaviours users depend on**:
  - tab contents never remount when tabs move (R2);
  - the edges outside a dragged splitter pair never move (F8);
  - exact restore after maximize and after fold (F15/F16);
  - drag stays smooth over iframes (R6);
  - the imperative DOM fast path during drags (R3).

**Non-goals for 2.0** (listed as follow-ups in §12)
- Dragging tabs out to other windows (not supported in v1 either).
- Scrollable layouts smaller than their minimum size. v1 clips (F6); v2 keeps that.
- Redesigning the Solid API.
- Undo/redo, floating panels, popouts.

---

## 2. Core (`@dynamix-layout/core`)

### 2.1 Source layout

```
packages/core/src/
  model/
    types.ts            # LayoutNode, RowNode, TabsetNode, TabNode, Direction, Rect, Point
    guards.ts           # isRow, isTabset, isTab
  tree/
    build.ts            # buildDefaultTree(tabIds, createId)    ← tree-builder.ts:134-242
    find.ts             # findNode, findParent, findTabset, walk
    insert.ts           # insertTab, insertBeside, dockAtRoot   ← tree-mutations.ts:122-445
    remove.ts           # removeTab, removeTabset               ← tree-mutations.ts:527-630
    move.ts             # moveTab, moveTabset (remove + insert, plus guards ← :8-107)
    normalize.ts        # prune empties, flatten single-child and same-direction rows, fix activeTabId
    view-state.ts       # fold / unfold / maximize rules        ← view-state.ts
    reconcile-tabs.ts   # apply the tabs list (D3)
  geometry/
    min-size.ts         # min-size propagation                  ← geometry.ts:19-136
    distribute.ts       # cumulative-boundary distribution      ← node.ts:102-191
    compute-rects.ts    # computeLayoutRects (incl. maximize/fold overrides)
    splitter.ts         # clamp and re-weight a splitter pair   ← slider.ts:30-126
    tab-bar.ts          # getTabBarRect, getTabContentRect      ← dom.ts:10-46
  drop/
    drop-target.ts      # getDropTarget(point, snapshot, measurements)
    drop-indicator.ts   # getDropIndicatorRect(target, …)       ← drop-preview.ts
    drop-targets.ts     # listDropTargets(source) for keyboard move mode
  store/
    snapshot.ts         # deriving TabsetState/SplitterState/TabState with structural sharing
    store.ts            # createStore: getSnapshot/subscribe/setState (sync, no timers)
  serialize/
    schema.ts           # LayoutJSON types, LAYOUT_VERSION
    to-json.ts / from-json.ts (validation with path-based errors)
    migrate-v1.ts       # migrateLayoutFromV1, isLayoutV1
  dom/
    frame-scheduler.ts  # createFrameScheduler (moved from dom.ts:54-96)
    apply-rect.ts       # applyRect(el, rect) — used by adapters' fast path
  ids.ts                # createDeterministicIdGenerator
  dev.ts                # isDev, warn helpers (no import-time work)
  errors.ts             # DynamixLayoutError, error codes
  create-layout.ts      # the instance: wires tree + geometry + drop + store
  index.ts              # public exports only
```

Removed: `dynamix.ts`, `node.ts`, `state.ts`, `queue.ts`, `reactive-state.ts`, `comparator.ts`, the banner in `index.ts`, and the `window.__DYNAMIX_LAYOUT__` global (P1, P4, P8, P11).

**Rules.**
- No module-level mutable state.
- `tree/`, `geometry/`, `drop/` and `serialize/` are pure functions: data in, data out, no instance access.
- `create-layout.ts` is the only stateful module, and it owns one store per instance.
- Children are plain `readonly` arrays (replacing `Queue`, P8).

### 2.2 Model

```ts
export type Direction = 'horizontal' | 'vertical'
export interface Point { readonly x: number; readonly y: number }
export interface Rect { readonly x: number; readonly y: number; readonly width: number; readonly height: number }

export interface TabNode { readonly type: 'tab'; readonly id: string }   // id = user tab id

export interface TabsetNode {
  readonly type: 'tabset'
  readonly id: string
  /** Share of the parent row's space above the minimum sizes (like CSS flex-grow). */
  readonly weight: number
  readonly activeTabId: string          // always one of children (normalized)
  readonly isFolded: boolean
  readonly children: readonly TabNode[] // never empty (normalized)
}

export interface RowNode {
  readonly type: 'row'
  readonly id: string
  readonly weight: number
  readonly direction: Direction
  readonly children: readonly (RowNode | TabsetNode)[]
}

export type LayoutNode = RowNode | TabsetNode | TabNode
```

- **Direction is stored**, not derived from depth as in v1 (F2). That makes flattening exact, and it allows a vertical root.
- **Splitters are derived**: one between each pair of adjacent children of a row. A splitter's id is `` `${before.id}~${after.id}` ``, so it's stable when unrelated siblings change and deterministic across server and client.

**Invariants**, enforced by `normalize.ts` after every mutation and every load:
1. The root is a row, and it may have zero children (an empty layout).
2. Tabsets have at least one tab, and `activeTabId` is one of them.
3. A non-root row has at least 2 children. A single-child row is replaced by its child, **which keeps its own weight**. That is what v1 does when it dissolves a row (`moveAdjacentNodeToGrandParent`), so v1 interactions and saved layouts stay pixel-identical. This fixes B7.
4. A child row never has its parent's direction; same-direction rows are flattened, and their children keep their own weights (the same rule as invariant 3).

   *Implementation note:* the root absorbs a single child row (taking its direction, children and weight). The root's weight stands for that row: v1 kept a horizontal root with one vertical row child, whose weight matters again if something is later docked beside it. A root that is horizontal, or has at most one child, is a plain root: horizontal, weight 100.
5. Weights are finite and **≥ 0**. Invalid values become 100. Zero is valid: v1 writes it when a splitter is dragged all the way to a neighbour's minimum. If every unfolded child of a row has weight 0, they share the space equally (v1 left stale sizes, B28).
6. Tab ids are unique across the layout.
7. View-state rules from #83 (F17): a tabset alone in its row can't be folded; every row keeps at least one unfolded child; `maximizedTabsetId` must exist.

### 2.3 Geometry (pure, behaviour-preserving)

```ts
export interface GeometryConfig {
  readonly minPanelSize: { readonly width: number; readonly height: number }
  readonly splitterSize: number
  readonly foldedSize: number
}
export interface LayoutRects {
  readonly container: Rect
  readonly rows: ReadonlyMap<string, Rect>
  readonly tabsets: ReadonlyMap<string, Rect>     // maximize override applied
  readonly splitters: ReadonlyMap<string, Rect>
}
export function computeLayoutRects(
  root: RowNode, container: Rect, config: GeometryConfig, maximizedTabsetId: string | null,
  previous?: LayoutRects,                          // unchanged rects are reused by reference
): LayoutRects
```

The v1 algorithm is ported as is:
- min-size propagation (F5);
- root overflow growth (F6);
- weight distribution over the space above the minimums, with **cumulative boundary rounding** (F7);
- a folded tabset is `foldedSize` along its row and keeps its weight (F16);
- a maximized tabset gets the container rect, and the others are marked hidden (F15).

Rects are in **root coordinates**: `container.x/y` is the padding offset, so the root's top-left corner is (0, 0) (D8).

Splitter resize (`geometry/splitter.ts`) is the v1 clamp-and-re-weight of the two neighbours (`slider.ts:69-123`). It returns a new root with only that row path copied.

Performance: v1 recomputed only the dragged subtree. v2 recomputes rects for the whole tree, which is O(nodes) and tiny for realistic layouts (< 200 nodes). Unchanged `Rect` objects are reused by reference, so the DOM writer skips them. A drag benchmark in Phase 5 guards against regressions; if it regresses, subtree recompute is a local optimization inside `compute-rects.ts`.

### 2.4 Drop targets (pure)

```ts
export type Side = 'top' | 'bottom' | 'left' | 'right'
export type DropTarget =
  | { readonly type: 'tabset'; readonly tabsetId: string; readonly position: Side | 'center' }
  | { readonly type: 'tab'; readonly tabId: string; readonly position: 'before' | 'after' }
  | { readonly type: 'root'; readonly position: Side }

/** Tab bar geometry the engine can't know (label widths). Measured by the adapter, in root coordinates. */
export interface DropMeasurements {
  readonly tabBars: ReadonlyMap<string, { readonly rect: Rect; readonly tabs: readonly { readonly id: string; readonly rect: Rect }[] }>
}

export function getDropTarget(snapshot: LayoutSnapshot, point: Point, source: DragSource,
  measurements?: DropMeasurements, options?: { edgeSize?: number }): DropTarget | null
export function getDropIndicatorRect(snapshot: LayoutSnapshot, target: DropTarget, measurements?: DropMeasurements): Rect
```

The brief proposed `{ targetId, position }`. I chose a discriminated union instead, because a tab, a tabset and the root accept different positions. A union makes invalid pairs such as `{ tab, 'top' }` impossible to type.

The v1 rules are kept:
- tabset thirds (`drop-preview.ts:26-61`);
- tab-bar insertion marker (`:97-158`);
- root edges (`:64-91`) for a pointer within `edgeSize` (default 16px) of a root edge;
- a folded strip is always `center` (#83).

`v1 'contain'` becomes `'center'`. Invalid targets return `null`: a lone tab onto its own tabset, a tabset onto itself, or the only tabset moving anywhere (`tree-mutations.ts:27-87`).

### 2.5 Store and snapshots

```ts
export interface TabsetState {
  readonly id: string
  readonly tabIds: readonly string[]
  readonly activeTabId: string
  /** Direction of the row this tabset sits in. */
  readonly parentDirection: Direction
  readonly isFolded: boolean
  readonly isMaximized: boolean
  readonly isHidden: boolean            // another tabset is maximized
  readonly canFold: boolean
  readonly canMaximize: boolean
}
export interface SplitterState {
  readonly id: string
  readonly rowId: string
  readonly direction: Direction         // the row's direction: 'horizontal' row ⇒ vertical bar
  readonly beforeId: string
  readonly afterId: string
  readonly isLocked: boolean            // next to a folded tabset
  readonly isHidden: boolean
}
export interface TabState {
  readonly id: string
  readonly tabsetId: string
  readonly isActive: boolean
  readonly isVisible: boolean           // active, not folded, not hidden, body height > 0
}
export type DragSource =
  | { readonly type: 'tab'; readonly tabId: string }
  | { readonly type: 'tabset'; readonly tabsetId: string }
  | { readonly type: 'splitter'; readonly splitterId: string }
export interface DragState { readonly source: DragSource; readonly target: DropTarget | null }

export interface LayoutSnapshot {
  readonly root: RowNode
  readonly tabsets: ReadonlyMap<string, TabsetState>
  readonly splitters: ReadonlyMap<string, SplitterState>
  readonly tabs: ReadonlyMap<string, TabState>
  readonly rects: LayoutRects
  readonly maximizedTabsetId: string | null
  readonly drag: DragState | null
}
```

**Immutability and structural sharing.** Each change produces a new snapshot object. Each field keeps its previous reference unless it changed:
- A container resize or splitter drag changes `rects` (and, for a splitter, `root`), but not `tabsets`, `splitters` or `tabs`.
- Selecting a tab replaces one `TabsetState` and two `TabState`s. Every other entry keeps its object identity.

React can therefore compare by reference (`Object.is`) at every level. The snapshot is frozen in development, so accidental mutation throws; this fixes B11.

**Notifications are synchronous:** one notification per action, with no timers (P-brief, B12). Batching and throttling belong to the adapter (`createFrameScheduler`, `resizeThrottleMs`).

### 2.6 `createLayout()` — public API

```ts
export interface TabInit {
  /** Unique, stable id. It's also what the saved layout stores. */
  readonly id: string
  /** Where the tab goes the first time it appears. Default: the last active tabset. */
  readonly target?: DropTarget
}

export type LayoutChangeReason = 'move' | 'resize' | 'select' | 'fold' | 'maximize' | 'tabs' | 'reset'

export interface LayoutOptions {
  /** Open tabs. Order matters only for the default layout. */
  tabs: readonly TabInit[]
  /** Saved layout (v2 JSON, or v1 tree that is migrated automatically). */
  initialLayout?: LayoutJSON | LayoutTreeV1 | null
  /** @default { width: 40, height: 40 } */
  minPanelSize?: { width: number; height: number }
  /** @default 10 */
  splitterSize?: number
  /** Size of a folded tabset along its row. @default minPanelSize.height */
  foldedSize?: number
  /** Id factory for rows and tabsets. @default deterministic per instance */
  createId?: (kind: 'row' | 'tabset') => string
  /** Called after every committed change (never for transient drag frames or programmatic `load`). */
  onLayoutChange?: (layout: LayoutJSON, reason: LayoutChangeReason) => void
  /** @default console.warn in development, silent in production */
  onWarning?: (warning: LayoutWarning) => void
}

export interface Layout {
  getSnapshot(): LayoutSnapshot
  subscribe(listener: (snapshot: LayoutSnapshot) => void): () => void

  setContainerRect(rect: Rect): void
  setTabs(tabs: readonly TabInit[]): void
  setOptions(options: Partial<Pick<LayoutOptions, 'minPanelSize' | 'splitterSize' | 'foldedSize'>>): void

  moveTab(tabId: string, target: DropTarget): boolean
  moveTabset(tabsetId: string, target: DropTarget): boolean
  selectTab(tabId: string): boolean
  addTab(tab: TabInit, target?: DropTarget): boolean
  removeTab(tabId: string): boolean

  /** Moves a splitter so its centre is at `position` (root coordinates); clamped to min sizes. */
  resizeSplitter(splitterId: string, position: Point): boolean
  /** Keyboard resizing: moves a splitter by `delta` px along its row. */
  moveSplitterBy(splitterId: string, delta: number): boolean

  maximize(tabsetId: string): boolean
  restore(): boolean
  toggleMaximize(tabsetId: string): boolean
  fold(tabsetId: string): boolean
  unfold(tabsetId: string): boolean
  toggleFold(tabsetId: string): boolean

  /** Pointer-driven interactions (tabs, tabsets and splitters share one drag model). */
  startDrag(source: DragSource): boolean
  updateDrag(point: Point, measurements?: DropMeasurements): void   // transient: no onLayoutChange
  endDrag(): boolean                                                 // commits: one onLayoutChange
  cancelDrag(): void

  getDropTarget(point: Point, measurements?: DropMeasurements): DropTarget | null
  getDropIndicatorRect(target: DropTarget, measurements?: DropMeasurements): Rect
  /** Every valid target for the current drag source, in reading order (keyboard move mode). */
  listDropTargets(source: DragSource): readonly DropTarget[]
  /** Splitter position and bounds in px, for ARIA (aria-valuenow/min/max). */
  getSplitterBounds(splitterId: string): { value: number; min: number; max: number } | null

  /** Replace the layout (no onLayoutChange). */
  load(layout: LayoutJSON | LayoutTreeV1): void
  /** Back to `initialLayout`, or to the default layout built from the current tabs. */
  reset(): void
  toJSON(): LayoutJSON                         // memoized per root
  /** Removes all listeners; later calls are ignored with a development warning. */
  destroy(): void
}

export function createLayout(options: LayoutOptions): Layout
```

Example (the brief's shape, refined):

```ts
const layout = createLayout({
  tabs: [{ id: 'editor' }, { id: 'terminal' }],
  initialLayout: saved,                 // v1 or v2
  minPanelSize: { width: 40, height: 40 },
  splitterSize: 10,
  onLayoutChange: (json) => localStorage.setItem('layout', JSON.stringify(json)),
})
const unsubscribe = layout.subscribe((snapshot) => render(snapshot))
layout.setContainerRect({ x: 0, y: 0, width: 1200, height: 800 })
layout.moveTab('terminal', { type: 'tabset', tabsetId: layout.getSnapshot().tabs.get('editor')!.tabsetId, position: 'bottom' })
```

**Return values.** Actions return `true` if they changed the layout. A disallowed or no-op action returns `false`; this replaces v1's 21 `console.warn` calls (B18). An unknown id also returns `false`, plus a development warning. Actions never throw.

**What throws `DynamixLayoutError`** (`errors.ts`), always with `code`, `message` and, for JSON errors, a `path`:
- invalid JSON passed to `createLayout` / `load` (`INVALID_LAYOUT`, with a `path` such as `root.children[1].weight`);
- an unsupported `version` (`UNSUPPORTED_VERSION`);
- duplicate tab ids in development (`DUPLICATE_TAB_ID`, D5).

**IDs.** The default generator is deterministic per instance:
- The initial tabsets are named after their first tab: `ts-editor`.
- Later rows and tabsets get a counter: `row-1`, `ts-2`.
- Ids already present in a loaded layout are skipped.

So the same input gives the same ids on server and client, with no `crypto.randomUUID()` (B4, B5). User tab ids are used unchanged.

**Timers.** None in core. `createFrameScheduler` stays available under `dom/` for adapters.

### 2.7 Serialized format v2

```ts
export const LAYOUT_VERSION = 2
export interface LayoutJSON {
  version: 2
  root: RowJSON
  /** Id of the maximized tabset, if any. */
  maximizedTabsetId?: string
}
export interface RowJSON {
  type: 'row'; id: string; weight: number; direction: Direction
  children: (RowJSON | TabsetJSON)[]
}
export interface TabsetJSON {
  type: 'tabset'; id: string; weight: number
  activeTabId?: string
  isFolded?: boolean          // written only when true
  children: TabJSON[]
}
export interface TabJSON { type: 'tab'; id: string }
```

- Splitters aren't serialized. Neither are rects: sizes are weights, so a container resize never changes the JSON.
- The root's `weight` is ignored and written as `100`.
- Tab ids are the user's ids, so a saved layout is meaningful across sessions. This differs from v1, where tab `uidNode` was a per-session UUID.

### 2.8 `migrateLayoutFromV1`

```ts
export interface LayoutTreeV1 {                       // exported for typing old data
  typNode: 'row' | 'tabset' | 'tab' | 'bond'; nodName: string; uidNode: string; nodPart: number
  nodOpen?: string | boolean; nodKids?: LayoutTreeV1[]; nodFold?: boolean; nodMaxd?: string
}
export function isLayoutV1(input: unknown): input is LayoutTreeV1
export function migrateLayoutFromV1(tree: LayoutTreeV1, options?: { onWarning?: (w: LayoutWarning) => void }): LayoutJSON
```

`createLayout({ initialLayout })` and `layout.load()` call it automatically when `isLayoutV1(input)` is true. In that case they emit a `MIGRATED_FROM_V1` development warning, suggesting the app re-save the layout.

Mapping (matches audit §5):

| v1 | v2 |
|---|---|
| `typNode` | `type` |
| row/tabset `uidNode` | `id` (kept, so `nodMaxd` still resolves) |
| tab `nodName` | tab `id` (**v1 tab identity is the label**; tab `uidNode` is discarded) |
| `nodPart` | `weight` (same semantics, D4; a non-finite or negative value → 100) |
| depth parity | `direction` (root and even depths `horizontal`, odd depths `vertical`), computed **before** normalizing |
| tabset `nodOpen` (a tab label) | `activeTabId` (falls back to the first child) |
| tabset `nodFold: true` | `isFolded: true` |
| root `nodMaxd` | `maximizedTabsetId` (dropped if the id doesn't exist) |
| root `nodName`/`uidNode` (= `rootId`) | root `id` kept; irrelevant to the user |

Edge cases (audit §5.4):

| Input | Handling |
|---|---|
| Root with a single nested row (B7) | Row flattened into the root. The root takes the row's direction (`vertical`), so it's pixel-identical. |
| Same-direction nested rows (hand-edited) | Flattened; children keep their weights (invariant 4). |
| `nodOpen` naming a missing tab | `activeTabId` = first tab; `INVALID_ACTIVE_TAB` warning. |
| Duplicate tab `nodName`s | The first occurrence (BFS order) wins and later ones are dropped; `DUPLICATE_TAB_ID` warning (migration never throws on this). |
| Fractional `nodPart` | Kept as is. |
| `nodPart` < 0, `NaN` | 100; `INVALID_WEIGHT` warning. (`0` is valid.) |
| Empty tabset / empty row | Removed; the parent is then normalized. |
| Tab directly inside a row | Wrapped in a new tabset (deterministic id `ts-<tabId>`). |
| Root that is a tabset | Wrapped in a root row. |
| `typNode: 'bond'` or unknown fields | Ignored. |
| Not an object, or missing `typNode` | `DynamixLayoutError('INVALID_LAYOUT')`. |

Migration is pure and generates no random ids. Phase 3 tests it against fixtures produced by the **current v1 code** (§10).

---

## 3. React (`@dynamix-layout/react`)

### 3.1 Source layout

```
packages/react/src/
  context/
    layout-context.ts        # LayoutContext { controller } + useLayoutContext (dev error when missing)
    DynamixLayoutProvider.tsx
  hooks/
    use-dynamix-layout.ts    # creates/owns the controller; returns prop getters + lists
    use-layout-state.ts      # selector subscription (useSyncExternalStore)
    use-layout-actions.ts
    use-tabset.ts
    use-tab.ts
    use-splitter.ts
    use-drag-state.ts
  internal/
    controller.ts            # engine + tab registry + element registry + options sync
    rect-writer.ts           # the DOM fast path (one documented module, see §3.8)
    pointer-drag.ts          # pointer-event tab/tabset/splitter drags (§3.9)
    container-observer.ts    # ResizeObserver + rAF (§3.10)
    keyboard.ts              # ARIA tab navigation, splitter keys, shortcuts, move mode
    dom-ids.ts               # deterministic, CSS-safe ids from useId + tab id
  components/
    DynamixLayout.tsx        # Level 1, composes everything below
    Panel.tsx  TabBar.tsx  Tab.tsx  TabContent.tsx  Splitter.tsx
    DropIndicator.tsx  RootDropZone.tsx  TabsetToolbar.tsx
  utils/
    merge-props.ts  merge-refs.ts  use-isomorphic-layout-effect.ts  use-stable-callback.ts
  types.ts
  index.ts                   # 'use client' banner added at build time
  styles.css
```

Each file has one responsibility and aims for < 200 lines. `use-layout.ts` (733 lines, P5) is split across `controller`, `rect-writer`, `pointer-drag`, `container-observer` and `keyboard`.

### 3.2 Level 1 — `<DynamixLayout />`

```ts
export interface TabItem {
  /** Unique, stable id. Stored in saved layouts. */
  id: string
  /** Tab bar label. @default id */
  title?: ReactNode
  content: ReactNode
  /** Show a close button; closing calls `onTabClose`. @default false */
  closable?: boolean
  /** Placement the first time this tab appears. @default last active tabset */
  target?: DropTarget
}

export type LayoutSlot =
  | 'root' | 'panel' | 'tabBar' | 'tab' | 'activeTab' | 'tabClose' | 'tabContent'
  | 'splitter' | 'dropIndicator' | 'rootDropZone' | 'toolbar' | 'toolbarButton'

export interface DynamixLayoutProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'defaultValue' | 'onChange'> {
  tabs: readonly TabItem[]
  /** Uncontrolled: initial layout (v1 or v2). Later changes are ignored. */
  defaultLayout?: LayoutJSON | LayoutTreeV1
  /** Controlled layout (v1 or v2). Use with `onLayoutChange`. */
  layout?: LayoutJSON | LayoutTreeV1
  onLayoutChange?: (layout: LayoutJSON, details: { reason: LayoutChangeReason }) => void
  onTabClose?: (tabId: string) => void
  /** @default { width: 40, height: 40 } */
  minPanelSize?: { width: number; height: number }
  /** @default 10 */
  splitterSize?: number
  /** @default 40 */
  tabBarHeight?: number
  /** @default true */
  showTabBar?: boolean
  /** @default 0 */
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number }
  /** @default true */
  allowMaximize?: boolean
  /** @default true (requires the tab bar) */
  allowFold?: boolean
  /** @default true */
  maximizeOnDoubleClick?: boolean
  /** Alt/Option + "+" maximize, Alt/Option + "-" fold, for the focused tabset. @default true */
  keyboardShortcuts?: boolean
  /** WAI-ARIA tabs activation. @default 'automatic' */
  tabActivation?: 'automatic' | 'manual'
  /** Container resize throttle; 0 = once per animation frame. @default 0 */
  resizeThrottleMs?: number
  components?: Partial<LayoutComponents>
  classNames?: Partial<Record<LayoutSlot, string>>
  styles?: Partial<Record<LayoutSlot, React.CSSProperties>>
}

export const DynamixLayout: (props: DynamixLayoutProps & { ref?: React.Ref<DynamixLayoutHandle> }) => React.ReactElement
```

That's **23 own props** instead of 46. Custom components replace the 6 wrappers; one `classNames` and one `styles` object replace the 14 styling props; one throttle prop replaces 4 debounce props.

Defaults equal the v1 defaults (`bond 10`, `minW/minH 40`, `tabHeadHeight = minH = 40`). Upgrading without setting any options therefore looks the same.

As in v1 (`useLayout.ts:76-78`), the effective minimum height is `max(minPanelSize.height, tabBarHeight)` when the tab bar is shown. The fold size equals `tabBarHeight` (or `minPanelSize.height` without a tab bar).

**Slot components** (each receives DOM props to spread, plus state; must forward `ref`):

```ts
type SlotProps<E extends HTMLElement = HTMLDivElement> = React.HTMLAttributes<E> & { ref?: React.Ref<E> }
export interface LayoutComponents {
  Panel: React.ComponentType<SlotProps & { tabset: TabsetState }>
  TabBar: React.ComponentType<SlotProps & { tabset: TabsetState; isRotated: boolean; children: ReactNode }>
  Tab: React.ComponentType<SlotProps<HTMLElement> & { tab: TabItem; isActive: boolean; isDragging: boolean; onClose?: () => void }>
  TabContent: React.ComponentType<SlotProps & { tab: TabItem; isActive: boolean; children: ReactNode }>
  Splitter: React.ComponentType<SlotProps & { splitter: SplitterState; isDragging: boolean }>
  DropIndicator: React.ComponentType<SlotProps & { target: DropTarget }>
  RootDropZone: React.ComponentType<SlotProps & { side: Side; isActive: boolean }>
  TabsetToolbar: React.ComponentType<TabsetToolbarProps>
}
export interface TabsetToolbarProps {
  tabset: TabsetState; isRotated: boolean; canMaximize: boolean; canFold: boolean
  onToggleMaximize: () => void; onToggleFold: () => void
}
```

`Panel` is now a real background element for each tabset; that's where borders and backgrounds go. v1's `WrapTabPanel` was a transparent overlay shown only during drags, and pointer hit-testing no longer needs it.

### 3.3 Tabs reconciliation (fixes B1, P3)

- The engine is created **once per component instance**, in a `useState` initializer. `createLayout` is pure, so StrictMode's double-invoke just discards one instance.
- Each render computes the **id list**. Only when the ids change (a joined-string comparison) does the controller call `engine.setTabs()`, in a layout effect.
- Titles, content and `closable` live in a tab registry passed through context. Changing them never touches the engine.
- So an inline `tabs` array with unchanged ids causes **zero engine work**, and content never remounts. A test asserts this (§10).
- `minPanelSize`, `splitterSize`, `tabBarHeight` and `showTabBar` changes call `engine.setOptions()` without recreating the engine.

### 3.4 Controlled and uncontrolled

**Uncontrolled** (`defaultLayout`):
- The engine owns the layout, and `onLayoutChange` reports each committed change.
- Changes to `defaultLayout` after mount are ignored, like React's `defaultValue`.

**Controlled** (`layout` + `onLayoutChange`):
1. A user action is applied by the engine, and `onLayoutChange(next)` fires.
2. The wrapper schedules a reconcile render.
3. In a layout effect, if `layout` is not the object it last emitted or loaded, it calls `engine.load(layout)`.

So if the parent stores `next`, nothing reloads; if it ignores or edits it, the layout reverts to (or adopts) the parent's value. All of this happens before paint, so there's no visible flicker.

Transient drag frames (splitter moves, drop-target changes) aren't changes; only `endDrag` commits.

**Closing tabs** follows the same model: the close button calls `onTabClose(id)`, and the parent removes the tab from `tabs`.

`onLayoutChange` reasons:

| Reason | Fired after |
|---|---|
| `'move'` | a drop |
| `'resize'` | a splitter release or a keyboard resize |
| `'select'` | selecting a tab |
| `'fold'` / `'maximize'` | the view-state toggles |
| `'tabs'` | `tabs` added or removed |

It is **not** fired on mount (B17), on container resize, or after a programmatic `load`.

### 3.5 Imperative handle

```ts
export interface DynamixLayoutHandle {
  readonly element: HTMLDivElement | null
  moveTab(tabId: string, target: DropTarget): boolean
  moveTabset(tabsetId: string, target: DropTarget): boolean
  selectTab(tabId: string): boolean
  focusTab(tabId: string): void
  maximize(tabsetId: string): boolean
  restore(): boolean
  toggleMaximize(tabsetId: string): boolean
  fold(tabsetId: string): boolean
  unfold(tabsetId: string): boolean
  toggleFold(tabsetId: string): boolean
  reset(): void
  toJSON(): LayoutJSON
  getSnapshot(): LayoutSnapshot
}
```

There is no `addTab`/`removeTab` (D9): change `tabs`, optionally with `TabItem.target` for placement. Both function refs and object refs work (fixes B6).

### 3.6 Level 2 — headless hooks

```ts
export interface UseDynamixLayoutOptions extends Omit<DynamixLayoutProps,
  'components' | 'classNames' | 'styles' | 'tabs' | keyof React.HTMLAttributes<HTMLDivElement>> {
  tabs: readonly Pick<TabItem, 'id' | 'title' | 'closable' | 'target'>[]   // content not required
  id?: string
}
export interface UseDynamixLayoutResult {
  /** Pass to <DynamixLayoutProvider> so child hooks work. Stable. */
  controller: LayoutController
  getRootProps: <P extends React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }>(props?: P) => P
  tabsets: readonly TabsetState[]          // changes only on structural changes
  splitters: readonly SplitterState[]
  tabIds: readonly string[]
  dropIndicator: { target: DropTarget; props: SlotProps } | null
  rootDropZones: readonly { side: Side; isActive: boolean; props: SlotProps }[]  // empty unless dragging
  actions: LayoutActions                   // stable
}
export function useDynamixLayout(options: UseDynamixLayoutOptions): UseDynamixLayoutResult
export function DynamixLayoutProvider(props: { controller: LayoutController; children: ReactNode }): ReactElement

export function useTabset(tabsetId: string): {
  tabset: TabsetState; isRotated: boolean
  getPanelProps: PropGetter; getTabBarProps: PropGetter   // tablist role, drag source for the whole tabset
  toggleMaximize(): void; toggleFold(): void
}
export function useTab(tabId: string): {
  tab: TabState; isActive: boolean; isDragging: boolean
  select(): void; close(): void
  getTabProps: PropGetter<HTMLElement>        // role=tab, aria-*, roving tabindex, pointer drag, keyboard
  getTabContentProps: PropGetter              // role=tabpanel, positioning ref
}
export function useSplitter(splitterId: string): {
  splitter: SplitterState; isDragging: boolean; direction: Direction
  value: number; min: number; max: number                  // px, for custom UI
  getSplitterProps: PropGetter                             // role=separator, aria-*, pointer + keys
}
export function useDragState(): DragState | null
```

The brief's example, corrected so the child hooks have context:

```tsx
function MyLayout({ tabs }: { tabs: MyTab[] }) {
  const { controller, getRootProps, tabsets, splitters, tabIds, dropIndicator } = useDynamixLayout({ tabs })
  return (
    <DynamixLayoutProvider controller={controller}>
      <div {...getRootProps({ className: 'my-layout' })}>
        {tabsets.map((ts) => <MyTabset key={ts.id} tabsetId={ts.id} />)}
        {tabIds.map((id) => <MyContent key={id} tabId={id} />)}      {/* flat: never remounts */}
        {splitters.map((s) => <MySplitter key={s.id} splitterId={s.id} />)}
        {dropIndicator && <div {...dropIndicator.props} className="my-drop" />}
      </div>
    </DynamixLayoutProvider>
  )
}
```

`useTabDrag` from the brief became `useDragState`. Drag *initiation* is already part of `getTabProps` and `getTabBarProps`, so a separate drag hook would be a second way to do the same thing. `useContainerRect` stays internal; `getRootProps` wires it.

**Prop getters** merge rather than overwrite:
- `ref`s are combined.
- `className`s are joined.
- `style` merges user style first, then positioning (`left/top/width/height/transform`) last.
- Event handlers run the user's first; if the user calls `event.preventDefault()`, the internal handler is skipped (documented).

A missing provider throws in development: `` `useTab` must be used inside <DynamixLayout> or <DynamixLayoutProvider>. ``

### 3.7 Level 3 — state and actions anywhere

```ts
export function useLayoutState<T>(selector: (snapshot: LayoutSnapshot) => T, isEqual?: (a: T, b: T) => boolean): T
export function useLayoutActions(): LayoutActions   // stable object
export type LayoutActions = Pick<Layout,
  'moveTab' | 'moveTabset' | 'selectTab' | 'maximize' | 'restore' | 'toggleMaximize' |
  'fold' | 'unfold' | 'toggleFold' | 'reset' | 'toJSON'>
```

`useLayoutState` is built on `useSyncExternalStore` with a memoized selector: it caches by snapshot reference plus selector and checks `isEqual`, defaulting to `Object.is`. It's about 30 lines and needs no dependency. Because snapshots share structure (§2.5), `s.tabsets.get(id)?.activeTabId` re-renders only when that value changes; a test asserts the render counts (§10).

**Stability guarantee** (documented in the API docs):

| Value | Stable across renders? |
|---|---|
| `controller`, `actions`, every function in hook results, `select`/`close`/`toggle*`, `getXProps` | Yes, always |
| `tabsets`, `splitters`, `tabIds` arrays | Change only when the structure changes (not on resize or drag frames) |
| `TabsetState` / `SplitterState` / `TabState` objects | Change only when that entry changes |
| `dropIndicator` | Changes when the target changes (not on every pointer move) |
| Rects | Not exposed through React state; applied by the fast path |

### 3.8 DOM fast path (`internal/rect-writer.ts`)

It keeps v1's key performance property (R3): **pointer moves never re-render React.**

1. Components register their element under `slot:id` (`panel`, `tabBar`, `tabContent`, `splitter`, `dropIndicator`, `toolbar`) through the ref in the prop getters.
2. The writer subscribes to the engine. When `snapshot.rects` changes reference, it walks the registry and writes `left/top/width/height` (and `transform` for rotated strips) **only for rects whose object identity changed**.
3. Visibility goes through attributes (`data-dx-hidden`, `data-dx-visible`) styled in CSS. Inline `display` is never written, for the reason in #83 (an inline `display` wipes the slot component's own value).
4. Components *also* render positioning from the current snapshot at render time. That makes the first paint and SSR correct, and React's diff (props against props, not against the DOM) never fights the writer.

The module is internal, documented in its header, and covered by a test that drags a splitter and asserts zero React commits.

### 3.9 Pointer-based tab dragging (D7, replaces P7)

- **Start.** `pointerdown` on a tab or tab bar, then movement past 4px for mouse/pen, or a **350ms long press** for touch so the tab bar can still be scrolled by panning. Then `setPointerCapture` and `engine.startDrag`. A click without movement selects the tab, as today.
- **Move.** Moves are coalesced to one per frame with `createFrameScheduler`. The pointer is converted to root coordinates, and `engine.updateDrag(point, measurements)` is called. `measurements` (tab bar and label rects) is measured once at drag start and again if a tab bar scrolls.
- **End.** `pointerup` → `engine.endDrag()` (performs the move, one `onLayoutChange`). **Escape** or `pointercancel` → `cancelDrag()`.
- **Feedback.**
  - The root gets `data-dx-dragging`, which keeps `.is-dragging`-style rules so iframes and editors inside tab content don't swallow events (R6).
  - The cursor comes from CSS on the captured element; there are no `document.body.style` writes (P5).
  - `DropIndicator` and `RootDropZone` render from `snapshot.drag`.
- **Maximize.** As in #83, starting a drag restores maximize first, so every target is visible.
- **Splitters** use the same module and `startDrag({ type: 'splitter' })`.
- **Lost by this change:** native HTML5 drag events on the wrappers. Users who attached `onDragStart` and similar to custom `WrapTab*` components must move to `useDragState`. This is listed as a breaking change.

### 3.10 Container measurement

- A `ResizeObserver` on the root measures the content box minus `padding`. Updates are batched per animation frame, or throttled by `resizeThrottleMs`. This replaces `window.resize` (P6) and catches sidebars and flex parents.
- The first measurement happens synchronously in an isomorphic layout effect (`getBoundingClientRect`), so there's no flash.
- Rects are root-relative (D8), so page scroll and the layout's offset don't matter (B25).

### 3.11 SSR, StrictMode, Next.js

- **No `window`/`document` at import or during render.** Everything DOM-related lives in effects or event handlers. The core is pure.
- **Deterministic first render.**
  - Engine ids are deterministic (§2.6), and DOM ids come from `useId()` (`internal/dom-ids.ts` encodes tab ids into CSS-safe ids). This fixes B4 and B14.
  - Before the first measurement the root carries `data-dx-measuring` (CSS `visibility: hidden` on its children). Server and client render the same markup, and the client measures before paint.
- **`'use client'`.** The React build prepends `'use client';` to the entry chunk with a Rollup `output.banner`. `migrateLayoutFromV1` and the types come from core, which is server-safe.
- **StrictMode.**
  - Every effect returns a cleanup: RO disconnect, pointer listeners, frame cancel, keyboard listeners. The double mount/unmount leaves nothing behind (tested with spies, §10).
  - React never calls `engine.destroy()`, because StrictMode remounts reuse the same engine; listener cleanup is enough.
- The Next.js example drops `dynamic(..., { ssr: false })` and renders on the server.

### 3.12 Accessibility (new)

**Tabs (WAI-ARIA Tabs pattern).**
- Tab bar: `role="tablist"`, with `aria-orientation="horizontal"` (`vertical` on a rotated strip).
- Each tab: `role="tab"`, `id`, `aria-selected`, `aria-controls` pointing at the content id, and a roving `tabindex` (active `0`, others `-1`).
- Content: `role="tabpanel"`, `aria-labelledby`, `tabindex="0"`.
- Keys: ←/→ (↑/↓ on a vertical strip), Home and End move focus. With `tabActivation: 'automatic'`, focus also selects; with `'manual'`, Enter or Space selects. Delete closes a `closable` tab (calls `onTabClose`).

**Splitters (Window Splitter pattern).**
- `role="separator"`, `aria-orientation`: `vertical` for a bar between side-by-side panels, `horizontal` otherwise.
- `aria-valuenow`/`aria-valuemin`/`aria-valuemax` as percentages of the pair, from `getSplitterBounds`.
- `aria-controls` points at the leading panel. `aria-label` defaults to "Resize {before} and {after}", using tab titles.
- `tabindex="0"`. Arrow keys move 10px (Shift: 50px); Home/End go to min/max. Enter folds or unfolds the leading tabset when it can fold, per APG "collapse".
- A locked splitter gets `aria-disabled="true"`.

**Toolbar.** Real `<button>`s with `aria-label`, `aria-pressed` (maximize) and `aria-expanded` (fold), as in #83.

**Keyboard tab move mode (proposed, feasible).**
1. With a tab focused, **Ctrl/⌘ + Shift + M** starts move mode (`engine.startDrag`).
2. ←/→/↑/↓ cycle through `engine.listDropTargets()` in reading order, and the drop indicator shows the target.
3. An `aria-live="polite"` region announces it, for example "Move Terminal: right of Editor".
4. **Enter** drops, and **Escape** cancels.

Mouse-free moves are also possible through the imperative `moveTab`.

**Shortcuts.** The maximize/fold shortcuts listen on the **root**, not `window`, and act on the focused tabset. This fixes B19, and two layouts on a page no longer both react.

### 3.13 Styling

- **`styles.css`** holds all defaults that v1 set as inline styles in `Default.tsx`, so `classNames` and CSS variables can override them.
- **Class names:** `.dx-root`, `.dx-panel`, `.dx-tab-bar`, `.dx-tab`, `.dx-tab-close`, `.dx-tab-content`, `.dx-splitter`, `.dx-drop-indicator`, `.dx-root-drop-zone`, `.dx-toolbar`, `.dx-toolbar-button`.
- **CSS variables:** `--dx-tab-bar-bg`, `--dx-tab-bg`, `--dx-tab-active-bg`, `--dx-tab-color`, `--dx-tab-radius`, `--dx-splitter-bg`, `--dx-splitter-hover-bg`, `--dx-drop-indicator-bg`, `--dx-drop-indicator-border`, `--dx-focus-ring`, `--dx-font`.
- **State attributes:**
  - `data-state="active|inactive"` (kept from v1);
  - `data-dx-folded`, `data-dx-maximized`, `data-dx-rotated`, `data-dx-hidden`, `data-dx-dragging`, `data-dx-locked`, `data-dx-measuring`.
- `classNames.{slot}` is appended to the default class, and `styles.{slot}` is merged under the positioning styles.

### 3.14 React 18 and 19

- **Peer dependencies:** `react` and `react-dom` `^18.0.0 || ^19.0.0` (P9).
- **JSX runtime is external:** `external: [/^react($|\/)/, /^react-dom($|\/)/, /^@dynamix-layout\/core($|\/)/]` (P9b, B2).
- `DynamixLayout` uses `forwardRef` (works on 18 and 19) and is typed so `ref` accepts `Ref<DynamixLayoutHandle>`.
- **Custom slot components must forward `ref`**: `forwardRef` on React 18, or a plain `ref` prop on 19. That's the same requirement as v1's `DivFC`; the docs show both.
- CI gets a React 18 test job (§10).

---

## 4. Solid adapter port (minimal, D2)

- The public props and components stay as they are.
- Internally:
  - one `createLayout` per component instance (no statics);
  - subscription to `layout.subscribe`, applying rects with the shared core `dom/apply-rect`;
  - `getTabOutput`'s `crypto.randomUUID` replaced by tab ids;
  - root-relative coordinates (B25).
- **Breaking for Solid:** `updateJSON` now emits `LayoutJSON` v2. `layoutTree` accepts v1 (auto-migrated) or v2. `LayoutTree` types are replaced by core's `LayoutJSON` / `LayoutTreeV1`.
- **Kept as is:** HTML5 DnD, `window.resize`, the `||` defaults (B13), and the tuple `tabs`. These are listed as follow-ups in §12.

---

## 5. Naming

### 5.1 Conventions (applied everywhere)

- **Files:** `kebab-case.ts`; components `PascalCase.tsx`; hooks `use-x.ts` exporting `useX`.
- **Full words.** Allowed short forms: `id`, `ref`, `props`, `x`, `y`.
- **Verbs and prefixes:**
  - functions start with a verb (`moveTab`, `computeLayoutRects`);
  - factories are `createX`;
  - callback props are `onX`;
  - booleans use `is`/`has`/`can`/`should`.
  - Boolean **props** follow React convention with `show*`/`allow*`, matching the brief's `showTabBar`.
- **Types:** `PascalCase`, with no `I` prefix. Options types are `XOptions`, props `XProps`, return types `XResult`, and state shapes `XState`.
- **One term per concept:**
  - **splitter** (not bond or slider);
  - **tabset**;
  - **panel** (a tabset's box);
  - **tab bar** (not tab head);
  - **drop indicator** (not hover element);
  - **fold** (not collapse);
  - **weight** (not part or size).

### 5.2 v1 → v2 rename table

**Core.**

| v1 | v2 |
|---|---|
| `new DynamixLayoutCore(options)` + statics `_root/_tree/_minW/_minH/_bond/_inst` | `createLayout(options)` instance; no statics |
| `Node`, `Bond`, `Node.cache` | internal immutable `RowNode` / `TabsetNode` / `TabNode`; derived `SplitterState` |
| `LayoutTree` | `LayoutJSON` (v2); old shape exported as `LayoutTreeV1` |
| `NodeOptions` (tabset / bond / tab entries) | `TabsetState` / `SplitterState` / `TabState` + `snapshot.rects` |
| `Dimension { w, h, x, y }` | `Rect { x, y, width, height }` |
| `typNode` | `type` |
| `uidNode` | `id` (tabs: the user's tab id; it was `nodName`) |
| `nodName` | removed for rows and tabsets; for tabs it becomes `id` |
| `nodPart` | `weight` |
| `nodeDir` (boolean, inverted for tabsets) | `direction: 'horizontal' \| 'vertical'` on rows; `parentDirection` on tabsets |
| `nodDims` | `snapshot.rects.tabsets/splitters.get(id)` |
| `nodOpen` | `activeTabId` (tabset) / `isActive` (tab) |
| `nodKids` | `children` (JSON, model) / `tabIds` (state) |
| `nodFold` **[#83]** | `isFolded` |
| `nodMaxd` **[#83]** | `maximizedTabsetId` (JSON, snapshot) / `isMaximized` (state) |
| `nodHidden` / `nodLocked` / `nodFoldable` / `nodMaximizable` | `isHidden` / `isLocked` / `canFold` / `canMaximize` |
| `minW` / `minH` | `minPanelSize: { width, height }` |
| `bond` | `splitterSize` |
| `collapsedSize` | `foldedSize` |
| `uqid`, `tabsIds`, `timer` | removed |
| `tabs: string[]` | `tabs: TabInit[]` (`{ id, target? }`) |
| `tree` | `initialLayout` |
| `updateDimension(dim, disableTimeout?, timeout?)` | `setContainerRect(rect)` (throttling moves to the adapter) |
| `updateSlider(id, point, …)` / `updateSliderDimension` | `resizeSplitter(splitterId, point)`; `moveSplitterBy`; drags via `startDrag/updateDrag/endDrag` |
| `updateTree(src, des, 'top'\|…\|'contain')` | `moveTab(tabId, target)` / `moveTabset(tabsetId, target)`; `'contain'` → `'center'` |
| `collapse` / `expand` / `toggleCollapse` **[#83]** | `fold` / `unfold` / `toggleFold` |
| `maximize` / `restore` / `toggleMaximize` / `maximizedId` | same names; `maximizedId` → `snapshot.maximizedTabsetId` |
| `DynamixLayoutCore._root.toJSON()` | `layout.toJSON()` |
| `clearAllCache()` | `destroy()` (per instance) |
| iterators, `createNode*`, `calc*`, `insertNode*`, `remove*`, `moveRelative*`, `isOnlyContent`, `pruneStaleDirections`, `calculateRootAdjustment` | internal (pure functions in `tree/` and `geometry/`) |
| `Queue`, `createReactiveState`, `areNodeOptions*Equal` | removed |
| `getTabsetDropPreview` / `getNavbarDropPreview` / `getRootSplitPreview` / `isSameDropPreview` | `getDropTarget` + `getDropIndicatorRect` |
| `setElementRect`, `placeTabbar`, `getTabbarPlacement`, `getTabBodyRect` | `applyRect` (`dom/`), `getTabBarRect`, `getTabContentRect` |
| `createFrameScheduler` | unchanged (`dom/`) |

**React.**

| v1 | v2 |
|---|---|
| `tabs: [id, node][]` + `tabNames` | `tabs: { id, title?, content, closable?, target? }[]` |
| `layoutTree` | `defaultLayout` (uncontrolled) / `layout` (controlled) |
| `updateJSON` | `onLayoutChange(layout, { reason })` |
| `bondWidth` | `splitterSize` |
| `minTabWidth` / `minTabHeight` | `minPanelSize: { width, height }` |
| `tabHeadHeight` / `enableTabbar` | `tabBarHeight` / `showTabBar` |
| `pad: { t, b, l, r }` | `padding: number \| { top, right, bottom, left }` |
| `enableMaximize` / `enableCollapse` / `enableDoubleClickMaximize` **[#83]** | `allowMaximize` / `allowFold` / `maximizeOnDoubleClick` |
| `keyboardShortcuts` **[#83]** | unchanged (now scoped to focus inside the layout) |
| `WrapTabPanel` / `WrapTabHead` / `WrapTabLabel` / `WrapTabBody` / `SliderElement` / `HoverElement` | `components.{ Panel, TabBar, Tab, TabContent, Splitter, DropIndicator }` |
| `RootSplitterHoverEl` | `components.RootDropZone` |
| `TabsetToolbar` **[#83]** | `components.TabsetToolbar` |
| `TabsetToolbarProps { maximized, folded, rotated, rowIsHorizontal, showMaximize, showFold, … }` | `{ tabset, isRotated, canMaximize, canFold, onToggleMaximize, onToggleFold }` |
| `*ElementStyles` (7) / `*ElementClass` (7) | `styles.{slot}` / `classNames.{slot}` |
| `disableSliderTimeout` + `sliderUpdateTimeout` | removed (splitters always update once per frame) |
| `disableResizeTimeout` + `windowResizeTimeout` | `resizeThrottleMs` |
| `rootId` | standard `id` prop (optional; DOM ids come from `useId`) |
| `ref` → `HTMLDivElement` | `ref` → `DynamixLayoutHandle` (`handle.element` is the div) |
| `useDynamixLayout` (31 return values) | new headless `useDynamixLayout` + `useTabset` / `useTab` / `useSplitter` / `useLayoutState` / `useLayoutActions` / `useDragState` |
| `getTabOutput`, `TabInput`, `TabOutput`, `TabEntry`, `DivFC`, `useDynamixLayoutOptions` | removed |
| `DynamixLayoutProps` / `UseDynamixLayoutOptions` / `UseDynamixLayoutResult` (dead) | names reused for the real v2 types |
| `Default*` components | `Panel`, `TabBar`, `Tab`, `TabContent`, `Splitter`, `DropIndicator`, `RootDropZone`, `TabsetToolbar` (exported for composition) |
| `.DefaultWrapTabLabel` etc. classes | `.dx-*` classes (§3.13) |
| `data-uid` / `data-type` | `data-dx-id` / `data-dx-slot` |
| `@dynamix-layout/react/style.css` | `@dynamix-layout/react/styles.css` (`./style.css` kept as an alias in 2.x) |

---

## 6. Breaking changes (with reasons and replacements)

Each item will appear in `docs/migration-v1-to-v2.md` with full before/after code. The core ones:

**1. Engine construction.** Why: global state (P1).

```ts
// v1
const engine = new DynamixLayoutCore({ tabs: ['a', 'b'], minW: 40, bond: 10 })
engine.updateDimension({ x: 0, y: 0, w: 800, h: 600 }, true)
const json = DynamixLayoutCore._root.toJSON()
// v2
const layout = createLayout({ tabs: [{ id: 'a' }, { id: 'b' }], minPanelSize: { width: 40, height: 40 }, splitterSize: 10 })
layout.setContainerRect({ x: 0, y: 0, width: 800, height: 600 })
const json = layout.toJSON()
```

**2. Reading state.** Why: static caches, mutable maps (B11).

```ts
// v1
Node.cache.nodOpts.onChange((tabsets) => tabsets.forEach((t) => draw(t.uidNode, t.nodDims)))
// v2
layout.subscribe((s) => s.tabsets.forEach((t) => draw(t.id, s.rects.tabsets.get(t.id)!)))
```

**3. Moves.** Why: typed targets instead of loosely typed strings.

```ts
// v1
engine.updateTree(srcUid, desUid, 'contain')
// v2
layout.moveTab('terminal', { type: 'tabset', tabsetId: 'ts-editor', position: 'center' })
```

**4. Debounce arguments removed from core.** Why: no timers in the engine (B12). Throttle in the adapter instead (`resizeThrottleMs`).

**5. Serialized format.**
- Why: readable names, an explicit version, and stable tab ids.
- Old layouts load automatically. Saved data should be re-saved, or converted with `migrateLayoutFromV1`.
- The `LayoutJSON` that apps receive is a new shape; anything reading `nodKids` and similar must change.

**6. Removed internal exports.** `Node`, `Bond`, `Queue`, `createReactiveState`, the comparators, the drop-preview helpers and the DOM helpers (see the rename table). Why: they're internal (P4).

**7. Import-time banner and `window.__DYNAMIX_LAYOUT__` removed.** Why: side effects (P11). Use `import { version } from '@dynamix-layout/core'` (new) for debugging.

**8. Build outputs.** Why: correctness (B20, P9b).
- `browser`, `iife` and `umd` builds are removed from react.
- Core keeps one UMD under `unpkg`.
- File names: `dist/index.js` and `dist/index.cjs`.

**React** (each with before/after in the migration guide):

9. `tabs` tuples → objects; `tabNames` → `title`.
10. `layoutTree` → `defaultLayout` / `layout`; `updateJSON` → `onLayoutChange`, which **is no longer called on mount** and receives v2 JSON.
11. Sizing props renamed or grouped (`minPanelSize`, `splitterSize`, `tabBarHeight`, `showTabBar`, `padding`).
12. Debounce props: four become one (`resizeThrottleMs`). Splitter debounce is removed.
13. Wrapper props → `components.*`. Their props change (state is passed explicitly), and `WrapTabPanel` becomes a visible background.
14. Styling props → `classNames` / `styles`. Default class names change to `.dx-*`, and default inline styles move to `styles.css`. Custom CSS targeting `.DefaultWrap*` must be updated.
15. `ref` now returns a `DynamixLayoutHandle`; use `handle.element` for the div.
16. `useDynamixLayout` is a different hook (headless). The v1 internal hook and `getTabOutput` are removed.
17. Tab drag uses pointer events. HTML5 drag events on custom wrappers no longer fire; use `useDragState`.
18. Keyboard shortcuts only act when focus is inside the layout (v1: anywhere on the page).
19. A tab that's in `tabs` but missing from the saved layout is now **added** (v1 dropped it silently). A layout tab that's missing from `tabs` is removed (v1 showed a label with no body).
20. Duplicate tab ids throw in development.
21. Peer dependencies: React 17 is dropped. React 18 now actually works.
22. The stylesheet path is `@dynamix-layout/react/styles.css` (the old `./style.css` alias still works in 2.x).
23. DOM data attributes change: `data-uid`/`data-type` → `data-dx-id`/`data-dx-slot`.

**Solid** (D2): 24. `updateJSON` emits v2 JSON; types `LayoutTree` → `LayoutJSON` / `LayoutTreeV1`.

**Behaviour kept on purpose:** default sizes, sizing math, the fold and maximize rules, clipping when the layout is smaller than its minimum, and content never remounting.

---

## 7. Final v1.x release — decision: **yes, a small one**

Proposal: **react 1.x patch + solid 1.x patch** after #83, published from `main` before v2 lands. It contains:
1. The jsx-runtime external fix and the peer dependency fix (`react ^18 || ^19`). React 18 users are broken today (B2) and shouldn't have to adopt a full rewrite to get a working package.
2. The README CSS path fix (P10) and the repository link fixes (P12).
3. `@deprecated` JSDoc on every prop and export that v2 removes, each linking to the migration guide. IDEs show the strikethrough, at zero runtime cost.

**No runtime deprecation warnings.** Every v1 prop changes in v2, so a warning would fire on every use with no way to migrate step by step. That's noise, not guidance. Saved layouts need no v1-side work, because v2 migrates them automatically.

---

## 8. Packaging

```jsonc
// @dynamix-layout/react
"type": "module",
"exports": {
  ".": {
    "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
  },
  "./styles.css": "./dist/styles.css",
  "./style.css": "./dist/styles.css",
  "./package.json": "./package.json"
},
"sideEffects": ["**/*.css"],
"peerDependencies": { "react": "^18.0.0 || ^19.0.0", "react-dom": "^18.0.0 || ^19.0.0" },
"dependencies": { "@dynamix-layout/core": "workspace:^" }
```

- **Core:** the same shape without CSS, plus `"sideEffects": false` (now true), and a `unpkg` UMD.
- **Solid:** `solid-js` moves to `peerDependencies` (B21).
- **Types:** `types` comes first in every condition. CJS types are a `.d.cts` copy produced after `vite-plugin-dts`, so `attw` passes for `node16` CJS and ESM.
- **Build:** vite-plugin-dts and Vite library mode stay (the tooling is unchanged).
- **Removed from the core build:** the `__LICENSE__` define and `vite-plugin-strip-comments`' licence duplication. A one-line `/*! @license MIT */` banner replaces them.
- **Scripts:** the React package gets `test` and `--max-warnings 0` lint scripts (P13).

---

## 9. Bug fix coverage

| Bug | Fixed by |
|---|---|
| B1 | §3.3 |
| B2 | §3.14 / §7 |
| B3 | §2 (instances) |
| B4 | §2.6 ids + §3.11 |
| B5 | §2.6 |
| B6 | §3.5 |
| B7 | invariant 3 |
| B8 | D3 |
| B9 | D5 |
| B10 | §3.4 |
| B11 | frozen snapshots |
| B12 | no engine timers |
| B13 | Solid follow-up (§12) |
| B14 | `useId` |
| B15 | controller owns its engine |
| B16 | cleanups (§3.11) |
| B17 | §3.4 |
| B18 | boolean returns + `onWarning` |
| B19 | §3.12 |
| B20 | §8 |
| B21 | §8 |
| B22 | all option types exported |
| B23 | D6 |
| B24 | defaults move to `styles.css` |
| B25 | D8 |

---

## 10. Test strategy

- **Characterization first.** A script runs the **current v1 core** through scripted and seeded-random sequences:
  - builds from 1 to 9 tabs;
  - every `updateTree` area;
  - splitter drags;
  - fold and maximize;
  - resize sweeps.

  For each step it records the v1 JSON, the tabset and bond rects, and the tab order. The results are committed as fixtures under `packages/core/test/fixtures/v1/`. v2 tests replay the same operations through `migrateLayoutFromV1` and the new API, and assert:
  - the same structure, modulo normalization;
  - **pixel-identical rects** (D4 makes this possible);
  - the same refusals.
- **Core unit tests** for every pure function, including:
  - edge cases: removing the last tab, moving a tab onto itself, min-size clamping, deep nesting, flattening;
  - migration of every row in the §2.8 edge-case table;
  - two independent instances in one process;
  - frozen snapshots and structural-sharing identity.
- **React (RTL plus Vitest, jsdom).**
  - `renderToString` in a Node environment with no `window` (spied), producing deterministic markup.
  - StrictMode mount/unmount with `addEventListener`/`removeEventListener`/`ResizeObserver.disconnect` spies balanced.
  - Selector render counts (selecting a tab in one tabset doesn't re-render the others).
  - **An inline `tabs` array with the same ids causes no engine calls and no content remounts.**
  - Splitter pointer drag and keyboard resize.
  - ARIA roles and attributes for tabs and splitters, plus arrow-key navigation.
  - Controlled vs uncontrolled; the `onLayoutChange` payload has `version: 2`.
  - Pointer tab drag: threshold, Escape cancel, drop.
  - Zero React commits during a splitter drag (fast path).
- **CI** adds a React 18 job (`pnpm --filter @dynamix-layout/react test` with react@18 installed via an override).
- **Coverage target:** at least 90% for core.

---

## 11. Phase 3 plan (commits)

**Order change.** The brief's order removes the static state (step 4) before the React rebuild (step 5), which would break React and Solid for several commits. To keep CI green on every commit, as the working rules require, the new core is built **alongside** the old one, and the old one is deleted only after both adapters are ported.

The work happens on branch `v2` (no PR until you ask). Each line below is one commit:

1. `chore: remove stale examples/svelte` (D6)
2. `test(core): characterization fixtures and tests for v1 behaviour`
3. `feat(core): immutable layout model and pure tree functions`
4. `feat(core): pure geometry and splitter math`
5. `feat(core): drop target and drop indicator calculation`
6. `feat(core): v2 serialization and migrateLayoutFromV1`
7. `feat(core): createLayout instance with store and snapshots` (the characterization fixtures pass against v2)
8. `feat(react)!: rebuild on createLayout with context, headless hooks and slot components` (`BREAKING CHANGE:` footer)
9. `feat(react): accessibility for tabs, splitters and keyboard move mode`
10. `refactor(solid)!: port to createLayout`
11. `refactor(core)!: remove DynamixLayoutCore, static caches, Queue, banner and window global`
12. `docs(examples): update examples; add basic, custom-components, headless and controlled React examples; SSR in Next.js`
13. `build: exports maps, peer deps, sideEffects, CJS types, use client banner`
14. `chore: changesets — major for core, react and solid`

Phases 4 (docs) and 5 (release checks) follow, as written in the brief.

---

## 12. Follow-ups (out of scope for 2.0)

- **Solid alignment:**
  - pointer DnD;
  - ResizeObserver;
  - object `tabs`, `classNames`/`styles`, `components`;
  - `??` defaults (B13);
  - reactive `tabs`/`layout`;
  - a11y parity;
  - headless primitives (`createTab`, `createSplitter`) mirroring the React hooks.
- Auto-scrolling tab bars while dragging near their edges.
- An optional scrollable mode when the container is smaller than the layout's minimum (F6).
- Drag-out and popout windows.
- A `@dynamix-layout/core/testing` helper with deterministic ids and a fake container, for user tests.
- A changesets prerelease channel (`2.0.0-next.x`) for early adopters. It would need its own release branch, because pre mode on `main` blocks 1.x patches.

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Pointer drags behave differently over iframes or on touch | Pointer capture + `data-dx-dragging` CSS (the same proven trick); manual agent-browser pass with an iframe tab; touch long-press tests |
| The fast path fights React reconciliation | Render reads current rects, so writer and render agree; a "zero commits during drag" test |
| Migration differs by a pixel | Fixtures from real v1 output; D4 keeps the same math, and flattening preserves extra-space shares |
| Scope size | Each commit is reviewable on its own; the old core stays until step 11, so the branch stays shippable |
