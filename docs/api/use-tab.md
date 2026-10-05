# `useTab`

State and prop getters for one tab: its button in the tab bar and its content.

```ts
function useTab(tabId: string): UseTabResult
```

## Returns

| Field | Type | Description |
|---|---|---|
| `tab` | `TabState \| undefined` | `id`, `tabsetId`, `isActive`, `isVisible`. |
| `item` | `HeadlessTabItem \| undefined` | The item you passed in `tabs` (`title`, `content`, `closable`, …). |
| `isActive` | `boolean` | Shown in its tabset. |
| `isDragging` | `boolean` | Being dragged. |
| `select()` | `() => void` | Stable. |
| `close()` | `() => void` | Stable. Calls `onTabClose` when the tab is closable. |
| `getTabProps` | `PropGetter` | `role="tab"`, `id`, `aria-selected`, `aria-controls`, roving `tabIndex`, `data-state="active\|inactive"`. Click selects, dragging moves the tab, and keys follow the [tabs pattern](../guides/accessibility.md). |
| `getTabContentProps` | `PropGetter` | `role="tabpanel"`, `aria-labelledby`, positioned over the tabset and hidden while inactive. |

Re-renders when this tab's state or its item changes.

## Example

```tsx
function Tab({ tabId }: { tabId: string }) {
	const { item, isActive, close, getTabProps } = useTab(tabId)
	return (
		<div {...getTabProps({ className: isActive ? 'tab active' : 'tab' })}>
			{item?.title}
			{item?.closable && <button tabIndex={-1} onPointerDown={(e) => e.stopPropagation()} onClick={close}>×</button>}
		</div>
	)
}
```

## Pitfalls

- **Stop `pointerdown` on buttons inside a tab,** or pressing them starts a tab drag.
- **Render content with `getTabContentProps` once per tab,** not inside the tab bar. See [`useDynamixLayout`](./use-dynamix-layout.md#pitfalls).
