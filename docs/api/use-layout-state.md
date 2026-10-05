# `useLayoutState`

Reads part of the layout state from anywhere inside a layout, and re-renders only when that part changes.

```ts
function useLayoutState<T>(selector: (snapshot: LayoutSnapshot) => T, isEqual?: (a: T, b: T) => boolean): T
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `selector` | `(snapshot) => T` | required | Picks a value from the [snapshot](./create-layout.md#snapshots). |
| `isEqual` | `(a, b) => boolean` | `Object.is` | Decides whether the value changed. |

Snapshots share unchanged parts by reference: maps, entries and rects keep their identity until they change. So selecting an object, like `s.tabsets.get(id)`, re-renders only when that tabset changes. Built on `useSyncExternalStore`, so it's safe with concurrent rendering and SSR.

## Examples

```tsx
const activeTabId = useLayoutState((s) => s.tabsets.get(tabsetId)?.activeTabId)
const isMaximized = useLayoutState((s) => s.maximizedTabsetId !== null)
const tabCount = useLayoutState((s) => s.tabs.size)
```

Derived arrays need an `isEqual`, or they re-render on every change:

```tsx
const ids = useLayoutState(
	(s) => [...s.tabs.keys()],
	(a, b) => a.length === b.length && a.every((id, i) => id === b[i])
)
```

## Pitfalls

- **Don't select `s.rects`** unless you need positions. They change on every resize and drag frame.
- **It must be used inside a layout** (`<DynamixLayout>` or `<DynamixLayoutProvider>`).
