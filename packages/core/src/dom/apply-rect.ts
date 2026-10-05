import type { Rect } from '../model/types'

/**
 * Positions an absolutely positioned element. Adapters use this on their fast
 * path (drags), so pointer moves never need a framework re-render.
 * @param element - An absolutely positioned element inside the layout root.
 * @param rect - Where to put it, in layout-root coordinates.
 * @example
 * layout.subscribe((s) => s.rects.tabsets.forEach((rect, id) => applyRect(panels.get(id)!, rect)))
 */
export function applyRect(element: HTMLElement, rect: Rect): void {
	const { style } = element
	style.left = `${rect.x}px`
	style.top = `${rect.y}px`
	style.width = `${rect.width}px`
	style.height = `${rect.height}px`
}
