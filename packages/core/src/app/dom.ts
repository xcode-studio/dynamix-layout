import type { Dimension } from '../type'

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
