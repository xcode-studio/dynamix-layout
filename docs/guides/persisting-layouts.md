# Persisting layouts

A layout is plain JSON ([`LayoutJSON`](../api/layout-json.md)). Save it from `onLayoutChange` and pass it back on the next visit.

## Uncontrolled (most apps)

`defaultLayout` is read once; after that the component owns the layout.

```tsx
const STORAGE_KEY = 'my-app:layout'

function load(): LayoutJSON | undefined {
	try {
		const json = localStorage.getItem(STORAGE_KEY)
		return json ? JSON.parse(json) : undefined
	} catch {
		return undefined
	}
}

export function Workspace() {
	const [saved] = useState(load)
	return (
		<DynamixLayout
			tabs={tabs}
			defaultLayout={saved}
			onLayoutChange={(layout) => localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))}
		/>
	)
}
```

**When `onLayoutChange` is called:**
- after a drop (`'move'`);
- when a splitter is released, or moved with the keyboard (`'resize'`);
- when a tab is selected (`'select'`);
- when a tabset is folded (`'fold'`) or maximized (`'maximize'`);
- when tabs are added or removed (`'tabs'`);
- after `reset()` (`'reset'`).

**When it isn't called:**
- on mount;
- on container resizes, since weights are proportions and resizing doesn't change the JSON;
- for each frame of a drag.

Saving on every call is fine. If you persist to a server, debounce it.

## Controlled mode

Pass `layout` and update it from `onLayoutChange`. The layout always shows what you pass:

```tsx
const [layout, setLayout] = useState<LayoutJSON | undefined>(load)

<DynamixLayout
	tabs={tabs}
	layout={layout}
	onLayoutChange={(next) => {
		setLayout(next)
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
	}}
/>
```

- **Changes you don't store are reverted.** A change that `onLayoutChange` doesn't store is undone before the next paint. You can also store a modified copy.
- **You can replace the layout at any time,** for example to switch between saved workspaces: set `layout` to another `LayoutJSON`, or a v1 tree.
- **Drag frames are not changes.** A splitter drag moves freely and is reported once, on release.

The [controlled example](../../examples/react/src/examples/ControlledExample.tsx) persists to localStorage and adds and closes tabs.

## Saved layouts and the `tabs` you pass

Apps change; a saved layout can mention tabs you no longer have, and miss new ones:

- tabs in `tabs` but not in the saved layout are **added** to the first tabset;
- tabs in the saved layout but not in `tabs` are **removed**.

Tabs are matched by `id`, so keep ids stable across releases.

## Layouts saved by v1

v1 saved a different shape (`{ typNode, nodName, nodKids, … }`). Pass it to `defaultLayout`, `layout` or `load()` as it is: it's migrated automatically and renders the same. In development you'll see a one-time warning suggesting you save it again. To convert stored layouts in bulk, use [`migrateLayoutFromV1`](../api/migrate-layout-from-v1.md).

## Validation

Saved data can be corrupted or hand-edited. Repairable problems are fixed and reported through `onWarning` (core) or `console.warn` (development). These include invalid weights, an unknown active tab, duplicate tabs and empty nodes. Unusable input (not a layout, or an unknown `version`) throws a `DynamixLayoutError` with the path of the problem. If you load untrusted data, catch it:

```tsx
function safeLayout(json: unknown) {
	try {
		createLayout({ tabs: [], initialLayout: json as LayoutJSON }) // validate only
		return json as LayoutJSON
	} catch {
		return undefined
	}
}
```
