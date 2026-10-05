import {
	createLayout,
	type DropMeasurements,
	type Layout,
	type LayoutChangeReason,
	type LayoutJSON,
	type LayoutTreeV1,
	type Point,
	type Rect,
	type TabBarMeasurement,
	type TabInit,
} from '@dynamix-layout/core'
import { createDomIds, type DomIds } from './dom-ids'
import type { PositionedSlot, SlotGeometryOptions } from './slot-geometry'

/** Padding on each side of the layout, in px. */
export interface Padding {
	readonly top: number
	readonly right: number
	readonly bottom: number
	readonly left: number
}

/** Behaviour options the internals read; always the latest props. */
export interface ControllerOptions extends SlotGeometryOptions {
	readonly padding: Padding
	readonly resizeThrottleMs: number
	readonly allowMaximize: boolean
	readonly allowFold: boolean
	readonly maximizeOnDoubleClick: boolean
	readonly keyboardShortcuts: boolean
	readonly tabActivation: 'automatic' | 'manual'
	/** Called when a tab's close button or Delete key asks to close it. */
	readonly onTabClose?: (tabId: string) => void
}

/**
 * Everything one layout instance shares between its hooks and components:
 * the engine, the positioned elements, DOM ids and the latest options. Created
 * once per instance; never recreated by prop changes.
 */
export interface LayoutController {
	readonly engine: Layout
	readonly ids: DomIds
	/** Latest options; updated in a layout effect, never during render. */
	options: ControllerOptions
	/** The root element, once mounted. */
	root: HTMLElement | null
	/** The container has been measured (the first render can't know its size). */
	isMeasured: boolean
	/** Tabset the user last pointed at or focused (target of keyboard shortcuts). */
	focusedTabsetId: string | null
	/** Plain-text tab titles for announcements and ARIA labels (ids when titles aren't text). */
	readonly labels: Map<string, string>
	/** Registers (or, with `null`, removes) an element the fast path positions. */
	register(
		slot: PositionedSlot,
		id: string,
		element: HTMLElement | null
	): void
	/** Every registered element of a slot. */
	elements(slot: PositionedSlot): ReadonlyMap<string, HTMLElement>
	/** Converts viewport coordinates to layout-root coordinates. */
	toRootPoint(clientX: number, clientY: number): Point
	/** Tab bar and tab rects for drop targeting, in layout-root coordinates. */
	measure(): DropMeasurements
	/** Says something to screen readers through the layout's live region. */
	announce(message: string): void
	/** Listeners for `announce`, used by the live region. */
	onAnnounce(listener: (message: string) => void): () => void
}

/** Options for {@link createController}. */
export interface CreateControllerOptions {
	readonly idBase: string
	readonly tabs: readonly TabInit[]
	readonly initialLayout: LayoutJSON | LayoutTreeV1 | null | undefined
	readonly options: ControllerOptions
	readonly minPanelSize: { width: number; height: number }
	readonly splitterSize: number
	readonly onLayoutChange: (
		layout: LayoutJSON,
		reason: LayoutChangeReason
	) => void
}

/** Effective core sizes: a tabset is never shorter than its tab bar, and folds to it. */
export function coreSizes(
	minPanelSize: { width: number; height: number },
	splitterSize: number,
	options: SlotGeometryOptions
) {
	const height = options.showTabBar
		? Math.max(minPanelSize.height, options.tabBarHeight)
		: minPanelSize.height
	return {
		minPanelSize: { width: minPanelSize.width, height },
		splitterSize,
		foldedSize: options.showTabBar ? options.tabBarHeight : height,
	}
}

const relativeRect = (rect: DOMRect, origin: Point): Rect => ({
	x: rect.left - origin.x,
	y: rect.top - origin.y,
	width: rect.width,
	height: rect.height,
})

/**
 * Creates the controller. Pure apart from creating the engine, so it is safe
 * to call during render (StrictMode may call it twice and drop one).
 */
export function createController(
	init: CreateControllerOptions
): LayoutController {
	const registry = new Map<PositionedSlot, Map<string, HTMLElement>>()
	const announceListeners = new Set<(message: string) => void>()
	const engine = createLayout({
		tabs: init.tabs,
		initialLayout: init.initialLayout ?? null,
		...coreSizes(init.minPanelSize, init.splitterSize, init.options),
		onLayoutChange: init.onLayoutChange,
	})

	const slotMap = (slot: PositionedSlot) => {
		let map = registry.get(slot)
		if (!map) registry.set(slot, (map = new Map()))
		return map
	}

	const controller: LayoutController = {
		engine,
		ids: createDomIds(init.idBase),
		options: init.options,
		root: null,
		isMeasured: false,
		focusedTabsetId: null,
		labels: new Map(),
		register(slot, id, element) {
			if (element) slotMap(slot).set(id, element)
			else slotMap(slot).delete(id)
		},
		elements: (slot) => slotMap(slot),
		toRootPoint(clientX, clientY) {
			const root = controller.root
			if (!root) return { x: clientX, y: clientY }
			const box = root.getBoundingClientRect()
			return {
				x: clientX - box.left - root.clientLeft,
				y: clientY - box.top - root.clientTop,
			}
		},
		measure() {
			const root = controller.root
			const tabBars = new Map<string, TabBarMeasurement>()
			if (!root) return { tabBars }
			const box = root.getBoundingClientRect()
			const origin = {
				x: box.left + root.clientLeft,
				y: box.top + root.clientTop,
			}
			slotMap('tabBar').forEach((bar, tabsetId) => {
				const tabs = Array.from(
					bar.querySelectorAll<HTMLElement>('[data-dx-slot="tab"]')
				).map((tab) => ({
					id: tab.dataset.dxId ?? '',
					rect: relativeRect(tab.getBoundingClientRect(), origin),
				}))
				tabBars.set(tabsetId, {
					rect: relativeRect(bar.getBoundingClientRect(), origin),
					isRotated: bar.hasAttribute('data-dx-rotated'),
					tabs,
				})
			})
			return { tabBars }
		},
		announce: (message) =>
			announceListeners.forEach((listener) => listener(message)),
		onAnnounce(listener) {
			announceListeners.add(listener)
			return () => announceListeners.delete(listener)
		},
	}
	return controller
}
