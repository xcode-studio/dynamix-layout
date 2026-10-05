# Getting started

This guide uses React. The concepts are the same in [Solid](../packages/solid/README.md) and in the [core without a framework](./guides/core-without-react.md).

## Concepts

A layout is a **tree**:

- A **tab** is one of your views, such as an editor, a terminal or a preview. You give each tab a stable `id`.
- A **tabset** is a group of tabs that shows one at a time, with a **tab bar** on top. It's drawn inside a **panel**.
- A **row** lays out its children (tabsets or more rows) side by side (`horizontal`) or stacked (`vertical`). Rows nest with alternating directions. The root is a row.
- A **splitter** sits between two neighbours in a row. Dragging it resizes those two and nothing else.

Each row and tabset has a **weight**. A row gives every child its minimum size, then shares the remaining space in proportion to the weights, like CSS `flex-grow`. Splitter drags change the weights, which is why a saved layout keeps its proportions in any window size.

Users change the tree by:

- **dragging a tab** onto another tab bar (to join it), onto a panel's side (to split it), or onto an edge of the layout;
- **dragging a tab bar** to move a whole tabset;
- **dragging splitters**;
- **maximizing** a tabset over the whole layout, or **folding** it to a strip. Both restore the exact previous size.

The tree is plain JSON ([`LayoutJSON`](./api/layout-json.md)) that you can save and restore.

## The first layout

```bash
npm install @dynamix-layout/react
```

```tsx
import { DynamixLayout, type TabItem } from '@dynamix-layout/react'
import '@dynamix-layout/react/styles.css'

const tabs: TabItem[] = [
	{ id: 'editor', title: 'Editor', content: <Editor /> },
	{ id: 'terminal', title: 'Terminal', content: <Terminal /> },
	{ id: 'preview', title: 'Preview', content: <Preview /> },
]

export function App() {
	return (
		<div style={{ height: '100vh' }}>
			<DynamixLayout tabs={tabs} />
		</div>
	)
}
```

- **The layout fills its parent.** Give the parent a height. It follows the parent's size with a `ResizeObserver`, so sidebars and flex layouts work.
- **Without a saved layout,** every tab gets its own tabset, arranged as `editor | (terminal / preview)`.
- **Tab ids must be unique and stable.** They identify tabs in saved layouts. Duplicate ids throw in development.
- **Content is mounted once** and is never remounted when tabs move, so editors, terminals and iframes keep their state.

## Saving and restoring

`onLayoutChange` is called after every change the user commits: a drop, a splitter release, selecting a tab, maximize or fold, and tabs being added or removed. It isn't called on mount or for each pointer move. Store what it gives you and pass it back as `defaultLayout`:

```tsx
const STORAGE_KEY = 'my-app:layout'

export function App() {
	const [saved] = useState(() => {
		const json = localStorage.getItem(STORAGE_KEY)
		return json ? JSON.parse(json) : undefined
	})
	return (
		<div style={{ height: '100vh' }}>
			<DynamixLayout
				tabs={tabs}
				defaultLayout={saved}
				onLayoutChange={(layout) => localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))}
			/>
		</div>
	)
}
```

The saved layout and `tabs` don't have to match:

- A tab in `tabs` that's missing from the saved layout (a feature you shipped since) is added to the first tabset.
- A tab in the saved layout that's missing from `tabs` is removed.

Layouts saved by v1 are migrated automatically; see [Persisting layouts](./guides/persisting-layouts.md).

## Adding, closing and selecting tabs

`tabs` is the list of open tabs. Add an item to open a tab, and remove it to close one. A new tab opens in the tabset the user last used, or where its `target` says:

```tsx
const [tabs, setTabs] = useState<TabItem[]>(initialTabs)

const openFile = (path: string) =>
	setTabs((current) => [...current, { id: path, title: basename(path), content: <Editor path={path} />, closable: true }])

<DynamixLayout
	tabs={tabs}
	onTabClose={(id) => setTabs((current) => current.filter((tab) => tab.id !== id))}
/>
```

To control the layout from code, use the `ref` handle ([`DynamixLayoutHandle`](./api/dynamix-layout.md#imperative-handle)) or [`useLayoutActions`](./api/use-layout-actions.md):

```tsx
const layout = useRef<DynamixLayoutHandle>(null)
layout.current?.moveTab('terminal', { type: 'root', position: 'bottom' })
layout.current?.selectTab('preview')
```

## Next steps

- Restyle it: [Theming](./guides/theming.md), or replace parts with [custom components](./guides/custom-components.md).
- Build a completely custom UI with the [headless hooks](./api/use-dynamix-layout.md).
- Render on the server: [Next.js and SSR](./guides/nextjs-and-ssr.md).
- Keyboard users: [Keyboard and accessibility](./guides/accessibility.md).
