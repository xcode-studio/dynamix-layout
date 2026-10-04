import { act } from '@testing-library/react'
import { vi } from 'vitest'

/**
 * jsdom has no layout. These fakes give the library what it measures: the
 * root's client size, element rects from their inline position (the root sits
 * at 0,0), tabs laid out left to right in their bar, a ResizeObserver the
 * tests can trigger, and an animation-frame queue the tests flush.
 */

const px = (value: string) => Number.parseFloat(value) || 0

export const TAB_WIDTH = 64
export const TAB_GAP = 6

function rectOf(element: Element): DOMRect {
	const html = element as HTMLElement
	if (html.dataset?.dxSlot === 'tab') {
		const bar = html.parentElement!
		const barRect = rectOf(bar)
		const index = Array.from(
			bar.querySelectorAll('[data-dx-slot="tab"]')
		).indexOf(html)
		const x = barRect.left + 8 + index * (TAB_WIDTH + TAB_GAP)
		return DOMRect.fromRect({
			x,
			y: barRect.top + 4,
			width: TAB_WIDTH,
			height: 32,
		})
	}
	const { left, top, width, height, transform } = html.style ?? {}
	if (transform?.includes('rotate(90deg)')) {
		// Rotated around its top-left corner: the visual box is to the left.
		return DOMRect.fromRect({
			x: px(left) - px(height),
			y: px(top),
			width: px(height),
			height: px(width),
		})
	}
	if (html.classList?.contains('dx-root'))
		return DOMRect.fromRect({
			x: 0,
			y: 0,
			width: size.width,
			height: size.height,
		})
	return DOMRect.fromRect({
		x: px(left),
		y: px(top),
		width: px(width),
		height: px(height),
	})
}

const size = { width: 1210, height: 800 }

export class FakeResizeObserver {
	static instances: FakeResizeObserver[] = []
	connected = true
	constructor(public callback: ResizeObserverCallback) {
		FakeResizeObserver.instances.push(this)
	}
	observe() {}
	unobserve() {}
	disconnect() {
		this.connected = false
	}
}

/** jsdom has no PointerEvent; a MouseEvent with the pointer fields is enough. */
class FakePointerEvent extends MouseEvent {
	readonly pointerId: number
	readonly pointerType: string
	readonly isPrimary: boolean
	constructor(type: string, init: PointerEventInit = {}) {
		super(type, { bubbles: true, cancelable: true, ...init })
		this.pointerId = init.pointerId ?? 1
		this.pointerType = init.pointerType ?? 'mouse'
		this.isPrimary = init.isPrimary ?? true
	}
}

let frames: FrameRequestCallback[] = []

/** Runs queued animation frames (inside `act`). */
export function flushFrames() {
	act(() => {
		while (frames.length) {
			const queue = frames
			frames = []
			queue.forEach((callback) => callback(performance.now()))
		}
	})
}

/** Changes the layout's size and notifies resize observers (inside `act`). */
export function resizeTo(width: number, height: number) {
	size.width = width
	size.height = height
	act(() => {
		FakeResizeObserver.instances
			.filter((o) => o.connected)
			.forEach((o) => o.callback([], o as unknown as ResizeObserver))
	})
	flushFrames()
}

/** Installs the fakes. Call in `beforeEach`; `vi.restoreAllMocks` undoes the spies. */
export function installDom(width = 1210, height = 800) {
	size.width = width
	size.height = height
	frames = []
	FakeResizeObserver.instances = []
	vi.stubGlobal('ResizeObserver', FakeResizeObserver)
	vi.stubGlobal('PointerEvent', FakePointerEvent)
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
		frames.push(callback)
	)
	vi.stubGlobal('cancelAnimationFrame', (id: number) => {
		frames[id - 1] = () => {}
	})
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
		function (this: HTMLElement) {
			return this.classList.contains('dx-root') ? size.width : 0
		}
	)
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
		function (this: HTMLElement) {
			return this.classList.contains('dx-root') ? size.height : 0
		}
	)
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
		function (this: Element) {
			return rectOf(this)
		}
	)
}

/** Inline rect of an element, as numbers. */
export function styleRect(element: Element | null) {
	const style = (element as HTMLElement).style
	return {
		x: px(style.left),
		y: px(style.top),
		width: px(style.width),
		height: px(style.height),
	}
}
