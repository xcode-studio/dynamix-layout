import {
	createFrameScheduler,
	createLayout,
	type DragSource,
	type DropMeasurements,
	type Layout,
	type LayoutSnapshot,
	type Point,
	type Rect,
	type TabBarMeasurement,
} from '@dynamix-layout/core'
import { createSignal, onCleanup, onMount, type Accessor } from 'solid-js'
import type { useDynamixLayoutOptions } from '../types'

/** What `useDynamixLayout` returns to the Solid `<DynamixLayout>`. */
export interface DynamixLayoutState {
	engine: Layout
	/** The current snapshot; Solid updates only what reads the parts that changed. */
	snapshot: Accessor<LayoutSnapshot>
	/** A tab or tabset is being dragged (HTML5) or a splitter is moving. */
	dragging: Accessor<boolean>
	onDragStart: (event: DragEvent, source: DragSource) => void
	onDragOver: (event: DragEvent) => void
	onDragEnd: () => void
	onDrop: (event: DragEvent) => void
	onSliderPointerDown: (event: PointerEvent, splitterId: string) => void
	onRootPointerDown: (event: PointerEvent) => void
	onTabbarDoubleClick: (tabsetId: string) => void
	selectTab: (tabId: string) => void
	toggleMaximize: (tabsetId: string) => void
	toggleFold: (tabsetId: string) => void
}

const relativeRect = (rect: DOMRect, origin: Point): Rect => ({
	x: rect.left - origin.x,
	y: rect.top - origin.y,
	width: rect.width,
	height: rect.height,
})

/**
 * The Solid adapter's engine binding: one `createLayout` instance per
 * component, a snapshot signal, HTML5 drag-and-drop for tabs (drop targets
 * come from the core), pointer drags for splitters, and window-resize
 * tracking.
 */
