import type { LayoutRects } from '../geometry/compute-rects'
import type { DropTarget, LayoutModel, Rect } from '../model/types'
import { findTabset, findTabsetOfTab } from '../tree/find'
import type { DropMeasurements } from './drop-target'

const DEFAULT_TAB_GAP = 6

/**
 * Rect of the drop indicator for a target (ported from v1 drop previews):
 * half of a tabset or of the layout for side drops, the middle 80% of a
 * tabset for center drops (the whole strip when folded), and a thin marker
 * between tabs for tab bar drops.
 *
 * @returns The rect, or `null` when the target's geometry is unknown.
 */
export function getDropIndicatorRect(
	model: LayoutModel,
	rects: LayoutRects,
	target: DropTarget,
	measurements?: DropMeasurements
): Rect | null {
	if (target.type === 'root') return half(rects.container, target.position)

	if (target.type === 'tabset') {
		const rect = rects.tabsets.get(target.tabsetId)
		if (!rect) return null
		if (target.position !== 'center') return half(rect, target.position)
		if (findTabset(model.root, target.tabsetId)?.isFolded) return rect
		return {
			x: rect.x + rect.width * 0.1,
			y: rect.y + rect.height * 0.1,
			width: rect.width * 0.8,
			height: rect.height * 0.8,
		}
	}

	const tabset = findTabsetOfTab(model.root, target.tabId)
	const tabs = tabset && measurements?.tabBars.get(tabset.id)?.tabs
	const index = tabs?.findIndex((tab) => tab.id === target.tabId) ?? -1
	if (!tabs || index < 0) return null
	const gap =
		tabs.length > 1
			? Math.max(
					2,
					tabs[1].rect.x - (tabs[0].rect.x + tabs[0].rect.width)
				)
			: DEFAULT_TAB_GAP
	const { rect } = tabs[index]
	return {
		x:
			target.position === 'before'
				? rect.x - gap + 1
				: rect.x + rect.width + 1,
		y: rect.y,
		width: Math.max(2, gap - 2),
		height: rect.height,
	}
}

function half(rect: Rect, side: 'top' | 'bottom' | 'left' | 'right'): Rect {
	const { x, y, width, height } = rect
	switch (side) {
		case 'left':
			return { x, y, width: width / 2, height }
		case 'right':
			return { x: x + width / 2, y, width: width / 2, height }
		case 'top':
			return { x, y, width, height: height / 2 }
		case 'bottom':
			return { x, y: y + height / 2, width, height: height / 2 }
	}
}
