import type { Dimension, NodeOptions } from '../type'

/** @deprecated Replaced in 2.0 by `applyRect(element, rect)`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export function setElementRect(el: HTMLElement, { x, y, w, h }: Dimension) {
	el.style.left = `${x}px`
	el.style.top = `${y}px`
	el.style.width = `${w}px`
	el.style.height = `${h}px`
}

/**
 * Area of a tabset below its tab bar; never negative when squeezed.
 * @deprecated Replaced in 2.0 by `getTabContentRect(tabsetRect, tabBarHeight)`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md
 */
export function getTabBodyRect(
	tabset: Dimension,
	tabbarHeight: number
): Dimension {
	return {
		x: tabset.x,
		y: tabset.y + tabbarHeight,
		w: tabset.w,
		h: Math.max(0, tabset.h - tabbarHeight),
	}
}

export interface TabbarPlacement {
	/** Box to give the tab bar element before `rotated` is applied. */
	rect: Dimension
	/** Folded tabset in a side-by-side row: the bar is drawn as a vertical strip. */
	rotated: boolean
}

/**
 * Where a tabset's tab bar goes. A folded tabset in a side-by-side row shows
 * its tab bar rotated 90 degrees: an element `h` wide and `w` tall, rotated
 * around its top-left corner and placed at `x + w`, covers exactly the strip.
 */
export function getTabbarPlacement(
	tabset: Pick<NodeOptions, 'nodDims' | 'nodFold' | 'nodeDir'>,
	tabbarHeight: number
): TabbarPlacement {
	const { x, y, w, h } = tabset.nodDims
	// A tabset's own direction is the opposite of its row's.
	const rowIsHorizontal = tabset.nodeDir === false
	if (tabset.nodFold && rowIsHorizontal) {
		return { rect: { x: x + w, y, w: h, h: w }, rotated: true }
	}
	return { rect: { x, y, w, h: tabbarHeight }, rotated: false }
}

export function placeTabbar(el: HTMLElement, placement: TabbarPlacement) {
	setElementRect(el, placement.rect)
	el.style.transformOrigin = '0 0'
	el.style.transform = placement.rotated ? 'rotate(90deg)' : ''
}

export interface FrameScheduler<T> {
	/** Remember `value`; `onFlush` runs with the latest value on the next frame. */
	schedule: (value: T) => void
	/** Run a pending flush now (e.g. on pointer up). */
	flush: () => void
	/** Drop a pending flush (e.g. on unmount). */
	cancel: () => void
}

/**
 * Coalesces bursts of updates (pointer events can fire several times per
 * frame) into at most one `onFlush` call per animation frame.
 */
export function createFrameScheduler<T>(
	onFlush: (value: T) => void
): FrameScheduler<T> {
	let pending: { value: T } | null = null
	let frame: number | null = null

	const run = () => {
		frame = null
		const next = pending
		pending = null
		if (next) onFlush(next.value)
	}

	return {
		schedule(value) {
			pending = { value }
			if (frame === null) frame = requestAnimationFrame(run)
		},
		flush() {
			if (frame === null) return
			cancelAnimationFrame(frame)
			run()
		},
		cancel() {
			if (frame !== null) cancelAnimationFrame(frame)
			frame = null
			pending = null
		},
	}
}
