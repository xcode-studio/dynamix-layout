import {
	getRootDropZoneRect,
	getTabBarPlacement,
	getTabContentRect,
	type LayoutSnapshot,
	type Rect,
	type Side,
} from '@dynamix-layout/core'
import type { CSSProperties } from 'react'

/** Elements the library positions. */
export type PositionedSlot =
	| 'panel'
	| 'tabBar'
	| 'tabContent'
	| 'splitter'
	| 'dropIndicator'
	| 'rootDropZone'

/** Geometry the slot geometry depends on besides the snapshot. */
export interface SlotGeometryOptions {
	readonly tabBarHeight: number
	readonly showTabBar: boolean
}

/** Where an element goes and whether it shows. */
export interface SlotGeometry {
	readonly rect: Rect
	readonly isRotated: boolean
	readonly isHidden: boolean
}

const EMPTY: Rect = { x: 0, y: 0, width: 0, height: 0 }

/**
 * Geometry of one positioned element, computed from the snapshot alone. Both
 * the render and the DOM fast path use it, so they always agree.
 */
export function getSlotGeometry(
	snapshot: LayoutSnapshot,
	options: SlotGeometryOptions,
	slot: PositionedSlot,
	id: string
): SlotGeometry | null {
	const { rects } = snapshot
	switch (slot) {
		case 'panel': {
			const tabset = snapshot.tabsets.get(id)
			const rect = rects.tabsets.get(id)
			if (!tabset || !rect) return null
			return { rect, isRotated: false, isHidden: tabset.isHidden }
		}
		case 'tabBar': {
			const tabset = snapshot.tabsets.get(id)
			const rect = rects.tabsets.get(id)
			if (!tabset || !rect) return null
			const placement = getTabBarPlacement(
				rect,
				tabset,
				options.tabBarHeight
			)
			return {
				rect: placement.rect,
				isRotated: placement.isRotated,
				isHidden: tabset.isHidden,
			}
		}
		case 'tabContent': {
			const tab = snapshot.tabs.get(id)
			const tabsetRect = tab && rects.tabsets.get(tab.tabsetId)
			if (!tab || !tabsetRect)
				return { rect: EMPTY, isRotated: false, isHidden: true }
			const rect = getTabContentRect(
				tabsetRect,
				options.showTabBar ? options.tabBarHeight : 0
			)
			return {
				rect,
				isRotated: false,
				isHidden: !tab.isVisible || rect.height <= 0,
			}
		}
		case 'splitter': {
			const splitter = snapshot.splitters.get(id)
			const rect = rects.splitters.get(id)
			if (!splitter || !rect) return null
			return { rect, isRotated: false, isHidden: splitter.isHidden }
		}
		case 'dropIndicator': {
			const rect = snapshot.drag?.indicator
			return rect
				? { rect, isRotated: false, isHidden: false }
				: { rect: EMPTY, isRotated: false, isHidden: true }
		}
		case 'rootDropZone': {
			const rect = getRootDropZoneRect(rects.container, id as Side)
			const isTabDrag =
				!!snapshot.drag && snapshot.drag.source.type !== 'splitter'
			return { rect, isRotated: false, isHidden: !isTabDrag }
		}
	}
}

/**
 * Inline style for a geometry: positioning only (everything else is CSS), and
 * complete on its own so headless layouts work without the stylesheet.
 */
export function positionStyle(geometry: SlotGeometry | null): CSSProperties {
	if (!geometry) return {}
	const { x, y, width, height } = geometry.rect
	return {
		position: 'absolute',
		left: x,
		top: y,
		width,
		height,
		...(geometry.isRotated ? { transform: 'rotate(90deg)' } : {}),
	}
}

/** Applies a geometry to an element (the fast path between renders). */
export function applySlotGeometry(
	element: HTMLElement,
	geometry: SlotGeometry | null
): void {
	if (!geometry) return
	const { style } = element
	const { x, y, width, height } = geometry.rect
	style.left = `${x}px`
	style.top = `${y}px`
	style.width = `${width}px`
	style.height = `${height}px`
	style.transform = geometry.isRotated ? 'rotate(90deg)' : ''
	element.toggleAttribute('data-dx-hidden', geometry.isHidden)
	// Native `hidden` works without the stylesheet (headless layouts).
	element.hidden = geometry.isHidden
}
