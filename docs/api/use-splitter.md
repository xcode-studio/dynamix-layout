# `useSplitter`

State and prop getters for one splitter.

```ts
function useSplitter(splitterId: string): UseSplitterResult
```

## Returns

| Field | Type | Description |
|---|---|---|
| `splitter` | `SplitterState \| undefined` | `id`, `rowId`, `direction`, `beforeId`, `afterId`, `isLocked` (next to a folded tabset), `isHidden` (while maximized). |
| `isDragging` | `boolean` | Being dragged. |
| `direction` | `'horizontal' \| 'vertical' \| undefined` | Direction of the row it divides. A `horizontal` row has a vertical bar. |
| `value`, `min`, `max` | `number` | The size of the panel before the splitter and its limits, in px, **as of the last render**. They aren't reactive, because they change on every drag frame. |
| `getSplitterProps` | `PropGetter` | Described below. |

`getSplitterProps` gives the element:

- `role="separator"` and `aria-orientation`;
- `aria-valuenow`, `aria-valuemin` and `aria-valuemax` as percentages, kept current by the library;
- `aria-controls` and an `aria-label` built from the neighbours' active tabs;
- `tabIndex`, plus `data-dx-direction` and `data-dx-locked`;
- dragging with pointer events, and resizing with arrow keys, Home and End.

## Example

```tsx
function Splitter({ splitterId }: { splitterId: string }) {
	const { isDragging, getSplitterProps } = useSplitter(splitterId)
	return <div {...getSplitterProps({ className: isDragging ? 'splitter dragging' : 'splitter' })} />
}
```

## Pitfalls

- **Give it a cursor and `touch-action: none`** (`styles.css` does): `ew-resize` for `data-dx-direction="horizontal"`, `ns-resize` for vertical.
- **Locked splitters can't be dragged.** Unfold the folded neighbour first.
