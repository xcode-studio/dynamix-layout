# `useDragState`

The drag in progress, or `null`.

```ts
function useDragState(): DragState | null

interface DragState {
	source: { type: 'tab'; tabId: string } | { type: 'tabset'; tabsetId: string } | { type: 'splitter'; splitterId: string }
	target: DropTarget | null   // where it would land; null over nothing valid
	indicator: Rect | null      // the drop indicator rect, in layout-root coordinates
}
```

It changes when a drag starts or ends, or when the target changes, not on every pointer move. Use it for drag feedback, such as dimming the source or showing a "drop here" hint. Tab drags themselves are started by `useTab().getTabProps` and `useTabset().getTabBarProps`.

```tsx
function DragHint() {
	const drag = useDragState()
	if (!drag || drag.source.type === 'splitter') return null
	return <div className="hint">{drag.target ? 'Release to drop' : 'Drag onto a panel'}</div>
}
```
