# `useTabset`

State and prop getters for one tabset.

```ts
function useTabset(tabsetId: string): UseTabsetResult
```

## Returns

| Field | Type | Description |
|---|---|---|
| `tabset` | `TabsetState \| undefined` | `id`, `tabIds`, `activeTabId`, `parentDirection`, `isFolded`, `isMaximized`, `isHidden`, `canFold`, `canMaximize`. `undefined` once the tabset no longer exists. |
| `isRotated` | `boolean` | The tab bar is drawn as a vertical strip (folded in a side-by-side row). |
| `getPanelProps` | `PropGetter` | The tabset's box, positioned by the library. Put backgrounds and borders here. |
| `getTabBarProps` | `PropGetter` | `role="tablist"` and `aria-orientation`. Dragging its background moves the whole tabset, and double-clicking it maximizes. It carries `data-dx-folded`, `data-dx-maximized`, `data-dx-rotated` and `data-dx-hidden`. |
| `toggleMaximize()` | `() => void` | Stable. |
| `toggleFold()` | `() => void` | Stable. |

Re-renders when this tabset's state changes (its tabs, active tab, fold or maximize), not on resizes or drags.

## Example

```tsx
function Tabset({ tabsetId }: { tabsetId: string }) {
	const { tabset, getPanelProps, getTabBarProps, toggleMaximize } = useTabset(tabsetId)
	if (!tabset) return null
	return (
		<>
			<div {...getPanelProps({ className: 'panel' })} />
			<div {...getTabBarProps({ className: 'tab-bar' })}>
				{tabset.tabIds.map((id) => <Tab key={id} tabId={id} />)}
				<button onClick={toggleMaximize}>{tabset.isMaximized ? 'Restore' : 'Maximize'}</button>
			</div>
		</>
	)
}
```

## Pitfalls

- **The tab bar is rotated with `transform: rotate(90deg)`** when `isRotated` is true; keep `transform-origin: 0 0` (as in `styles.css`) if you style it.
- **Buttons inside the tab bar don't start tabset drags,** and neither do tabs, links or inputs.
