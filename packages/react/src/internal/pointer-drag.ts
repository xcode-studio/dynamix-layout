import {
	createFrameScheduler,
	type DragSource,
	type DropMeasurements,
} from '@dynamix-layout/core'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { LayoutController } from './controller'

/** Distance a mouse or pen must move before a press becomes a tab drag. */
const DRAG_THRESHOLD = 4
/** How long a touch must hold still before it becomes a tab drag (so panning still scrolls tab bars). */
const LONG_PRESS_MS = 350
/** Movement that turns a pending touch into a pan instead. */
const TOUCH_SLOP = 8

const active = new WeakMap<LayoutController, () => void>()

/** Cancels the drag in progress, if any (used on unmount). */
export function stopPointerDrag(controller: LayoutController): void {
	active.get(controller)?.()
}

/**
 * Starts tracking a press on a tab, tab bar or splitter. Splitters drag
 * immediately; tabs and tab bars only after moving `DRAG_THRESHOLD` px (mouse,
 * pen) or a long press (touch), so a plain click still selects a tab.
 *
 * During the drag: moves are coalesced to one per frame, Escape or
 * `pointercancel` cancels, and the click that follows a drag is swallowed.
 */
export function beginPointerDrag(
	controller: LayoutController,
	event: ReactPointerEvent<HTMLElement>,
	source: DragSource
): void {
	if (event.button !== 0 || event.isPrimary === false) return
	stopPointerDrag(controller)

	const { engine } = controller
	const element = event.currentTarget
	const pointerId = event.pointerId
	const isTouch = event.pointerType === 'touch'
	const start = { x: event.clientX, y: event.clientY }
	let isDragging = false
	let measurements: DropMeasurements | undefined
	let longPress: ReturnType<typeof setTimeout> | null = null

	const frame = createFrameScheduler<{ x: number; y: number }>((client) =>
		engine.updateDrag(
			controller.toRootPoint(client.x, client.y),
			measurements
		)
	)

	const capture = () => {
		try {
			element.setPointerCapture?.(pointerId)
		} catch {
			// The pointer may already be released (e.g. a very short tap).
		}
	}

	const startDrag = () => {
		if (isDragging) return
		measurements =
			source.type === 'splitter' ? undefined : controller.measure()
		if (!engine.startDrag(source)) return cleanup()
		isDragging = true
		capture()
	}

	const swallowClick = (click: MouseEvent) => {
		click.stopPropagation()
		click.preventDefault()
	}

	const onMove = (move: PointerEvent) => {
		if (move.pointerId !== pointerId) return
		if (!isDragging) {
			const distance = Math.hypot(
				move.clientX - start.x,
				move.clientY - start.y
			)
			if (isTouch) {
				if (distance > TOUCH_SLOP) cleanup()
				return
			}
			if (distance < DRAG_THRESHOLD) return
			startDrag()
			if (!isDragging) return
		}
		move.preventDefault()
		frame.schedule({ x: move.clientX, y: move.clientY })
	}

	const onUp = (up: PointerEvent) => {
		if (up.pointerId !== pointerId) return
		if (isDragging) {
			frame.flush()
			engine.endDrag()
			// The click that follows the release would select or toggle something.
			element.addEventListener('click', swallowClick, {
				capture: true,
				once: true,
			})
			setTimeout(
				() =>
					element.removeEventListener('click', swallowClick, {
						capture: true,
					}),
				0
			)
		}
		cleanup()
	}

	const onCancel = () => {
		if (isDragging) engine.cancelDrag()
		cleanup()
	}

	const onKeyDown = (key: KeyboardEvent) => {
		if (key.key === 'Escape' && isDragging) {
			key.preventDefault()
			onCancel()
		}
	}

	function cleanup() {
		frame.cancel()
		if (longPress !== null) clearTimeout(longPress)
		window.removeEventListener('pointermove', onMove)
		window.removeEventListener('pointerup', onUp)
		window.removeEventListener('pointercancel', onCancel)
		window.removeEventListener('keydown', onKeyDown, true)
		if (active.get(controller) === onCancel) active.delete(controller)
		isDragging = false
	}

	window.addEventListener('pointermove', onMove)
	window.addEventListener('pointerup', onUp)
	window.addEventListener('pointercancel', onCancel)
	window.addEventListener('keydown', onKeyDown, true)
	active.set(controller, onCancel)

	if (source.type === 'splitter') {
		event.preventDefault()
		startDrag()
	} else if (isTouch) {
		longPress = setTimeout(startDrag, LONG_PRESS_MS)
	}
}
