import {
	applyRect,
	createFrameScheduler,
	createLayout,
	getTabBarPlacement,
	getTabContentRect,
	type DragSource,
	type DropMeasurements,
	type DropTarget,
	type Layout,
	type LayoutChangeReason,
	type LayoutJSON,
	type LayoutSnapshot,
	type Point,
	type Rect,
	type TabBarMeasurement,
	type TabsetState,
} from '@dynamix-layout/core'

/** A tab as the app describes it. */
export interface TabDef {
	readonly id: string
	readonly title: string
	/** Created once and never moved between parents, so its state survives every move. */
	readonly content: HTMLElement
	readonly closable?: boolean
	/** Where the tab goes the first time it appears. */
	readonly target?: DropTarget
}

export interface DomLayoutOptions {
	readonly tabs: readonly TabDef[]
	readonly initialLayout?: LayoutJSON | null
	readonly tabBarHeight?: number
	readonly splitterSize?: number
	readonly padding?: number
	readonly minPanelSize?: { width: number; height: number }
	readonly onLayoutChange?: (
		layout: LayoutJSON,
		reason: LayoutChangeReason
	) => void
	/** The × button or Delete key asks to close a closable tab. */
	readonly onTabClose?: (tabId: string) => void
}

export interface DomLayout {
	readonly engine: Layout
	/** Replaces the open tabs; content elements of kept tabs stay where they are. */
	setTabs(tabs: readonly TabDef[]): void
	destroy(): void
}

/** Pixels a pointer must travel before a press on a tab becomes a drag. */
const DRAG_THRESHOLD = 4

const el = <K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className: string,
	parent?: HTMLElement
) => {
	const element = document.createElement(tag)
	element.className = className
	parent?.append(element)
	return element
}

const relativeRect = (rect: DOMRect, origin: Point): Rect => ({
	x: rect.left - origin.x,
	y: rect.top - origin.y,
	width: rect.width,
	height: rect.height,
})

/**
 * Renders a layout into `root` with plain DOM: tab bars, close buttons,
 * fold/maximize toolbars, splitters and a drop indicator, all driven by the
 * engine's snapshots. Every interaction is one engine call.
 */
