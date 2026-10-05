# Custom tab and splitter components

`<DynamixLayout>` renders every part through a **slot component** you can replace with `components`:

| Slot | Default | Receives (besides DOM props) |
|---|---|---|
| `Panel` | `<div>` behind the tabset | `tabset` |
| `TabBar` | `<div role="tablist">` | `tabset`, `isRotated`, `children` (tabs and the toolbar) |
| `Tab` | title, plus a close button when closable | `tab` (your item), `isActive`, `isDragging`, `onClose?`, `closeButtonProps?` |
| `TabContent` | `<div role="tabpanel">` | `tab`, `isActive`, `children` (the content) |
| `Splitter` | a bar with a CSS grip | `splitter`, `isDragging` |
| `DropIndicator` | a highlighted box | `target` |
| `RootDropZone` | a handle on each layout edge, shown while dragging | `side`, `isActive` |
| `TabsetToolbar` | maximize and fold buttons | `tabset`, `isRotated`, `canMaximize`, `canFold`, `onToggleMaximize`, `onToggleFold`, `className`, `style`, `buttonClassName`, `buttonStyle` |

The DOM props contain everything that makes the part work: ARIA attributes, `data-*` state, event handlers, the positioning `style`, and a `ref`. **Spread them on your root element and forward the `ref`.** Destructure the state props first, so they don't reach the DOM.

## A custom tab

```tsx
import { forwardRef, type Ref } from 'react'
import { DynamixLayout, type TabProps } from '@dynamix-layout/react'

const MyTab = forwardRef<HTMLElement, TabProps>(function MyTab(
	{ tab, isActive, isDragging, onClose, closeButtonProps, className, ...props },
	ref
) {
	return (
		<div
			ref={ref as Ref<HTMLDivElement>}
			{...props}
			className={`${className} my-tab ${isActive ? 'my-tab--active' : ''} ${isDragging ? 'my-tab--dragging' : ''}`}
		>
			<Icon name={tab.id} />
			{tab.title ?? tab.id}
			{onClose && closeButtonProps && <button {...closeButtonProps}>×</button>}
		</div>
	)
})

<DynamixLayout tabs={tabs} components={{ Tab: MyTab }} />
```

`closeButtonProps` stops the press from starting a drag, labels the button, and calls `onTabClose`. Use it for your close button.

## A custom splitter

```tsx
const MySplitter = forwardRef<HTMLDivElement, SplitterProps>(function MySplitter(
	{ splitter, isDragging, className, ...props },
	ref
) {
	return (
		<div ref={ref} {...props} className={`${className} my-splitter`} data-dragging={isDragging || undefined}>
			<GripIcon rotate={splitter.direction === 'vertical'} />
		</div>
	)
})
```

The default stylesheet draws a grip with `.dx-splitter::after`. Add `after:hidden` (Tailwind) or `.my-splitter::after { display: none }` if you draw your own.

## React 18 and 19

Slot components must forward `ref`. On React 18 that means `forwardRef`, as above. On React 19 you can take `ref` as a regular prop instead.

## When to use the headless hooks instead

Use `components` when the default structure is fine and you only want different markup or behaviour inside a part. To change the structure itself, such as tab bars below the content or a single shared tab bar, use [`useDynamixLayout`](../api/use-dynamix-layout.md) and render everything yourself.

A complete example with shadcn-style tabs is in [`examples/react/src/components/wrapper.tsx`](../../examples/react/src/components/wrapper.tsx).
