import type { Dimension } from '../type'

export type DropArea = 'top' | 'bottom' | 'left' | 'right' | 'contain'
export type RootSide = Exclude<DropArea, 'contain'>

/** Where a dragged tab or tabset would land, in viewport coordinates. */
export interface DropPreview {
	area: DropArea
	left: number
	top: number
	width: number
	height: number
}

export type PreviewRect = Pick<
	DOMRect,
	'left' | 'top' | 'right' | 'bottom' | 'width' | 'height'
>

const DEFAULT_TAB_GAP = 6

/**
 * Splits a tabset into thirds: the outer thirds drop beside it, the middle
 * drops into it as a tab.
 * @deprecated Replaced in 2.0 by `layout.getDropTarget()` and `layout.getDropIndicatorRect()`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md
 */
export function getTabsetDropPreview(
	rect: PreviewRect,
	clientX: number,
	clientY: number
): DropPreview {
	const { left, top, width: w, height: h } = rect
	const x = clientX - left
	const y = clientY - top

	if (x < w / 3) return { area: 'left', left, top, width: w / 2, height: h }
	if (x > (2 * w) / 3)
		return {
			area: 'right',
			left: left + w / 2,
			top,
			width: w / 2,
			height: h,
		}
	if (y < h / 3) return { area: 'top', left, top, width: w, height: h / 2 }
	if (y > (2 * h) / 3)
		return {
			area: 'bottom',
			left,
			top: top + h / 2,
			width: w,
			height: h / 2,
		}

	return {
		area: 'contain',
		left: left + w * 0.1,
		top: top + h * 0.1,
		width: w * 0.8,
		height: h * 0.8,
	}
}

/**
 * The half of the whole layout a root-edge drop would take.
 * @deprecated Replaced in 2.0 by `layout.getDropTarget()` and `layout.getDropIndicatorRect()`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md
 */
export function getRootSplitPreview(
	container: Dimension,
	side: RootSide
): DropPreview {
	const { x, y, w, h } = container
	switch (side) {
		case 'left':
			return { area: side, left: x, top: y, width: w / 2, height: h }
		case 'right':
			return {
				area: side,
				left: x + w / 2,
				top: y,
				width: w / 2,
				height: h,
			}
		case 'top':
			return { area: side, left: x, top: y, width: w, height: h / 2 }
		case 'bottom':
			return {
				area: side,
				left: x,
				top: y + h / 2,
				width: w,
				height: h / 2,
			}
	}
}

/**
 * Insertion marker between the tabs of a tab bar. `index` is the tab the
 * marker sits next to. Returns null when the pointer is above or below the bar.
 * @deprecated Replaced in 2.0 by `layout.getDropTarget()` and `layout.getDropIndicatorRect()`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md
 */
export function getNavbarDropPreview(
	navbarRect: PreviewRect,
	tabRects: PreviewRect[],
	clientX: number,
	clientY: number
): (DropPreview & { index: number }) | null {
	if (tabRects.length === 0) return null
	if (clientY < navbarRect.top || clientY > navbarRect.bottom) return null

	const first = tabRects[0]
	const last = tabRects[tabRects.length - 1]
	let gap = DEFAULT_TAB_GAP

	if (clientX > last.right) {
		return {
			index: tabRects.length - 1,
			area: 'right',
			left: last.right + 1,
			top: last.top,
			width: gap - 2,
			height: last.height,
		}
	}

	if (clientX < first.left) {
		return {
			index: 0,
			area: 'left',
			left: first.left - gap + 1,
			top: first.top,
			width: gap - 2,
			height: first.height,
		}
	}

	let index = 0
	let minDistance = Infinity
	let isLeftSide = false
	tabRects.forEach((rect, i) => {
		const center = rect.left + rect.width / 2
		const distance = Math.abs(clientX - center)
		if (distance < minDistance) {
			minDistance = distance
			index = i
			isLeftSide = clientX < center
		}
	})

	const hasNeighbour = isLeftSide ? index > 0 : index < tabRects.length - 1
	if (tabRects.length > 1 && hasNeighbour)
		gap = tabRects[1].left - first.right

	const rect = tabRects[index]
	return {
		index,
		area: isLeftSide ? 'left' : 'right',
		left: isLeftSide ? rect.left - gap + 1 : rect.right + 1,
		top: rect.top,
		width: gap - 2,
		height: rect.height,
	}
}

/** @deprecated Replaced in 2.0 by `layout.getDropTarget()` and `layout.getDropIndicatorRect()`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export function isSameDropPreview(
	a: Partial<DropPreview>,
	b: DropPreview
): boolean {
	return (
		a.area === b.area &&
		a.left === b.left &&
		a.top === b.top &&
		a.width === b.width &&
		a.height === b.height
	)
}
