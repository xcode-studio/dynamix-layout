# `<DynamixLayout>`

A docking layout: tabs in tabsets, split by draggable splitters, with tab drag-and-drop, maximize and fold. Built on [`useDynamixLayout`](./use-dynamix-layout.md).

```tsx
import { DynamixLayout } from '@dynamix-layout/react'
import '@dynamix-layout/react/styles.css'
```

## Signature

```ts
const DynamixLayout: ForwardRefExoticComponent<DynamixLayoutProps & RefAttributes<DynamixLayoutHandle>>
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tabs` | `readonly TabItem[]` | required | The open tabs. See [`TabItem`](#tabitem). |
| `defaultLayout` | `LayoutJSON \| LayoutTreeV1` | default layout | Uncontrolled: the initial layout. Later changes are ignored. |
| `layout` | `LayoutJSON \| LayoutTreeV1` | | Controlled: the layout to show. Update it from `onLayoutChange`. |
| `onLayoutChange` | `(layout: LayoutJSON, details: { reason: LayoutChangeReason }) => void` | | After every committed change. `reason` is `'move'`, `'resize'`, `'select'`, `'fold'`, `'maximize'`, `'tabs'` or `'reset'`. Not called on mount, on container resize, or during a drag. |
| `onTabClose` | `(tabId: string) => void` | | Called by a closable tab's close button and the Delete key. Remove the tab from `tabs` to close it. |
| `minPanelSize` | `{ width: number; height: number }` | `{ width: 40, height: 40 }` | Smallest tabset size. The height is never less than `tabBarHeight`. |
| `splitterSize` | `number` | `10` | Splitter thickness, in px. |
| `tabBarHeight` | `number` | `40` | Tab bar height, and the size of a folded strip. |
| `showTabBar` | `boolean` | `true` | Hiding the tab bar also disables folding. |
| `padding` | `number \| { top?, right?, bottom?, left? }` | `0` | Space between the root's edge and the layout, in px. |
| `allowMaximize` | `boolean` | `true` | Shows the maximize button, and enables double-click and the shortcut. |
| `allowFold` | `boolean` | `true` | Shows the fold button and enables the shortcut. |
| `maximizeOnDoubleClick` | `boolean` | `true` | Double-click a tab bar to maximize or restore. |
| `keyboardShortcuts` | `boolean` | `true` | Alt/Option + "+" maximizes and Alt/Option + "-" folds the focused tabset. |
| `tabActivation` | `'automatic' \| 'manual'` | `'automatic'` | Arrow keys select tabs as they move focus (`automatic`), or only move focus (`manual`; Enter or Space selects). |
| `resizeThrottleMs` | `number` | `0` | Throttle for container resizes; `0` means once per animation frame. |
| `components` | `Partial<LayoutComponents>` | | Replace any slot component. See [custom components](../guides/custom-components.md). |
| `classNames` | `Partial<Record<LayoutSlot, string>>` | | Extra class names, by slot. |
| `styles` | `Partial<Record<LayoutSlot, CSSProperties>>` | | Extra styles, by slot. Positioning styles always win. |
| `id`, `className`, `style`, `aria-*`, `on*`, … | `HTMLAttributes<HTMLDivElement>` | | Passed to the root `<div>`. `id` also prefixes the DOM ids used for ARIA. |

Slots (`LayoutSlot`): `root`, `panel`, `tabBar`, `tab`, `activeTab`, `tabClose`, `tabContent`, `splitter`, `dropIndicator`, `rootDropZone`, `toolbar`, `toolbarButton`.

### `TabItem`

| Field | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | required | Unique and stable; saved layouts store it. |
| `title` | `ReactNode` | `id` | The tab's label. Text titles are also used in ARIA labels. |
| `content` | `ReactNode` | required | Rendered once, kept mounted while the tab exists. |
| `closable` | `boolean` | `false` | Shows a close button; closing calls `onTabClose`. |
| `target` | `DropTarget` | last active tabset | Where the tab goes the first time it appears. |

## Imperative handle

`ref` gives a `DynamixLayoutHandle`. Every function is stable:

| Member | Description |
|---|---|
| `element` | The root `<div>`, or `null` before mount. |
| `moveTab(tabId, target)` / `moveTabset(tabsetId, target)` | Move to a [`DropTarget`](./create-layout.md#droptarget). Return `true` when something moved. |
| `selectTab(tabId)` | Make a tab active. |
| `focusTab(tabId)` | Move keyboard focus to a tab. |
| `maximize(tabsetId)`, `restore()`, `toggleMaximize(tabsetId)` | Maximize a tabset over the whole layout, and restore. |
| `fold(tabsetId)`, `unfold(tabsetId)`, `toggleFold(tabsetId)` | Fold a tabset to a strip, and unfold. |
| `reset()` | Back to `defaultLayout`, or the default layout of the current tabs. |
| `toJSON()` | The current [`LayoutJSON`](./layout-json.md). |
| `getSnapshot()` | The current [snapshot](./create-layout.md#snapshots). |

There is no `addTab`/`removeTab` on the handle: change `tabs` instead. `tabs` is the single source of truth for which tabs exist.

## Examples

**Persisted, with custom tabs and theming:**

```tsx
<DynamixLayout
	tabs={tabs}
	defaultLayout={saved}
	onLayoutChange={(layout) => save(layout)}
	minPanelSize={{ width: 120, height: 80 }}
	splitterSize={6}
	tabBarHeight={36}
	padding={8}
	components={{ Tab: MyTab }}
	classNames={{ tab: 'my-tab', activeTab: 'is-active', splitter: 'my-splitter' }}
	styles={{ tabBar: { background: '#111' } }}
/>
```

**Controlled** ([guide](../guides/persisting-layouts.md#controlled-mode)):

```tsx
const [layout, setLayout] = useState<LayoutJSON>()
<DynamixLayout tabs={tabs} layout={layout} onLayoutChange={setLayout} />
```

**Driving it from code:**

```tsx
const ref = useRef<DynamixLayoutHandle>(null)
<DynamixLayout tabs={tabs} ref={ref} />
// later
ref.current?.moveTab('terminal', { type: 'root', position: 'bottom' })
```

## Common pitfalls

- **Nothing shows.** The layout fills its parent, so the parent needs a height.
- **Unstyled layout.** Import `@dynamix-layout/react/styles.css` once.
- **A tab didn't close.** Closing calls `onTabClose`; the tab stays until you remove it from `tabs`.
- **Ids must be unique and stable.** Changing a tab's id is a remove plus an add, so its content remounts. Changing only `title` or `content` is cheap and doesn't touch the layout.
- **Controlled mode reverts changes you don't store.** If `onLayoutChange` doesn't update `layout`, the user's change is undone. Use `defaultLayout` if you only want to observe changes.
- **Custom slot components must forward `ref`** (`forwardRef` on React 18).
