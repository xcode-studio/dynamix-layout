import type { Direction, Rect } from '../model/types'

/** Where a tabset's tab bar goes. */
export interface TabBarPlacement {
	/** Box to give the tab bar element before `isRotated` is applied. */
	readonly rect: Rect
	/**
	 * A folded tabset in a side-by-side row shows its tab bar as a vertical
	 * strip: an element `height` wide and `width` tall, rotated 90° around its
	 * top-left corner and placed at the strip's right edge.
	 */
	readonly isRotated: boolean
}

/**
 * @param tabset - The tabset's rect and state.
 * @param tabBarHeight - Height of a horizontal tab bar.
 * @returns The rect to give the tab bar element, and whether to rotate it.
 * @example
 * const { rect, isRotated } = getTabBarPlacement(snapshot.rects.tabsets.get(id)!, snapshot.tabsets.get(id)!, 40)
 * applyRect(tabBar, rect)
 * tabBar.style.transform = isRotated ? 'rotate(90deg)' : ''
 */
export function getTabBarPlacement(
	tabsetRect: Rect,
	tabset: { readonly isFolded: boolean; readonly parentDirection: Direction },
	tabBarHeight: number
): TabBarPlacement {
	const { x, y, width, height } = tabsetRect
	if (tabset.isFolded && tabset.parentDirection === 'horizontal') {
		return {
			rect: { x: x + width, y, width: height, height: width },
			isRotated: true,
		}
	}
	return { rect: { x, y, width, height: tabBarHeight }, isRotated: false }
}

/**
 * Area of a tabset below its tab bar; never negative when squeezed.
 * @param tabsetRect - The tabset's rect.
 * @param tabBarHeight - Height of its tab bar (0 without one).
 * @returns The content area.
 * @example
 * applyRect(content, getTabContentRect(snapshot.rects.tabsets.get(tab.tabsetId)!, 40))
 */
export function getTabContentRect(
	tabsetRect: Rect,
	tabBarHeight: number
): Rect {
	return {
		x: tabsetRect.x,
		y: tabsetRect.y + tabBarHeight,
		width: tabsetRect.width,
		height: Math.max(0, tabsetRect.height - tabBarHeight),
	}
}
