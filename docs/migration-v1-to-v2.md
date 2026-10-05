# Migrating from v1 to v2

v2 replaces the global v1 engine with independent instances. It simplifies the React API from 46 props to one small component plus hooks, and adds a versioned save format. **Layouts your users saved with v1 keep working**: v2 loads them as they are, and they render the same.

## Steps

1. **Upgrade.** `npm install @dynamix-layout/react@2` (or `@dynamix-layout/solid@2`). `@dynamix-layout/core` is now a dependency of the adapters, so you only need it if you import from it.
2. **Change the stylesheet import** to `@dynamix-layout/react/styles.css`.
3. **Convert `tabs`** from tuples to objects, and fold `tabNames` into `title`.
4. **Rename the layout props.** `layoutTree` becomes `defaultLayout` (or `layout` for controlled mode), and `updateJSON` becomes `onLayoutChange`, which now receives v2 JSON.
5. **Rename the size props:** `minPanelSize`, `splitterSize`, `tabBarHeight`, `showTabBar`, `padding`.
6. **Replace the wrapper and styling props** with `components`, `classNames` and `styles`.
7. **Remove the debounce props**; use `resizeThrottleMs` if you need throttling.
8. If you used `ref`, `useDynamixLayout` or `@dynamix-layout/core` directly, see the sections below.
9. If your CSS targets `.DefaultWrap*` classes or `data-uid`/`data-type`, switch to the [`.dx-*` classes and `data-dx-*` attributes](./guides/theming.md#classes-and-state-attributes).

Saved layouts need no changes. You may want to convert them once; see [Saved layouts](#saved-layouts).

## React: before and after

```tsx
// v1
import { DynamixLayout } from '@dynamix-layout/react'
import '@dynamix-layout/react/dist/layout.css'

<DynamixLayout
	tabs={[
		['editor', <Editor />],
		['terminal', <Terminal />],
	]}
	tabNames={new Map([['editor', 'Editor'], ['terminal', 'Terminal']])}
	layoutTree={saved}
	updateJSON={(tree) => save(tree)}
	minTabWidth={120}
	minTabHeight={80}
	bondWidth={6}
	tabHeadHeight={36}
	pad={{ t: 8, b: 8, l: 8, r: 8 }}
	WrapTabLabel={MyLabel}
	SliderElement={MySlider}
	tabLabelElementClass="my-tab"
	sliderElementStyles={{ background: '#222' }}
	disableResizeTimeout={false}
	windowResizeTimeout={16}
/>

// v2
import { DynamixLayout } from '@dynamix-layout/react'
import '@dynamix-layout/react/styles.css'

<DynamixLayout
	tabs={[
		{ id: 'editor', title: 'Editor', content: <Editor /> },
		{ id: 'terminal', title: 'Terminal', content: <Terminal /> },
	]}
	defaultLayout={saved}            // v1 layouts load as they are
	onLayoutChange={(layout) => save(layout)}
	minPanelSize={{ width: 120, height: 80 }}
	splitterSize={6}
	tabBarHeight={36}
	padding={8}
	components={{ Tab: MyTab, Splitter: MySplitter }}
	classNames={{ tab: 'my-tab' }}
	styles={{ splitter: { background: '#222' } }}
	resizeThrottleMs={16}
/>
```

## Rename table

### React props

| v1 | v2 |
|---|---|
| `tabs: [id, node][]` + `tabNames` | `tabs: { id, title?, content, closable?, target? }[]` |
| `layoutTree` | `defaultLayout` (uncontrolled) / `layout` (controlled) |
| `updateJSON(tree)` | `onLayoutChange(layout, { reason })` |
| `minTabWidth` / `minTabHeight` | `minPanelSize: { width, height }` |
| `bondWidth` | `splitterSize` |
| `tabHeadHeight` | `tabBarHeight` |
| `enableTabbar` | `showTabBar` |
| `pad: { t, b, l, r }` | `padding: number \| { top, right, bottom, left }` |
| `enableMaximize` / `enableCollapse` / `enableDoubleClickMaximize` | `allowMaximize` / `allowFold` / `maximizeOnDoubleClick` |
| `keyboardShortcuts` | unchanged (now scoped to focus inside the layout) |
| `WrapTabPanel` | `components.Panel` (now a visible box behind each tabset) |
| `WrapTabHead` | `components.TabBar` |
| `WrapTabLabel` | `components.Tab` |
| `WrapTabBody` | `components.TabContent` |
| `SliderElement` | `components.Splitter` |
| `HoverElement` | `components.DropIndicator` |
| `RootSplitterHoverEl` | `components.RootDropZone` |
| `TabsetToolbar` | `components.TabsetToolbar` |
| `tabPanelElementStyles` / `…Class` | `styles.panel` / `classNames.panel` |
| `tabHeadElementStyles` / `…Class` | `styles.tabBar` / `classNames.tabBar` |
| `tabLabelElementStyles` / `…Class` | `styles.tab` / `classNames.tab` (also `activeTab`, `tabClose`) |
| `tabBodyElementStyles` / `…Class` | `styles.tabContent` / `classNames.tabContent` |
| `sliderElementStyles` / `…Class` | `styles.splitter` / `classNames.splitter` |
| `hoverElementStyles` / `…Class` | `styles.dropIndicator` / `classNames.dropIndicator` |
| `RootSplitterHoverElStyles` / `…Class` | `styles.rootDropZone` / `classNames.rootDropZone` |
| `disableResizeTimeout` + `windowResizeTimeout` | `resizeThrottleMs` (`0` = once per frame) |
| `disableSliderTimeout` + `sliderUpdateTimeout` | removed: splitters always update once per frame |
| `rootId` | `id` (optional) |
| `ref` → root `<div>` | `ref` → `DynamixLayoutHandle` (`handle.element` is the `<div>`) |

### Toolbar props (`TabsetToolbar`)

| v1 | v2 |
|---|---|
| `maximized`, `folded` | `tabset.isMaximized`, `tabset.isFolded` |
| `rotated` | `isRotated` |
| `rowIsHorizontal` | `tabset.parentDirection === 'horizontal'` |
| `showMaximize`, `showFold` | `canMaximize`, `canFold` |
| `onToggleMaximize`, `onToggleFold` | unchanged |

### React exports

| v1 | v2 |
|---|---|
| `useDynamixLayout` (31 values: refs, DnD handlers, setters) | a new headless [`useDynamixLayout`](./api/use-dynamix-layout.md), plus `useTabset`, `useTab`, `useSplitter`, `useLayoutState`, `useLayoutActions`, `useDragState` |
| `getTabOutput`, `TabInput`, `TabOutput`, `TabEntry`, `DivFC`, `useDynamixLayoutOptions` | removed |
| `DefaultWrapTabLabel`, `DefaultWrapTabHead`, … | `Tab`, `TabBar`, `TabContent`, `Panel`, `Splitter`, `DropIndicator`, `RootDropZone`, `TabsetToolbar` |
| `LayoutProps` | `DynamixLayoutProps` |
| `.DefaultWrapTabLabel` etc. CSS classes | `.dx-tab`, `.dx-tab-bar`, `.dx-tab-content`, `.dx-panel`, `.dx-splitter`, `.dx-drop-indicator`, `.dx-root-drop-zone` |
| `data-uid`, `data-type` | `data-dx-id`, `data-dx-slot` |
| `@dynamix-layout/react/dist/layout.css` (never existed) / `style.css` | `@dynamix-layout/react/styles.css` (`style.css` still works) |

### Core

| v1 | v2 |
|---|---|
| `new DynamixLayoutCore(options)` + statics `_root`, `_tree`, `_minW`, `_minH`, `_bond`, `_inst` | `createLayout(options)`, one independent instance each |
| `Node`, `Bond`, `Node.cache` | `layout.getSnapshot()` / `subscribe()` |
| `LayoutTree` | `LayoutJSON` (`LayoutTreeV1` describes the old shape) |
| `NodeOptions` | `TabsetState`, `SplitterState`, `TabState`, plus `snapshot.rects` |
| `Dimension { w, h, x, y }` | `Rect { x, y, width, height }` |
| `typNode`, `uidNode`, `nodName` | `type`, `id` (tabs: the tab's id, which was `nodName`) |
| `nodPart` | `weight` |
| `nodeDir` (boolean, inverted for tabsets) | `direction` on rows, `parentDirection` on tabsets |
| `nodDims` | `snapshot.rects.tabsets.get(id)` |
| `nodOpen` | `activeTabId` / `isActive` |
| `nodKids` | `children` / `tabIds` |
| `nodFold`, `nodMaxd` | `isFolded`, `maximizedTabsetId` / `isMaximized` |
| `nodHidden`, `nodLocked`, `nodFoldable`, `nodMaximizable` | `isHidden`, `isLocked`, `canFold`, `canMaximize` |
| `minW`, `minH` | `minPanelSize` |
| `bond` | `splitterSize` |
| `collapsedSize` | `foldedSize` |
| `tabs: string[]` | `tabs: { id, target? }[]` |
| `tree` | `initialLayout` |
| `updateDimension(dim, disableTimeout?, timeout?)` | `setContainerRect(rect)` |
| `updateSlider` / `updateSliderDimension` | `resizeSplitter(id, point)`, `moveSplitterBy(id, delta)`, or `startDrag` / `updateDrag` / `endDrag` |
| `updateTree(src, des, area)` | `moveTab(tabId, target)` / `moveTabset(tabsetId, target)`; `'contain'` is now `'center'` |
| `collapse` / `expand` / `toggleCollapse` | `fold` / `unfold` / `toggleFold` |
| `maximizedId` | `snapshot.maximizedTabsetId` |
| `DynamixLayoutCore._root.toJSON()` | `layout.toJSON()` |
| `clearAllCache()` | `destroy()` |
| `Queue`, `createReactiveState`, `areNodeOptions*Equal`, iterators, `insertNode*`, `removeKid`, … | removed (internal) |
| `getTabsetDropPreview`, `getNavbarDropPreview`, `getRootSplitPreview` | `layout.getDropTarget` + `layout.getDropIndicatorRect` |
| `setElementRect`, `placeTabbar`, `getTabbarPlacement`, `getTabBodyRect` | `applyRect`, `getTabBarPlacement`, `getTabContentRect` |
| console banner, `window.__DYNAMIX_LAYOUT__` | removed; `version` export |

## Behaviour changes

| Change | Why |
|---|---|
| `onLayoutChange` isn't called on mount, and receives `LayoutJSON` (`version: 2`). | Mount isn't a change; the new format has readable names and stable tab ids. |
| A tab in `tabs` that's missing from the saved layout is **added** (v1 silently left it out). A saved tab missing from `tabs` is **removed** (v1 showed a label with no content). | `tabs` is the single source of truth for which tabs exist. |
| Duplicate tab ids throw in development. | v1 merged their contents silently. |
| Dropping a tab in the middle of a panel **appends** it. | v1 inserted it before the last tab. |
| Splitting beside a folded tabset unfolds it. | v1 left the new row stuck at its minimum size. |
| Tab dragging uses pointer events (touch long-press, Escape cancels). HTML5 drag events on custom wrappers no longer fire; use `useDragState`. | Touch support, one drag model, no fake drag image. |
| Keyboard shortcuts act only when focus is inside the layout. | Several layouts on a page no longer all react. |
| The layout can sit anywhere on the page. | v1 placed content wrongly unless the layout was at the viewport's top-left. |
| Changing `tabs` updates the layout instead of rebuilding it. | v1 reset the layout to its initial state whenever `tabs` changed identity. |
| React 18 works; React 17 isn't supported. | The v1 bundle inlined React 19's JSX runtime. |

## `ref` and actions

```tsx
// v1: ref was the root div; there was no API to move or select tabs.
// v2:
const layout = useRef<DynamixLayoutHandle>(null)
<DynamixLayout tabs={tabs} ref={layout} />

layout.current?.element                    // the root div
layout.current?.moveTab('terminal', { type: 'root', position: 'bottom' })
layout.current?.selectTab('editor')
layout.current?.toggleMaximize('ts-editor')
```

Inside the layout, [`useLayoutActions()`](./api/use-layout-actions.md) gives the same actions without a ref.

## Core: before and after

```ts
// v1
import { DynamixLayoutCore, Node } from '@dynamix-layout/core'
const engine = new DynamixLayoutCore({ tabs: ['a', 'b'], tree: saved, minW: 40, minH: 40, bond: 10 })
engine.updateDimension({ x: 0, y: 0, w: 800, h: 600 }, true)
Node.cache.nodOpts.onChange((tabsets) => tabsets.forEach((t) => draw(t.uidNode, t.nodDims)))
engine.updateTree(tabUid, tabsetUid, 'contain')
const json = DynamixLayoutCore._root.toJSON()

// v2
import { createLayout } from '@dynamix-layout/core'
const layout = createLayout({ tabs: [{ id: 'a' }, { id: 'b' }], initialLayout: saved, minPanelSize: { width: 40, height: 40 }, splitterSize: 10 })
layout.setContainerRect({ x: 0, y: 0, width: 800, height: 600 })
layout.subscribe((s) => s.tabsets.forEach((t) => draw(t.id, s.rects.tabsets.get(t.id)!)))
layout.moveTab('a', { type: 'tabset', tabsetId: 'ts-b', position: 'center' })
const json = layout.toJSON()
```

## Solid

Solid keeps its v1 props and default components; it runs on the v2 core underneath. Changes:

- `updateJSON` receives `LayoutJSON`, and `layoutTree` accepts it (v1 trees still load).
- `getTabOutput` and the `TabEntry`/`TabInput`/`TabOutput` types are removed.
- `solid-js` is a peer dependency.
- The slider timeout options no longer have an effect.

## Saved layouts

You don't need to do anything: pass a v1 layout wherever a layout is accepted and it's migrated on load. To convert stored data once, for example so a backend can read it:

```ts
import { isLayoutV1, migrateLayoutFromV1 } from '@dynamix-layout/core'

for (const row of await db.layouts.all()) {
	if (isLayoutV1(row.data)) await db.layouts.update(row.id, { data: migrateLayoutFromV1(row.data) })
}
```

Migration keeps:
- tabset and row ids;
- weights, so proportions are identical;
- the active tab;
- folded and maximized state.

Tab ids become the v1 tab labels. Damaged layouts are repaired, and each repair is reported. See [`migrateLayoutFromV1`](./api/migrate-layout-from-v1.md#edge-cases) for every case.