export const useDynamixLayout = (
	options: useDynamixLayoutOptions
): DynamixLayoutState => {
	const minHeight = options.enableTabbar
		? Math.max(options.minTabHeight, options.tabHeadHeight)
		: options.minTabHeight

	const engine = createLayout({
		tabs: options.tabIds.map((id) => ({ id })),
		initialLayout: options.layoutTree ?? null,
		minPanelSize: { width: options.minTabWidth, height: minHeight },
		splitterSize: options.bondWidth,
		// A folded tabset shrinks to its tab bar.
		foldedSize: options.enableTabbar ? options.tabHeadHeight : minHeight,
		onLayoutChange: (json) => options.updateJSON?.(json),
	})

	const [snapshot, setSnapshot] = createSignal(engine.getSnapshot(), {
		equals: false,
	})
	const [dragging, setDragging] = createSignal(false)
	const unsubscribe = engine.subscribe(setSnapshot)

	const toRootPoint = (clientX: number, clientY: number): Point => {
		const root = options.getRoot()
		if (!root) return { x: clientX, y: clientY }
		const box = root.getBoundingClientRect()
		return {
			x: clientX - box.left - root.clientLeft,
			y: clientY - box.top - root.clientTop,
		}
	}

	const measure = (): DropMeasurements => {
		const tabBars = new Map<string, TabBarMeasurement>()
		const root = options.getRoot()
		if (!root) return { tabBars }
		const box = root.getBoundingClientRect()
		const origin = {
			x: box.left + root.clientLeft,
			y: box.top + root.clientTop,
		}
		root.querySelectorAll<HTMLElement>('[data-tabbar]').forEach((bar) => {
			const id = bar.dataset.uid
			if (!id) return
			tabBars.set(id, {
				rect: relativeRect(bar.getBoundingClientRect(), origin),
				isRotated: bar.hasAttribute('data-rotated'),
				tabs: Array.from(
					bar.querySelectorAll<HTMLElement>(
						':scope > [data-type="tab"]'
					)
				).map((tab) => ({
					id: tab.dataset.uid ?? '',
					rect: relativeRect(tab.getBoundingClientRect(), origin),
				})),
			})
		})
		return { tabBars }
	}

	// --- Tabs and tabsets: HTML5 drag-and-drop, targets from the core ---
	let measurements: DropMeasurements | undefined
	const dragFrame = createFrameScheduler<Point>((point) =>
		engine.updateDrag(point, measurements)
	)

	const onDragStart = (event: DragEvent, source: DragSource) => {
		event.stopPropagation()
		measurements = measure()
		if (!engine.startDrag(source)) return
		setDragging(true)
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move'
			// A blank drag image: the drop indicator shows where the tab goes.
			const image = document.createElement('div')
			image.style.cssText =
				'width:1px;height:1px;position:absolute;top:-1000px'
			document.body.appendChild(image)
			event.dataTransfer.setDragImage(image, 0, 0)
			setTimeout(() => image.remove(), 0)
		}
	}

	const onDragOver = (event: DragEvent) => {
		if (!snapshot().drag) return
		event.preventDefault()
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
		dragFrame.schedule(toRootPoint(event.clientX, event.clientY))
	}

	const onDragEnd = () => {
		dragFrame.flush()
		engine.endDrag()
		measurements = undefined
		setDragging(false)
	}

	const onDrop = (event: DragEvent) => event.preventDefault()

	// --- Splitters: pointer events ---
	const sliderFrame = createFrameScheduler<Point>((point) =>
		engine.updateDrag(point)
	)
	const onSliderPointerDown = (event: PointerEvent, splitterId: string) => {
		event.preventDefault()
		if (!engine.startDrag({ type: 'splitter', splitterId })) return
		const element = event.currentTarget as HTMLElement
		element.setPointerCapture?.(event.pointerId)
		// `.is-dragging` stops iframes and editors in tab bodies swallowing events.
		setDragging(true)
		const move = (e: PointerEvent) =>
			sliderFrame.schedule(toRootPoint(e.clientX, e.clientY))
		const up = () => {
			sliderFrame.flush()
			engine.endDrag()
			setDragging(false)
			element.removeEventListener('pointermove', move)
			element.removeEventListener('pointerup', up)
			element.removeEventListener('pointercancel', up)
		}
		element.addEventListener('pointermove', move)
		element.addEventListener('pointerup', up)
		element.addEventListener('pointercancel', up)
	}

	// --- Maximize / fold ---
	let activeTabset: string | null = null
	const onRootPointerDown = (event: PointerEvent) => {
		const element = (event.target as HTMLElement).closest<HTMLElement>(
			'[data-uid]'
		)
		const id = element?.dataset.uid
		if (!id) return
		const current = snapshot()
		if (current.tabsets.has(id)) activeTabset = id
		else if (current.tabs.has(id))
			activeTabset = current.tabs.get(id)!.tabsetId
	}
	const onTabbarDoubleClick = (tabsetId: string) => {
		if (options.enableDoubleClickMaximize) engine.toggleMaximize(tabsetId)
	}
	const onKeyDown = (event: KeyboardEvent) => {
		if (
			!options.keyboardShortcuts ||
			!event.altKey ||
			event.ctrlKey ||
			event.metaKey
		)
			return
		const id = activeTabset ?? snapshot().maximizedTabsetId
		if (!id) return
		if (event.code === 'Equal' || event.code === 'NumpadAdd') {
			event.preventDefault()
			engine.toggleMaximize(id)
		} else if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
			event.preventDefault()
			engine.toggleFold(id)
		}
	}

	onMount(() => {
		let timer: ReturnType<typeof setTimeout> | undefined
		const update = () => engine.setContainerRect(options.container())
		const onResize = () => {
			if (options.disableResizeTimeout) return update()
			clearTimeout(timer)
			timer = setTimeout(update, options.windowResizeTimeout)
		}
		update()
		window.addEventListener('resize', onResize)
		window.addEventListener('keydown', onKeyDown)
		// v1 behaviour, kept for the minimal port: report the layout once mounted.
		options.updateJSON?.(engine.toJSON())

		onCleanup(() => {
			clearTimeout(timer)
			window.removeEventListener('resize', onResize)
			window.removeEventListener('keydown', onKeyDown)
			dragFrame.cancel()
			sliderFrame.cancel()
			unsubscribe()
			engine.destroy()
		})
	})

	return {
		engine,
		snapshot,
		dragging,
		onDragStart,
		onDragOver,
		onDragEnd,
		onDrop,
		onSliderPointerDown,
		onRootPointerDown,
		onTabbarDoubleClick,
		selectTab: (tabId) => void engine.selectTab(tabId),
		toggleMaximize: (tabsetId) => void engine.toggleMaximize(tabsetId),
		toggleFold: (tabsetId) => void engine.toggleFold(tabsetId),
	}
}
