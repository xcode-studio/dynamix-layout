# `useDynamixLayout` and `DynamixLayoutProvider`

The headless layout. It gives you state, prop getters and actions, and you render every element yourself. [`<DynamixLayout>`](./dynamix-layout.md) is built on it.

```ts
function useDynamixLayout(options: UseDynamixLayoutOptions): UseDynamixLayoutResult
function DynamixLayoutProvider(props: { controller: LayoutController; children?: ReactNode }): ReactElement
```

## Options

Everything `<DynamixLayout>` accepts except `components`, `classNames`, `styles` and the root's HTML attributes, plus:

| Option | Type | Default | Description |
|---|---|---|---|
| `tabs` | `readonly HeadlessTabItem[]` | required | Like [`TabItem`](./dynamix-layout.md#tabitem), but `content` is optional: you render content yourself. |
| `id` | `string` | `useId()` | Prefix for the DOM ids used in ARIA relationships. |
| `defaultLayout`, `layout`, `onLayoutChange`, `onTabClose`, `minPanelSize`, `splitterSize`, `tabBarHeight`, `showTabBar`, `padding`, `allowMaximize`, `allowFold`, `maximizeOnDoubleClick`, `keyboardShortcuts`, `tabActivation`, `resizeThrottleMs` | | | Same as [`<DynamixLayout>`](./dynamix-layout.md#props). |

## Returns

| Field | Type | Stable? | Description |
|---|---|---|---|
| `controller` | `LayoutController` | yes | Pass to `<DynamixLayoutProvider>` so the other hooks work. |
| `getRootProps` | `PropGetter` | yes | Props for the root element: a ref (it observes the root's size), `position: relative`, keyboard shortcuts and focus tracking. |
| `tabsets` | `readonly TabsetState[]` | until the tabsets change | Each tabset's id, tab ids, active tab, fold and maximize state. Not affected by resizes or drag frames. |
| `splitters` | `readonly SplitterState[]` | until the splitters change | |
| `tabs` | `readonly TabState[]` | until the tabs change | Each tab's tabset and whether it's active and visible. |
| `tabIds` | `readonly string[]` | until the ids change | Tab ids in `tabs` order. **Render tab contents in this order:** it never changes when tabs move, so content never remounts. |
| `dropIndicator` | `{ target: DropTarget; props: SlotProps } \| null` | changes with the target | Present while a drag has a valid target. Spread `props` on an element. |
| `rootDropZones` | `readonly { side, isActive, props }[]` | changes with the drag | The four layout-edge targets, present while a tab or tabset is dragged. |
| `actions` | `LayoutActions` | yes | Same as [`useLayoutActions`](./use-layout-actions.md). |

**Positions are not part of the returned state.** The library writes `left`/`top`/`width`/`height` to the elements you spread its props on. That's why pointer moves and resizes never re-render your components; see [Performance](../guides/performance.md).

## Example

```tsx
import {
	DynamixLayoutProvider,
	useDynamixLayout,
	useSplitter,
	useTab,
	useTabset,
} from '@dynamix-layout/react'

function MyLayout({ tabs }: { tabs: HeadlessTabItem[] }) {
	const { controller, getRootProps, tabsets, splitters, tabIds, dropIndicator } = useDynamixLayout({ tabs })
	return (
		<DynamixLayoutProvider controller={controller}>
			<div {...getRootProps({ className: 'my-layout' })}>
				{tabsets.map((tabset) => <MyTabset key={tabset.id} tabsetId={tabset.id} />)}
				{tabIds.map((id) => <MyContent key={id} tabId={id} />)}
				{splitters.map((splitter) => <MySplitter key={splitter.id} splitterId={splitter.id} />)}
				{dropIndicator && <div {...dropIndicator.props} className="my-drop-indicator" />}
			</div>
		</DynamixLayoutProvider>
	)
}

function MyTabset({ tabsetId }: { tabsetId: string }) {
	const { tabset, getPanelProps, getTabBarProps } = useTabset(tabsetId)
	if (!tabset) return null
	return (
		<>
			<div {...getPanelProps({ className: 'my-panel' })} />
			<div {...getTabBarProps({ className: 'my-tab-bar' })}>
				{tabset.tabIds.map((id) => <MyTab key={id} tabId={id} />)}
			</div>
		</>
	)
}

function MyTab({ tabId }: { tabId: string }) {
	const { item, getTabProps } = useTab(tabId)
	return <button {...getTabProps({ className: 'my-tab' })}>{item?.title}</button>
}

function MyContent({ tabId }: { tabId: string }) {
	const { item, getTabContentProps } = useTab(tabId)
	return <div {...getTabContentProps()}>{item?.content}</div>
}

function MySplitter({ splitterId }: { splitterId: string }) {
	const { getSplitterProps } = useSplitter(splitterId)
	return <div {...getSplitterProps({ className: 'my-splitter' })} />
}
```

The full working version is in [`examples/react/src/examples/HeadlessExample.tsx`](../../examples/react/src/examples/HeadlessExample.tsx).

## Prop getters

Every `getXProps(props?)` merges your props with the library's:

- `className`s are joined;
- `style`s are merged, with positioning applied last;
- `ref`s are combined;
- for event handlers, yours runs first. Call `event.preventDefault()` in it to skip the library's handler.

Every other prop the library sets (ARIA, `data-*`, `id`, `tabIndex`) wins, so accessibility stays correct.

Headless layouts work without the stylesheet: positioned elements get `position: absolute` and the `hidden` attribute inline. Import `styles.css` for the default look, or the `[data-dx-hidden] { display: none !important }` rule if your elements set their own `display`.

## Pitfalls

- **The hooks need the provider.** Without it they throw: `` `useTab` must be used inside <DynamixLayout> or <DynamixLayoutProvider>. ``
- **Render each tab's content once,** as a direct child of the root, in `tabIds` order, not inside its tabset. The library positions it over the right panel.
- **Spread the prop getters' props, and keep their `ref`.** Without the ref, an element can't be positioned or measured.
