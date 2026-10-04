import { createFrameScheduler, type Rect } from '@dynamix-layout/core'
import type { LayoutController, Padding } from './controller'

/** The area inside the root (its padding box) minus the layout's padding. */
export function readContainer(element: HTMLElement, padding: Padding): Rect {
	return {
		x: padding.left,
		y: padding.top,
		width: Math.max(0, element.clientWidth - padding.left - padding.right),
		height: Math.max(
			0,
			element.clientHeight - padding.top - padding.bottom
		),
	}
}

/**
 * Measures the root now, then follows its size with a `ResizeObserver`, so
 * resizes from sidebars or flex parents are caught, not only window resizes.
 * Updates run at most once per animation frame, or once per
 * `resizeThrottleMs` when that is set.
 *
 * @returns A function that disconnects the observer and drops pending work.
 */
export function observeContainer(
	controller: LayoutController,
	element: HTMLElement
): () => void {
	const update = () =>
		controller.engine.setContainerRect(
			readContainer(element, controller.options.padding)
		)
	update()
	if (typeof ResizeObserver === 'undefined') return () => {}

	const frame = createFrameScheduler<null>(update)
	let timer: ReturnType<typeof setTimeout> | null = null
	let lastRun = 0

	const schedule = () => {
		const throttle = controller.options.resizeThrottleMs
		if (throttle <= 0) return frame.schedule(null)
		if (timer !== null) return
		const wait = Math.max(0, lastRun + throttle - Date.now())
		timer = setTimeout(() => {
			timer = null
			lastRun = Date.now()
			update()
		}, wait)
	}

	const observer = new ResizeObserver(schedule)
	observer.observe(element)
	return () => {
		observer.disconnect()
		frame.cancel()
		if (timer !== null) clearTimeout(timer)
	}
}
