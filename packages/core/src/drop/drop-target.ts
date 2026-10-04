import type { LayoutRects } from '../geometry/compute-rects'
import type { DropTarget, LayoutModel, Point, Rect, Side } from '../model/types'
import { collectTabsets } from '../tree/find'
import { canMove, type MoveSource } from '../tree/move'

/** A tab bar and its tabs as rendered, in layout-root coordinates. */
export interface TabBarMeasurement {
	readonly rect: Rect
	/** Drawn as a rotated strip (a folded tabset in a side-by-side row). */
	readonly isRotated?: boolean
	readonly tabs: readonly { readonly id: string; readonly rect: Rect }[]
}

/** Tab bar geometry the engine can't know (label widths), keyed by tabset id. */
export interface DropMeasurements {
	readonly tabBars: ReadonlyMap<string, TabBarMeasurement>
}

/** Size of the root-edge drop zones (v1 `RootSplitterHoverEl`). */
export interface RootDropZoneOptions {
	/** Share of the edge the zone covers. @default 0.25 */
	readonly length?: number
	/** Thickness in px. @default 8 */
	readonly thickness?: number
}

const SIDES: readonly Side[] = ['left', 'right', 'top', 'bottom']

const contains = (rect: Rect, point: Point) =>
	point.x >= rect.x &&
	point.x <= rect.x + rect.width &&
	point.y >= rect.y &&
	point.y <= rect.y + rect.height

/** Rect of the drop zone on one edge of the layout, centred on that edge. */
export function getRootDropZoneRect(
	container: Rect,
	side: Side,
	options: RootDropZoneOptions = {}
): Rect {
	const { length = 0.25, thickness = 8 } = options
	const { x, y, width, height } = container
	switch (side) {
		case 'left':
			return {
				x,
				y: y + (height * (1 - length)) / 2,
				width: thickness,
				height: height * length,
			}
		case 'right':
			return {
				x: x + width - thickness,
				y: y + (height * (1 - length)) / 2,
				width: thickness,
				height: height * length,
			}
		case 'top':
			return {
				x: x + (width * (1 - length)) / 2,
				y,
				width: width * length,
				height: thickness,
			}
		case 'bottom':
			return {
				x: x + (width * (1 - length)) / 2,
				y: y + height - thickness,
				width: width * length,
				height: thickness,
			}
	}
}

/** Thirds of a tabset: the outer thirds drop beside it, the middle into it. */
export function getTabsetDropPosition(
	rect: Rect,
	point: Point
): Side | 'center' {
	const x = point.x - rect.x
	const y = point.y - rect.y
	if (x < rect.width / 3) return 'left'
	if (x > (2 * rect.width) / 3) return 'right'
	if (y < rect.height / 3) return 'top'
	if (y > (2 * rect.height) / 3) return 'bottom'
	return 'center'
}

/** The tab a pointer over a tab bar would insert next to. */
function getTabBarTarget(
	tabs: readonly { readonly id: string; readonly rect: Rect }[],
	point: Point
): DropTarget | null {
	if (tabs.length === 0) return null
	const last = tabs[tabs.length - 1]
	if (point.x > last.rect.x + last.rect.width)
		return { type: 'tab', tabId: last.id, position: 'after' }
	if (point.x < tabs[0].rect.x)
		return { type: 'tab', tabId: tabs[0].id, position: 'before' }

	let closest = tabs[0]
	let distance = Infinity
	for (const tab of tabs) {
		const center = tab.rect.x + tab.rect.width / 2
		if (Math.abs(point.x - center) < distance) {
			distance = Math.abs(point.x - center)
			closest = tab
		}
	}
	const center = closest.rect.x + closest.rect.width / 2
	return {
		type: 'tab',
		tabId: closest.id,
		position: point.x < center ? 'before' : 'after',
	}
}

/**
 * Where a drag source would land at `point`, or `null` when nothing valid is
 * under the pointer. Checked in the order the adapters stack their elements:
 * root-edge zones, then tab bars (a folded strip always means "into it"),
 * then tabset areas split into thirds.
 */
export function getDropTarget(
	model: LayoutModel,
	rects: LayoutRects,
	point: Point,
	source: MoveSource,
	measurements?: DropMeasurements,
	options?: RootDropZoneOptions
): DropTarget | null {
	const valid = (target: DropTarget | null) =>
		target && canMove(model.root, source, target) ? target : null

	for (const side of SIDES) {
		if (
			contains(getRootDropZoneRect(rects.container, side, options), point)
		)
			return valid({ type: 'root', position: side })
	}

	const tabsets = collectTabsets(model.root)
	for (const tabset of tabsets) {
		const bar = measurements?.tabBars.get(tabset.id)
		if (!bar || !contains(bar.rect, point)) continue
		if (bar.isRotated || tabset.isFolded)
			return valid({
				type: 'tabset',
				tabsetId: tabset.id,
				position: 'center',
			})
		return valid(getTabBarTarget(bar.tabs, point))
	}

	for (const tabset of tabsets) {
		if (model.maximizedTabsetId && model.maximizedTabsetId !== tabset.id)
			continue
		const rect = rects.tabsets.get(tabset.id)
		if (!rect || !contains(rect, point)) continue
		const position = tabset.isFolded
			? 'center'
			: getTabsetDropPosition(rect, point)
		return valid({ type: 'tabset', tabsetId: tabset.id, position })
	}
	return null
}