export function createDomLayout(
	root: HTMLElement,
	options: DomLayoutOptions
): DomLayout {
	const tabBarHeight = options.tabBarHeight ?? 36
	const padding = options.padding ?? 0
	let defs = new Map(options.tabs.map((tab) => [tab.id, tab]))

	const engine = createLayout({
		tabs: options.tabs,
		initialLayout: options.initialLayout,
		splitterSize: options.splitterSize ?? 6,
		minPanelSize: options.minPanelSize ?? {
			width: 80,
			height: tabBarHeight,
		},
		foldedSize: tabBarHeight,
		onLayoutChange: options.onLayoutChange,
	})

	root.classList.add('dx-root')
	const panels = new Map<string, HTMLElement>()
	const bars = new Map<string, HTMLElement>()
	const barStates = new Map<string, TabsetState>()
	const contents = new Map<string, HTMLElement>()
	const splitters = new Map<string, HTMLElement>()
	const indicator = el('div', 'dx-drop-indicator', root)
	indicator.hidden = true

	// --- Coordinates and measurements ---

	const toRootPoint = (event: PointerEvent): Point => {
		const box = root.getBoundingClientRect()
		return {
			x: event.clientX - box.left - root.clientLeft,
			y: event.clientY - box.top - root.clientTop,
		}
	}

	const measure = (): DropMeasurements => {
		const box = root.getBoundingClientRect()
		const origin = {
			x: box.left + root.clientLeft,
			y: box.top + root.clientTop,
		}
		const tabBars = new Map<string, TabBarMeasurement>()
		bars.forEach((bar, tabsetId) => {
			if (bar.hidden) return
			tabBars.set(tabsetId, {
				rect: relativeRect(bar.getBoundingClientRect(), origin),
				isRotated: bar.hasAttribute('data-dx-rotated'),
				tabs: Array.from(
					bar.querySelectorAll<HTMLElement>('.dx-tab'),
					(tab) => ({
						id: tab.dataset.id!,
						rect: relativeRect(tab.getBoundingClientRect(), origin),
					})
				),
			})
		})
		return { tabBars }
	}

	const resize = () =>
		engine.setContainerRect({
			x: padding,
			y: padding,
			width: Math.max(0, root.clientWidth - padding * 2),
			height: Math.max(0, root.clientHeight - padding * 2),
		})
	const resizeFrame = createFrameScheduler<null>(resize)
	const observer = new ResizeObserver(() => resizeFrame.schedule(null))
	observer.observe(root)

	// --- Pointer drags (tabs, tab bars, splitters) ---

	let stopDrag: (() => void) | null = null

	/**
	 * Follows a press: `onClick` if it never moved past the threshold,
	 * otherwise a drag of `source` that ends in `endDrag` (or `cancelDrag` on Escape).
	 */
	const trackPress = (
		event: PointerEvent,
		source: DragSource,
		onClick?: () => void
	) => {
		if (event.button !== 0 || stopDrag) return
		const start = { x: event.clientX, y: event.clientY }
		const isSplitter = source.type === 'splitter'
		let dragging = false
		let measurements: DropMeasurements | undefined
		const frame = createFrameScheduler((point: Point) =>
			engine.updateDrag(point, measurements)
		)

		const begin = () => {
			if (!isSplitter) measurements = measure()
			dragging = engine.startDrag(source)
			if (dragging) root.setAttribute('data-dx-dragging', '')
			return dragging
		}
		const move = (e: PointerEvent) => {
			if (
				!dragging &&
				Math.hypot(e.clientX - start.x, e.clientY - start.y) <
					DRAG_THRESHOLD
			)
				return
			if (!dragging && !begin()) return finish()
			frame.schedule(toRootPoint(e))
		}
		const up = () => {
			if (dragging) {
				frame.flush()
				engine.endDrag()
			} else onClick?.()
			finish()
		}
		const key = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return
			frame.cancel()
			if (dragging) engine.cancelDrag()
			finish()
		}
		const finish = () => {
			frame.cancel()
			root.removeAttribute('data-dx-dragging')
			window.removeEventListener('pointermove', move)
			window.removeEventListener('pointerup', up)
			window.removeEventListener('pointercancel', up)
			window.removeEventListener('keydown', key)
			stopDrag = null
		}

		stopDrag = () => {
			if (dragging) engine.cancelDrag()
			finish()
		}
		window.addEventListener('pointermove', move)
		window.addEventListener('pointerup', up)
		window.addEventListener('pointercancel', up)
		window.addEventListener('keydown', key)
		// A splitter drags from the first pixel; tabs wait for the threshold.
		if (isSplitter && !begin()) finish()
	}

	// --- Tab bars ---

	const closeTab = (tabId: string) => {
		if (defs.get(tabId)?.closable) options.onTabClose?.(tabId)
	}

	const toolbarButton = (
		parent: HTMLElement,
		label: string,
		text: string,
		run: () => void
	) => {
		const button = el('button', 'dx-toolbar-button', parent)
		button.type = 'button'
		button.title = label
		button.setAttribute('aria-label', label)
		button.textContent = text
		button.addEventListener('pointerdown', (e) => e.stopPropagation())
		button.addEventListener('click', run)
	}

	const fillTabBar = (bar: HTMLElement, tabset: TabsetState) => {
		bar.replaceChildren()
		bar.setAttribute('role', 'tablist')
		for (const tabId of tabset.tabIds) {
			const def = defs.get(tabId)
			const isActive = tabId === tabset.activeTabId
			const tab = el('div', 'dx-tab', bar)
			tab.dataset.id = tabId
			tab.dataset.state = isActive ? 'active' : 'inactive'
			tab.setAttribute('role', 'tab')
			tab.setAttribute('aria-selected', String(isActive))
			tab.tabIndex = isActive ? 0 : -1
			el('span', 'dx-tab-title', tab).textContent = def?.title ?? tabId
			if (def?.closable) {
				const close = el('button', 'dx-tab-close', tab)
				close.type = 'button'
				close.textContent = '×'
				close.tabIndex = -1
				close.setAttribute('aria-label', `Close ${def.title}`)
				close.addEventListener('pointerdown', (e) =>
					e.stopPropagation()
				)
				close.addEventListener('click', () => closeTab(tabId))
			}
			tab.addEventListener('pointerdown', (e) => {
				e.stopPropagation()
				trackPress(e, { type: 'tab', tabId }, () => {
					engine.selectTab(tabId)
					focusTab(tabId)
				})
			})
			tab.addEventListener('keydown', (e) => onTabKey(e, tabset, tabId))
		}

		const toolbar = el('div', 'dx-toolbar', bar)
		if (tabset.canFold)
			toolbarButton(
				toolbar,
				tabset.isFolded ? 'Unfold' : 'Fold',
				tabset.isFolded ? '▸' : '▾',
				() => engine.toggleFold(tabset.id)
			)
		if (tabset.canMaximize)
			toolbarButton(
				toolbar,
				tabset.isMaximized ? 'Restore' : 'Maximize',
				tabset.isMaximized ? '❐' : '□',
				() => engine.toggleMaximize(tabset.id)
			)
		bar.toggleAttribute(
			'data-dx-has-toolbar',
			toolbar.childElementCount > 0
		)
	}

	const focusTab = (tabId: string) =>
		root
			.querySelector<HTMLElement>(
				`.dx-tab[data-id="${CSS.escape(tabId)}"]`
			)
			?.focus()

	const onTabKey = (e: KeyboardEvent, tabset: TabsetState, tabId: string) => {
		const index = tabset.tabIds.indexOf(tabId)
		const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
		if (step) {
			const next =
				tabset.tabIds[
					(index + step + tabset.tabIds.length) % tabset.tabIds.length
				]
			engine.selectTab(next)
			focusTab(next)
		} else if (e.key === 'Delete') closeTab(tabId)
		else if (e.altKey && e.key === '=') engine.toggleMaximize(tabset.id)
		else if (e.altKey && e.key === '-') engine.toggleFold(tabset.id)
		else return
		e.preventDefault()
	}

	const createTabBar = (tabsetId: string) => {
		const bar = el('div', 'dx-tab-bar', root)
		// Pressing the empty part of a tab bar drags the whole tabset.
		bar.addEventListener('pointerdown', (e) =>
			trackPress(e, { type: 'tabset', tabsetId })
		)
		bar.addEventListener('dblclick', (e) => {
			if ((e.target as HTMLElement).closest('.dx-toolbar')) return
			engine.toggleMaximize(tabsetId)
		})
		return bar
	}

	// --- Splitters ---

	const createSplitter = (splitterId: string) => {
		const splitter = el('div', 'dx-splitter', root)
		splitter.tabIndex = 0
		splitter.setAttribute('role', 'separator')
		splitter.addEventListener('pointerdown', (e) =>
			trackPress(e, { type: 'splitter', splitterId })
		)
		splitter.addEventListener('keydown', (e) => {
			const delta = {
				ArrowLeft: -10,
				ArrowUp: -10,
				ArrowRight: 10,
				ArrowDown: 10,
			}[e.key]
			if (!delta) return
			e.preventDefault()
			engine.moveSplitterBy(splitterId, delta)
		})
		return splitter
	}

	// --- Rendering ---

	/** Creates, updates and removes one element per id in `ids`. */
	const sync = <T>(
		elements: Map<string, HTMLElement>,
		items: ReadonlyMap<string, T>,
		create: (id: string) => HTMLElement,
		update: (element: HTMLElement, item: T, id: string) => void
	) => {
		elements.forEach((element, id) => {
			if (items.has(id)) return
			element.remove()
			elements.delete(id)
		})
		items.forEach((item, id) => {
			let element = elements.get(id)
			if (!element) elements.set(id, (element = create(id)))
			update(element, item, id)
		})
	}

	const render = (snapshot: LayoutSnapshot) => {
		const { rects } = snapshot

		sync(
			panels,
			snapshot.tabsets,
			() => el('div', 'dx-panel', root),
			(panel, tabset, id) => {
				panel.hidden = tabset.isHidden
				applyRect(panel, rects.tabsets.get(id)!)
			}
		)

		sync(bars, snapshot.tabsets, createTabBar, (bar, tabset, id) => {
			// Snapshots share unchanged tabset states, so `!==` means "redraw the tabs".
			if (barStates.get(id) !== tabset || !bar.firstChild) {
				fillTabBar(bar, tabset)
				barStates.set(id, tabset)
			}
			for (const tabId of tabset.tabIds) {
				const title = defs.get(tabId)?.title ?? tabId
				const label = bar.querySelector<HTMLElement>(
					`.dx-tab[data-id="${CSS.escape(tabId)}"] .dx-tab-title`
				)
				if (label && label.textContent !== title)
					label.textContent = title
			}
			const placement = getTabBarPlacement(
				rects.tabsets.get(id)!,
				tabset,
				tabBarHeight
			)
			bar.hidden = tabset.isHidden
			bar.toggleAttribute('data-dx-rotated', placement.isRotated)
			bar.toggleAttribute('data-dx-folded', tabset.isFolded)
			bar.style.transform = placement.isRotated ? 'rotate(90deg)' : ''
			applyRect(bar, placement.rect)
		})
		barStates.forEach((_, id) => {
			if (!snapshot.tabsets.has(id)) barStates.delete(id)
		})

		sync(
			contents,
			snapshot.tabs,
			(id) => {
				const content = el('div', 'dx-tab-content', root)
				content.setAttribute('role', 'tabpanel')
				const def = defs.get(id)
				if (def) content.append(def.content)
				return content
			},
			(content, tab) => {
				content.hidden = !tab.isVisible
				if (tab.isVisible)
					applyRect(
						content,
						getTabContentRect(
							rects.tabsets.get(tab.tabsetId)!,
							tabBarHeight
						)
					)
			}
		)

		sync(
			splitters,
			snapshot.splitters,
			createSplitter,
			(splitter, state, id) => {
				splitter.hidden = state.isHidden
				splitter.dataset.dxDirection = state.direction
				splitter.toggleAttribute('data-dx-locked', state.isLocked)
				splitter.setAttribute(
					'aria-orientation',
					state.direction === 'horizontal' ? 'vertical' : 'horizontal'
				)
				const bounds = engine.getSplitterBounds(id)
				if (bounds) {
					splitter.setAttribute(
						'aria-valuenow',
						String(Math.round(bounds.value))
					)
					splitter.setAttribute(
						'aria-valuemin',
						String(Math.round(bounds.min))
					)
					splitter.setAttribute(
						'aria-valuemax',
						String(Math.round(bounds.max))
					)
				}
				applyRect(splitter, rects.splitters.get(id)!)
			}
		)

		const box = snapshot.drag?.indicator
		indicator.hidden = !box
		if (box) applyRect(indicator, box)
	}

	const unsubscribe = engine.subscribe(render)
	resize()
	render(engine.getSnapshot())

	return {
		engine,
		setTabs(tabs) {
			defs = new Map(tabs.map((tab) => [tab.id, tab]))
			barStates.clear() // titles or closable may have changed
			engine.setTabs(tabs)
			render(engine.getSnapshot())
		},
		destroy() {
			stopDrag?.()
			resizeFrame.cancel()
			observer.disconnect()
			unsubscribe()
			engine.destroy()
			root.replaceChildren()
			root.classList.remove('dx-root')
		},
	}
}
