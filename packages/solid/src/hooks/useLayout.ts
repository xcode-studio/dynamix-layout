import {
	LayoutTree,
	DynamixLayoutCore,
	Node,
	NodeOptions,
	DropPreview,
	RootSide,
	createFrameScheduler,
	getNavbarDropPreview,
	getRootSplitPreview,
	getTabBodyRect,
	getTabsetDropPreview,
	getTabbarPlacement,
	isSameDropPreview,
	placeTabbar,
	setElementRect,
} from '@dynamix-layout/core'
import { createSignal, onCleanup, onMount } from 'solid-js'
import { useDynamixLayoutOptions } from '../types'

export const useDynamixLayout = ({
	tabOutput,
	rootId,
	layoutTree,
	updateJSON,
	dimensions,
	tabHeadHeight,
	enableTabbar,
	bondWidth,
	minTabHeight,
	minTabWidth,
	sliderUpdateTimeout,
	windowResizeTimeout,
	disableSliderTimeout,
	disableResizeTimeout,
	keyboardShortcuts = true,
	enableDoubleClickMaximize = true,
}: useDynamixLayoutOptions) => {
	const tabsetsRef = new Map<string, HTMLDivElement>()
	const slidersRef = new Map<string, HTMLDivElement>()
	const panelsRef = new Map<string, HTMLDivElement>()
	const tabsRef = new Map<string, HTMLDivElement>()
	const hoverElementRef = { current: undefined as HTMLDivElement | undefined }
	const rootSplitHoverEl: HTMLDivElement[] = []
	const [layoutJSON, setLayoutJSON] = createSignal<LayoutTree | undefined>(
		layoutTree
	)
	const [tabsets, setTabsets] = createSignal<Map<string, NodeOptions>>(
		new Map()
	)
	const [sliders, setSliders] = createSignal<Map<string, NodeOptions>>(
		new Map()
	)
	const [dragging, setDragging] = createSignal(false)
	let animationFrameRef: number | null = null
	const [isUpdating, setIsUpdating] = createSignal(false)
	const dragElemRef: {
		src?: HTMLDivElement
		des?: HTMLDivElement
		drag?: boolean
		area?: 'top' | 'bottom' | 'left' | 'right' | 'contain'
	} = {
		src: undefined,
		des: undefined,
		area: undefined,
		drag: false,
	}

	const dragSliderRef: {
		sliderId?: string
		isSliding?: boolean
	} = {
		sliderId: undefined,
		isSliding: false,
	}

	// A tabset can never be shorter than its tab bar, otherwise the bar spills
	// over the slider below it and the tab body gets a negative height.
	const minLayoutHeight = enableTabbar
		? Math.max(minTabHeight, tabHeadHeight)
		: minTabHeight

	const layoutInstance = new DynamixLayoutCore({
		tabs: tabOutput.keys,
		tree: layoutJSON(), // eslint-disable-line solid/reactivity
		minW: minTabWidth,
		minH: minLayoutHeight,
		bond: bondWidth,
		uqid: rootId,
		tabsIds: tabOutput.name,
		// A folded tabset shrinks to its tab bar.
		collapsedSize: enableTabbar ? tabHeadHeight : minLayoutHeight,
	})

	const updateTabsets = (nodes: Map<string, NodeOptions>) => {
		const newTabsets = new Map<string, NodeOptions>(nodes)
		setTabsets(newTabsets)
	}

	const updateSliders = (nodes: Map<string, NodeOptions>) => {
		const newSliders = new Map<string, NodeOptions>(nodes)
		setSliders(newSliders)
	}

	const updateAllTabBodyStyles = () => {
		const tabbarHeight = enableTabbar ? tabHeadHeight : 0

		Node.cache.tabOpts.get().forEach((node: NodeOptions, id: string) => {
			const tabEl = tabsRef.get(id)
			if (!tabEl) return

			const body = getTabBodyRect(node.nodDims, tabbarHeight)
			setElementRect(tabEl, body)
			// Empty bodies stay hidden so their borders/shadows don't bleed onto
			// the slider below.
			const visible =
				node.nodOpen && !node.nodFold && !node.nodHidden && body.h > 0
			tabEl.style.display = visible ? 'block' : 'none'
		})
	}

	const offNodes = Node.cache.nodOpts.onChange(
		(nodes: Map<string, NodeOptions>) => {
			nodes.forEach((node: NodeOptions, id: string) => {
				const panelEl = panelsRef.get(id)
				if (panelEl) setElementRect(panelEl, node.nodDims)

				const tabsetEl = tabsetsRef.get(id)
				if (tabsetEl && enableTabbar) {
					tabsetEl.toggleAttribute('data-dx-hidden', !!node.nodHidden)
					placeTabbar(
						tabsetEl,
						getTabbarPlacement(node, tabHeadHeight)
					)
				}
			})
		}
	)

	// Tab bodies must follow every engine update, including the deferred ones
	// scheduled when the resize/slider timeouts are enabled.
	const offTabs = Node.cache.tabOpts.onChange(() => updateAllTabBodyStyles())

	const offBonds = Node.cache.bndOpts.onChange(
		(nodes: Map<string, NodeOptions>) => {
			nodes.forEach((node: NodeOptions, id: string) => {
				const sliderEl = slidersRef.get(id)
				if (!sliderEl) return
				setElementRect(sliderEl, node.nodDims)
				sliderEl.toggleAttribute('data-dx-hidden', !!node.nodHidden)
				sliderEl.style.pointerEvents = node.nodLocked ? 'none' : ''
			})
		}
	)

	const sliderScheduler = createFrameScheduler(
		({ id, point }: { id: string; point: { x: number; y: number } }) =>
			layoutInstance.updateSlider(
				id,
				point,
				disableSliderTimeout,
				sliderUpdateTimeout
			)
	)

	const onPointerMove = (e: PointerEvent) => {
		const id = dragSliderRef.sliderId
		if (!dragSliderRef.isSliding || !id) return

		sliderScheduler.schedule({ id, point: { x: e.clientX, y: e.clientY } })
	}

	const onPointerUp = (e: PointerEvent) => {
		if (!dragSliderRef.isSliding) return

		sliderScheduler.flush()

		const sliderElement = e.currentTarget as HTMLDivElement
		dragSliderRef.isSliding = false
		dragSliderRef.sliderId = undefined
		setDragging(false)

		if (updateJSON) updateJSON(DynamixLayoutCore._root.toJSON())
		sliderElement.releasePointerCapture(e.pointerId)
		sliderElement.removeEventListener('pointermove', onPointerMove)
		sliderElement.removeEventListener('pointerup', onPointerUp)
		sliderElement.removeEventListener('pointercancel', onPointerUp)
	}

	const onPointerDown = (e: PointerEvent) => {
		e.preventDefault()

		const sliderElement = e.currentTarget as HTMLDivElement
		dragSliderRef.isSliding = true
		dragSliderRef.sliderId = sliderElement.id
		// Applies `.is-dragging`, so iframes and editors inside tab bodies
		// cannot swallow pointer events while the slider is being dragged.
		setDragging(true)

		sliderElement.setPointerCapture(e.pointerId)

		sliderElement.addEventListener('pointermove', onPointerMove)
		sliderElement.addEventListener('pointerup', onPointerUp)
		sliderElement.addEventListener('pointercancel', onPointerUp)
	}

	let lastHoverState: Partial<DropPreview> = {}

	const findDropTargetTabset = (
		clientX: number,
		clientY: number,
		target: HTMLDivElement
	) => {
		if (!hoverElementRef.current || !dragElemRef || !target) {
			return null
		}

		const preview = getTabsetDropPreview(
			target.getBoundingClientRect(),
			clientX,
			clientY
		)
		updateHoverElement(preview)
		dragElemRef.des = target
		dragElemRef.area = preview.area
	}

	const handleNavbarDragOver = (e: DragEvent) => {
		e.preventDefault()
		e.stopPropagation()

		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move'
		}

		const navbarElement = e.currentTarget as HTMLDivElement
		// A folded strip shows its tab bar rotated; label boxes are vertical
		// there, so the whole strip is the target and drops go into the tabset.
		if (navbarElement.hasAttribute('data-rotated')) {
			if (!hoverElementRef.current || !dragElemRef) return
			const r = navbarElement.getBoundingClientRect()
			updateHoverElement({
				area: 'contain',
				left: r.left,
				top: r.top,
				width: r.width,
				height: r.height,
			})
			dragElemRef.des = navbarElement
			dragElemRef.area = 'contain'
			return
		}

		// Only tab labels: the tab bar also holds the maximize/fold toolbar.
		const tabElems = Array.from(
			navbarElement.querySelectorAll<HTMLDivElement>(
				':scope > [data-type="tab"]'
			)
		)
		if (!hoverElementRef.current || !dragElemRef) return

		const preview = getNavbarDropPreview(
			navbarElement.getBoundingClientRect(),
			tabElems.map((tab) => tab.getBoundingClientRect()),
			e.clientX,
			e.clientY
		)
		if (!preview) return

		updateHoverElement(preview)
		dragElemRef.des = tabElems[preview.index]
		dragElemRef.area = preview.area
	}

	const handleRootSplit = (e: DragEvent) => {
		e.preventDefault()
		e.stopPropagation()

		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move'
		}

		const target = e.currentTarget as HTMLDivElement
		const { area, uid } = target.dataset
		if (!area || !uid || !hoverElementRef.current || !dragElemRef) {
			return
		}

		const side = area as RootSide
		dragElemRef.des = target
		dragElemRef.area = side
		updateHoverElement(getRootSplitPreview(dimensions(), side))
	}

	const updateHoverElement = (preview: DropPreview) => {
		const hoverEl = hoverElementRef.current
		if (!hoverEl || isSameDropPreview(lastHoverState, preview)) return

		Object.assign(hoverEl.style, {
			left: `${preview.left}px`,
			top: `${preview.top}px`,
			width: `${preview.width}px`,
			height: `${preview.height}px`,
			display: 'block',
			zIndex: '100',
		})
		lastHoverState = preview
	}

	// --- Maximize / fold ---
	let activeTabset: string | null = null

	const refreshViewState = () => {
		updateTabsets(Node.cache.nodOpts.get())
		updateSliders(Node.cache.bndOpts.get())
		updateAllTabBodyStyles()
		if (updateJSON) updateJSON(DynamixLayoutCore._root.toJSON())
	}

	const toggleMaximize = (tabsetId: string) => {
		if (layoutInstance.toggleMaximize(tabsetId)) refreshViewState()
	}

	const toggleCollapse = (tabsetId: string) => {
		if (layoutInstance.toggleCollapse(tabsetId)) refreshViewState()
	}

	/** Remembers which tabset the user last touched, for the shortcuts. */
	const onRootPointerDown = (e: PointerEvent) => {
		const el = (e.target as HTMLElement).closest<HTMLElement>('[data-uid]')
		const node = el?.dataset.uid
			? Node.cache.mapElem.get(el.dataset.uid)
			: undefined
		if (!(node instanceof Node)) return
		if (node.type === 'tabset') activeTabset = node.unId
		else if (node.type === 'tab' && node.host) activeTabset = node.host.unId
	}

	const onTabbarDoubleClick = (e: MouseEvent) => {
		const id = (e.currentTarget as HTMLElement).dataset.uid
		if (enableDoubleClickMaximize && id) toggleMaximize(id)
	}

	const onKeyDown = (e: KeyboardEvent) => {
		if (!keyboardShortcuts || !e.altKey || e.ctrlKey || e.metaKey) return
		const id = activeTabset ?? layoutInstance.maximizedId
		if (!id) return

		if (e.code === 'Equal' || e.code === 'NumpadAdd') {
			e.preventDefault()
			toggleMaximize(id)
		} else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
			e.preventDefault()
			toggleCollapse(id)
		}
	}

	const onDragStart = (e: DragEvent) => {
		e.stopPropagation()
		// Every drop target must be visible while dragging.
		if (layoutInstance.restore()) refreshViewState()
		setDragging(true)
		document.body.style.cursor = 'move'
		if (e.currentTarget) {
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = 'move'

				const dragImage = document.createElement('div')
				dragImage.style.width = '1px'
				dragImage.style.height = '1px'
				dragImage.style.backgroundColor = 'transparent'
				dragImage.style.position = 'absolute'
				dragImage.style.top = '-1000px'
				document.body.appendChild(dragImage)

				e.dataTransfer.setDragImage(dragImage, 0, 0)

				setTimeout(() => {
					if (dragImage.parentNode) {
						dragImage.parentNode.removeChild(dragImage)
					}
				}, 0)
			}

			rootSplitHoverEl.forEach((el) => {
				if (el) {
					el.style.display = 'block'
					el.style.zIndex = '99'
				}
			})

			panelsRef.forEach((el) => {
				if (el) {
					el.style.display = 'block'
					el.style.zIndex = '95'
				}
			})

			dragElemRef.src = e.currentTarget as HTMLDivElement
			dragElemRef.drag = true
		}
	}

	const onDragOver = (e: DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		document.body.style.cursor = 'move'

		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move'
		}

		if (!dragElemRef?.src) {
			return
		}

		const target = e.currentTarget as HTMLDivElement
		const clientX = e.clientX
		const clientY = e.clientY

		if (animationFrameRef) {
			cancelAnimationFrame(animationFrameRef)
		}

		animationFrameRef = requestAnimationFrame(() => {
			findDropTargetTabset(clientX, clientY, target)
		})
	}

	const onDragEnd = () => {
		document.body.style.cursor = 'default'
		rootSplitHoverEl.forEach((el) => {
			if (el) {
				el.style.display = 'none'
				el.style.zIndex = '-1'
			}
		})

		if (animationFrameRef) {
			cancelAnimationFrame(animationFrameRef)
			animationFrameRef = null
		}

		if (hoverElementRef.current) {
			hoverElementRef.current.style.display = 'none'
			hoverElementRef.current.style.zIndex = '-1'
		}

		lastHoverState = {}
		dragElemRef.drag = false

		if (!dragElemRef?.src || !dragElemRef?.des) {
			dragElemRef.area = undefined
			dragElemRef.src = undefined
			dragElemRef.des = undefined

			setDragging(false)
			return
		}

		if (dragElemRef.src === dragElemRef.des) {
			dragElemRef.area = undefined
			dragElemRef.src = undefined
			dragElemRef.des = undefined

			setDragging(false)
			return
		}

		if (dragElemRef.src && dragElemRef.des) {
			if (!dragElemRef.area) {
				console.warn('No area specified for drag and drop')

				setDragging(false)
				return
			}

			const result = layoutInstance.updateTree(
				dragElemRef.src.dataset.uid as string,
				dragElemRef.des.dataset.uid as string,
				dragElemRef.area || 'contain'
			)

			if (!result) {
				console.warn('Failed to update layout tree')

				setDragging(false)
				return
			}

			requestAnimationFrame(() => {
				updateTabsets(Node.cache.nodOpts.get())
				updateSliders(Node.cache.bndOpts.get())
				updateAllTabBodyStyles()
				if (updateJSON) updateJSON(DynamixLayoutCore._root.toJSON())
			})
		}

		dragElemRef.area = undefined
		dragElemRef.src = undefined
		dragElemRef.des = undefined

		setDragging(false)
	}

	const onDragEnter = (e: DragEvent) => {
		e.preventDefault()
		e.stopPropagation()

		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move'
		}
	}

	const onDragLeave = (e: DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
	}

	const onDrop = (e: DragEvent) => {
		e.preventDefault()
		e.stopPropagation()

		if (e.dataTransfer) {
			e.dataTransfer.getData('text/plain')
		}
	}

	const updateActiveTab = (e: MouseEvent) => {
		const target = e.currentTarget as HTMLDivElement
		const uid = target.dataset.uid

		if (!uid) return

		const node = Node.cache.mapElem.get(uid)

		if (!(node instanceof Node)) {
			console.warn(`Element with uid ${uid} is not a Node instance`)
			return
		}

		if (!node || !node.host || !node.host.unId) {
			console.warn(`Node with uid ${uid} not found in mapNode`)
			return
		}

		if (node.host.open == node.name) {
			console.warn(`Node ${node.name} is already open`)
			return
		}

		const nodeOpts = Node.cache.nodOpts.get().get(node.host.unId)

		if (!nodeOpts) return

		if (nodeOpts.nodOpen && node?.open) {
			return
		}

		// Update the state in the cache
		node.host.open = node.name
		nodeOpts.nodOpen = node.name
		nodeOpts.nodKids?.forEach((kid: NodeOptions) => {
			kid.nodOpen = kid.nodName === node.name
		})

		const childNodes = target?.parentElement
			?.childNodes as NodeListOf<HTMLDivElement>

		childNodes?.forEach((child) => {
			if (child instanceof HTMLDivElement && child.dataset.uid !== uid) {
				child.dataset.state = 'inactive'
			} else {
				child.dataset.state = 'active'
			}
		})

		updateAllTabBodyStyles()
	}

	onMount(() => {
		const updateDimension = (flag: boolean) => {
			layoutInstance.updateDimension(
				dimensions(),
				flag,
				windowResizeTimeout
			)
		}

		updateDimension(true)

		const handler = () => updateDimension(disableResizeTimeout ?? false)

		window.addEventListener('resize', handler)
		window.addEventListener('keydown', onKeyDown)

		updateTabsets(Node.cache.nodOpts.get())
		updateSliders(Node.cache.bndOpts.get())

		updateAllTabBodyStyles()

		if (updateJSON) updateJSON(DynamixLayoutCore._root.toJSON())

		onCleanup(() => {
			window.removeEventListener('resize', handler)
			window.removeEventListener('keydown', onKeyDown)
			offNodes()
			offBonds()
			offTabs()

			sliderScheduler.cancel()

			if (animationFrameRef) {
				cancelAnimationFrame(animationFrameRef)
			}
		})
	})

	return {
		tabsets,
		sliders,
		tabsetsRef,
		panelsRef,
		tabsRef,
		slidersRef,
		layoutJSON,
		layoutInstance,
		hoverElementRef,
		rootSplitHoverEl,
		dragging,
		isUpdating,
		/** @deprecated Internal state setter; will be removed in v2. */
		setIsUpdating,
		/** @deprecated Internal state setter; will be removed in v2. */
		setDragging,
		/** @deprecated Internal state setter; will be removed in v2. */
		setTabsets,
		/** @deprecated Internal state setter; will be removed in v2. */
		setSliders,
		/** @deprecated Internal state setter; will be removed in v2. */
		setLayoutJSON,
		onDragStart,
		onDragOver,
		onDragEnd,
		onDragEnter,
		onDragLeave,
		onDrop,
		onPointerDown,
		updateActiveTab,
		handleRootSplit,
		handleNavbarDragOver,
		toggleMaximize,
		toggleCollapse,
		onRootPointerDown,
		onTabbarDoubleClick,
	}
}
