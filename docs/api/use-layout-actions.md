# `useLayoutActions`

Layout actions from anywhere inside a layout. The object and every function in it keep their identity for the layout's lifetime, so they're safe in effect dependencies and memoized callbacks.

```ts
function useLayoutActions(): LayoutActions
```

| Action | Description |
|---|---|
| `moveTab(tabId, target)` | Move a tab to a [`DropTarget`](./create-layout.md#droptarget). Returns `true` if it moved. |
| `moveTabset(tabsetId, target)` | Move a whole tabset. |
| `selectTab(tabId)` | Make a tab active. |
| `maximize(tabsetId)`, `restore()`, `toggleMaximize(tabsetId)` | Maximize over the whole layout, and restore. |
| `fold(tabsetId)`, `unfold(tabsetId)`, `toggleFold(tabsetId)` | Fold to a strip, and unfold. |
| `reset()` | Back to the initial layout. |
| `toJSON()` | The current [`LayoutJSON`](./layout-json.md). |
| `getSnapshot()` | The current snapshot (doesn't subscribe). |

Actions return `false` instead of throwing when they're refused (for example, moving the only tabset) or when the id is unknown (with a development warning).

## Example

```tsx
function OpenInSplit({ tabId }: { tabId: string }) {
	const { moveTab, selectTab } = useLayoutActions()
	return (
		<button onClick={() => { moveTab(tabId, { type: 'root', position: 'right' }); selectTab(tabId) }}>
			Open to the side
		</button>
	)
}
```
