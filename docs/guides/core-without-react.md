# Using the core without React

`@dynamix-layout/core` holds all the layout logic and has no dependencies. An adapter for another framework, or a vanilla app, does five things:

1. **Create** an instance: `createLayout({ tabs, initialLayout, onLayoutChange })`.
2. **Measure** the container and call `setContainerRect`, again on every resize.
3. **Render** from snapshots: `subscribe((snapshot) => …)`.
4. **Translate input** into actions: clicks, drags and keys.
5. **Clean up** with `destroy()`.

```ts
import {
	createLayout,
	createFrameScheduler,
	getTabBarPlacement,
	getTabContentRect,
	type LayoutSnapshot,
} from '@dynamix-layout/core'

const TAB_BAR = 36
const root = document.querySelector<HTMLElement>('#layout')!
const layout = createLayout({
	tabs: [{ id: 'editor' }, { id: 'terminal' }, { id: 'preview' }],
	foldedSize: TAB_BAR,
	minPanelSize: { width: 80, height: TAB_BAR },
	onLayoutChange: (json) => localStorage.setItem('layout', JSON.stringify(json)),
})

// 2. Measure. Rects are relative to the root's padding box.
const measure = () => layout.setContainerRect({ x: 0, y: 0, width: root.clientWidth, height: root.clientHeight })
const resizeFrame = createFrameScheduler<null>(measure)
new ResizeObserver(() => resizeFrame.schedule(null)).observe(root)
measure()

// 3. Render.
layout.subscribe(render)
render(layout.getSnapshot())

function render(snapshot: LayoutSnapshot) {
	for (const [id, tabset] of snapshot.tabsets) {
		const rect = snapshot.rects.tabsets.get(id)!
		const bar = getTabBarPlacement(rect, tabset, TAB_BAR) // rotated when folded side by side
		drawTabBar(id, bar.rect, bar.isRotated, tabset.tabIds, tabset.activeTabId, tabset.isHidden)
	}
	for (const [id, tab] of snapshot.tabs) {
		const tabsetRect = snapshot.rects.tabsets.get(tab.tabsetId)!
		positionContent(id, getTabContentRect(tabsetRect, TAB_BAR), tab.isVisible)
	}
	for (const [id, splitter] of snapshot.splitters) drawSplitter(id, snapshot.rects.splitters.get(id)!, splitter)
	drawIndicator(snapshot.drag?.indicator ?? null)
}
```

## Input

Coordinates passed to the engine are relative to the root: `clientX - rootBox.left - root.clientLeft`.

**Splitters:**

```ts
splitterEl.addEventListener('pointerdown', (event) => {
	if (!layout.startDrag({ type: 'splitter', splitterId })) return // locked or maximized
	splitterEl.setPointerCapture(event.pointerId)
	const frame = createFrameScheduler((p: Point) => layout.updateDrag(p))
	const move = (e: PointerEvent) => frame.schedule(toRoot(e))
	const up = () => {
		frame.flush()
		layout.endDrag() // one onLayoutChange
		splitterEl.removeEventListener('pointermove', move)
	}
	splitterEl.addEventListener('pointermove', move)
	splitterEl.addEventListener('pointerup', up, { once: true })
})
```

**Tabs:**

1. On drag start, measure the tab bars (`DropMeasurements`: each tab bar's rect and its tabs' rects) and call `startDrag({ type: 'tab', tabId })`.
2. On move, call `updateDrag(point, measurements)`; `snapshot.drag.target` and `snapshot.drag.indicator` follow the pointer.
3. On release, call `endDrag()`. Escape calls `cancelDrag()`.

Without measurements, drops onto tab bars aren't available, but panels and layout edges still work.

**Everything else** maps to one call each:
- `selectTab(id)` on click;
- `toggleMaximize(tabsetId)` and `toggleFold(tabsetId)`;
- `moveSplitterBy(id, ±10)` for arrow keys;
- `listDropTargets(source)` and `setDragTarget(target)` for a keyboard move mode.

## Rendering tips

- **Render each tab's content once** and position it with `getTabContentRect`. Never move content between parents; iframes reload when moved.
- **Snapshots share unchanged parts by reference**, so compare with `===` to skip work: unchanged `rects.tabsets.get(id)` objects mean that tabset didn't move.
- **A rotated tab bar** (`isRotated`) is an element `rect.width` wide and `rect.height` tall, rotated 90° around its top-left corner (`transform-origin: 0 0`). It covers the folded strip.
- **Hidden tabsets** (`isHidden`, while another tabset is maximized) should stay mounted but invisible.

The [Solid adapter](../../packages/solid/src/hooks/useLayout.ts) is a complete example in about 250 lines.
