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
import React, { useState, useEffect } from 'react'
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
	const tabsetsRef = React.useRef(new Map<string, HTMLDivElement>())
	const slidersRef = React.useRef(new Map<string, HTMLDivElement>())
	const panelsRef = React.useRef(new Map<string, HTMLDivElement>())
	const tabsRef = React.useRef(new Map<string, HTMLDivElement>())
	const hoverElementRef = React.useRef<HTMLDivElement>(null)
	const rootSplitHoverEl = React.useRef<HTMLDivElement[]>([])
	const [layoutJSON, setLayoutJSON] = useState<LayoutTree | undefined>(
		layoutTree
	)
	const [tabsets, setTabsets] = useState<Map<string, NodeOptions>>()
	const [sliders, setSliders] = useState<Map<string, NodeOptions>>()
	const [dragging, setDragging] = useState(false)
	const animationFrameRef = React.useRef<number | null>(null)
	const [isUpdating, setIsUpdating] = useState(false)
	const dragElemRef = React.useRef<{
		src?: HTMLDivElement
		des?: HTMLDivElement
		drag?: boolean
		area?: 'top' | 'bottom' | 'left' | 'right' | 'contain'
	} | null>({
		src: undefined,
		des: undefined,
		area: undefined,
		drag: false,
	})

	// --- REFACTORED: Using Pointer Events for Slider ---
	const dragSliderRef = React.useRef<{
		sliderId?: string
		isSliding?: boolean
	}>({
		sliderId: undefined,
		isSliding: false,
	})

	// A tabset can never be shorter than its tab bar, otherwise the bar spills
	// over the slider below it and the tab body gets a negative height.
	const minLayoutHeight = enableTabbar
		? Math.max(minTabHeight, tabHeadHeight)
		: minTabHeight

	const layoutInstance = React.useMemo(() => {
		DynamixLayoutCore._bond = bondWidth
		DynamixLayoutCore._minH = minLayoutHeight
		DynamixLayoutCore._minW = minTabWidth

		const LT = new DynamixLayoutCore({
			tabs: tabOutput.keys,
			tree: layoutJSON,
			minW: minTabWidth,
			minH: minLayoutHeight,
			bond: bondWidth,
			uqid: rootId,
			tabsIds: tabOutput.name,
			// A folded tabset shrinks to its tab bar.
			collapsedSize: enableTabbar ? tabHeadHeight : minLayoutHeight,
		})
		return LT
	}, [
		layoutJSON,
		tabOutput,
		bondWidth,
		minLayoutHeight,
		minTabWidth,
		rootId,
		enableTabbar,
		tabHeadHeight,
	])

	const updateTabsets = (nodes: Map<string, NodeOptions>) => {
		const newTabsets = new Map<string, NodeOptions>(nodes)
		setTabsets(newTabsets)
	}

	const updateSliders = (nodes: Map<string, NodeOptions>) => {
		const newSliders = new Map<string, NodeOptions>(nodes)
		setSliders(newSliders)
	}

	// Read through refs so the subscriptions below never need to be recreated.
	const enableTabbarRef = React.useRef(enableTabbar)
	const tabHeadHeightRef = React.useRef(tabHeadHeight)
	enableTabbarRef.current = enableTabbar
	tabHeadHeightRef.current = tabHeadHeight

	useEffect(() => {
		const offNodes = Node.cache.nodOpts.onChange(
			(nodes: Map<string, NodeOptions>) => {
				nodes.forEach((node: NodeOptions, id: string) => {
					const panelEl = panelsRef.current.get(id)
					if (panelEl) setElementRect(panelEl, node.nodDims)

					const tabsetEl = tabsetsRef.current.get(id)
					if (tabsetEl && enableTabbarRef.current) {
						tabsetEl.toggleAttribute(
							'data-dx-hidden',
							!!node.nodHidden
						)
						placeTabbar(
							tabsetEl,
							getTabbarPlacement(node, tabHeadHeightRef.current)
						)
					}
				})
			}
		)

		const offBonds = Node.cache.bndOpts.onChange(
			(nodes: Map<string, NodeOptions>) => {
				nodes.forEach((node: NodeOptions, id: string) => {
					const sliderEl = slidersRef.current.get(id)
					if (!sliderEl) return
					setElementRect(sliderEl, node.nodDims)
					sliderEl.toggleAttribute('data-dx-hidden', !!node.nodHidden)
					sliderEl.style.pointerEvents = node.nodLocked ? 'none' : ''
				})
			}
		)

		const offTabs = Node.cache.tabOpts.onChange(
			(nodes: Map<string, NodeOptions>) => {
				const tabbarHeight = enableTabbarRef.current
					? tabHeadHeightRef.current
					: 0

				nodes.forEach((node: NodeOptions, id: string) => {
					const tabEl = tabsRef.current.get(id)
					if (!tabEl) return

					const body = getTabBodyRect(node.nodDims, tabbarHeight)
					setElementRect(tabEl, body)
					// Empty bodies stay hidden so their borders/shadows don't
					// bleed onto the slider below.
					const visible =
						node.nodOpen &&
						!node.nodFold &&
						!node.nodHidden &&
						body.h > 0
					tabEl.style.display = visible ? 'block' : 'none'
				})
			}
		)

		return () => {
			offNodes()
			offBonds()
			offTabs()
		}
	}, [])

	// --- START: SLIDER POINTER EVENT HANDLERS ---
	const sliderScheduler = React.useMemo(
		() =>
			createFrameScheduler(
				({
					id,
					point,
				}: {
					id: string
					point: { x: number; y: number }
				}) =>
					layoutInstance.updateSlider(
						id,
						point,
						disableSliderTimeout,
						sliderUpdateTimeout
					)
			),
		[layoutInstance, disableSliderTimeout, sliderUpdateTimeout]
	)

	useEffect(() => () => sliderScheduler.cancel(), [sliderScheduler])

	const onPointerMove = (e: PointerEvent) => {
		const id = dragSliderRef.current.sliderId
		if (!dragSliderRef.current.isSliding || !id) return

		sliderScheduler.schedule({ id, point: { x: e.clientX, y: e.clientY } })
	}

	const onPointerUp = (e: PointerEvent) => {
		if (!dragSliderRef.current.isSliding) return

		sliderScheduler.flush()

		const sliderElement = e.currentTarget as HTMLDivElement
		dragSliderRef.current.isSliding = false
		dragSliderRef.current.sliderId = undefined
		setDragging(false)

		if (updateJSON) updateJSON(DynamixLayoutCore._root.toJSON())
		sliderElement.releasePointerCapture(e.pointerId)
		sliderElement.removeEventListener('pointermove', onPointerMove)
		sliderElement.removeEventListener('pointerup', onPointerUp)
		sliderElement.removeEventListener('pointercancel', onPointerUp)
	}

	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		e.preventDefault()

		const sliderElement = e.currentTarget
		dragSliderRef.current.isSliding = true
		dragSliderRef.current.sliderId = sliderElement.id
		// Applies `.is-dragging`, so iframes and editors inside tab bodies
		// cannot swallow pointer events while the slider is being dragged.
		setDragging(true)

		// Capture the pointer to ensure events are received
		sliderElement.setPointerCapture(e.pointerId)

		// Add listeners
		sliderElement.addEventListener('pointermove', onPointerMove)
		sliderElement.addEventListener('pointerup', onPointerUp)
		sliderElement.addEventListener('pointercancel', onPointerUp)
	}
	// --- END: SLIDER POINTER EVENT HANDLERS ---

	const lastHoverState = React.useRef<Partial<DropPreview>>({})

	const findDropTargetTabset = (
		clientX: number,
		clientY: number,
		target: HTMLDivElement
	) => {
		if (!hoverElementRef.current || !dragElemRef.current || !target) {
			return null
		}

		const preview = getTabsetDropPreview(
			target.getBoundingClientRect(),
			clientX,
			clientY
		)
		updateHoverElement(preview)
		dragElemRef.current.des = target
		dragElemRef.current.area = preview.area
	}

	const handleNavbarDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()

		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move'
		}

		// Only tab labels: the tab bar also holds the maximize/fold toolbar.
		const tabElems = Array.from(
			e.currentTarget.querySelectorAll<HTMLDivElement>(
				':scope > [data-type="tab"]'
			)
		)
		if (!hoverElementRef.current || !dragElemRef.current) return

		const preview = getNavbarDropPreview(
			e.currentTarget.getBoundingClientRect(),
			tabElems.map((tab) => tab.getBoundingClientRect()),
			e.clientX,
			e.clientY
		)
		if (!preview) return

		updateHoverElement(preview)
		dragElemRef.current.des = tabElems[preview.index]
		dragElemRef.current.area = preview.area
	}

	const handleRootSplit = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()

		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move'
		}

		const { area, uid } = e.currentTarget.dataset
		if (!area || !uid || !hoverElementRef.current || !dragElemRef.current) {
			return
		}

		const side = area as RootSide
		dragElemRef.current.des = e.currentTarget
		dragElemRef.current.area = side
		updateHoverElement(getRootSplitPreview(dimensions(), side))
	}

	const updateHoverElement = (preview: DropPreview) => {
		const hoverEl = hoverElementRef.current
		if (!hoverEl || isSameDropPreview(lastHoverState.current, preview))
			return

		Object.assign(hoverEl.style, {
			left: `${preview.left}px`,
			top: `${preview.top}px`,
			width: `${preview.width}px`,
			height: `${preview.height}px`,
			display: 'block',
			zIndex: '100',
		})
		lastHoverState.current = preview
	}

	// --- Maximize / fold ---
	const activeTabsetRef = React.useRef<string | null>(null)

	const refreshViewState = () => {
		updateTabsets(Node.cache.nodOpts.get())
		updateSliders(Node.cache.bndOpts.get())
		if (updateJSON) updateJSON(DynamixLayoutCore._root.toJSON())
	}

	const toggleMaximize = (tabsetId: string) => {
		if (layoutInstance.toggleMaximize(tabsetId)) refreshViewState()
	}

	const toggleCollapse = (tabsetId: string) => {
		if (layoutInstance.toggleCollapse(tabsetId)) refreshViewState()
	}

	/** Remembers which tabset the user last touched, for the shortcuts. */
	const onRootPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		const el = (e.target as HTMLElement).closest<HTMLElement>('[data-uid]')
		const node = el?.dataset.uid
			? Node.cache.mapElem.get(el.dataset.uid)
			: undefined
		if (!(node instanceof Node)) return
		if (node.type === 'tabset') activeTabsetRef.current = node.unId
		else if (node.type === 'tab' && node.host) {
			activeTabsetRef.current = node.host.unId
		}
	}

	const onTabbarDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
		const id = e.currentTarget.dataset.uid
		if (enableDoubleClickMaximize && id) toggleMaximize(id)
	}

	useEffect(() => {
		if (!keyboardShortcuts) return

		const onKeyDown = (e: KeyboardEvent) => {
			if (!e.altKey || e.ctrlKey || e.metaKey) return
			const id = activeTabsetRef.current ?? layoutInstance.maximizedId
			if (!id) return

			if (e.code === 'Equal' || e.code === 'NumpadAdd') {
				e.preventDefault()
				toggleMaximize(id)
			} else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
				e.preventDefault()
				toggleCollapse(id)
			}
		}

		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	})

	const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
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

			rootSplitHoverEl.current.forEach((el) => {
				if (el) {
					el.style.display = 'block'
					el.style.zIndex = '99'
				}
			})

			panelsRef.current.forEach((el) => {
				if (el) {
					el.style.display = 'block'
					el.style.zIndex = '95'
				}
			})

			dragElemRef.current!.src = e.currentTarget as HTMLDivElement
			dragElemRef.current!.drag = true
		}
	}

	const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
		document.body.style.cursor = 'move'

		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move'
		}

		if (!dragElemRef.current?.src) {
			return
		}

		const target = e.currentTarget as HTMLDivElement
		const clientX = e.clientX
		const clientY = e.clientY

		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current)
		}

		animationFrameRef.current = requestAnimationFrame(() => {
			findDropTargetTabset(clientX, clientY, target)
		})
	}

	const onDragEnd = () => {
		document.body.style.cursor = 'default'
		rootSplitHoverEl.current.forEach((el) => {
			if (el) {
				el.style.display = 'none'
				el.style.zIndex = '-1'
			}
		})

		panelsRef.current.forEach((el) => {
			if (el) {
				el.style.display = 'none'
				el.style.zIndex = '-1'
			}
		})

		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current)
			animationFrameRef.current = null
		}

		if (hoverElementRef.current) {
			hoverElementRef.current.style.display = 'none'
			hoverElementRef.current.style.zIndex = '-1'
		}

		lastHoverState.current = {}
		dragElemRef.current!.drag = false

		if (!dragElemRef.current?.src || !dragElemRef.current?.des) {
			dragElemRef.current!.area = undefined
			dragElemRef.current!.src = undefined
			dragElemRef.current!.des = undefined

			setDragging(false)
			return
		}

		if (dragElemRef.current.src === dragElemRef.current.des) {
			dragElemRef.current!.area = undefined
			dragElemRef.current!.src = undefined
			dragElemRef.current!.des = undefined

			setDragging(false)
			return
		}

		if (dragElemRef.current.src && dragElemRef.current.des) {
			if (!dragElemRef.current.area) {
				console.warn('No area specified for drag and drop')

				setDragging(false)
				return
			}

			const result = layoutInstance.updateTree(
				dragElemRef.current.src.dataset.uid as string,
				dragElemRef.current.des.dataset.uid as string,
				dragElemRef.current.area || 'contain'
			)

			if (!result) {
				console.warn('Failed to update layout tree')

				setDragging(false)
				return
			}

			requestAnimationFrame(() => {
				updateTabsets(Node.cache.nodOpts.get())
				updateSliders(Node.cache.bndOpts.get())
				if (updateJSON) updateJSON(DynamixLayoutCore._root.toJSON())
			})
		}

		dragElemRef.current!.area = undefined
		dragElemRef.current!.src = undefined
		dragElemRef.current!.des = undefined

		setDragging(false)
	}

	const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()

		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move'
		}
	}

	const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
	}

	const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()
	}

	const updateActiveTab = (e: React.MouseEvent<HTMLElement>) => {
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

		node.host.open = node.name
		nodeOpts.nodOpen = node.name

		const childNodes = target?.parentElement
			?.childNodes as NodeListOf<HTMLDivElement>

		childNodes?.forEach((child) => {
			if (child instanceof HTMLDivElement && child.dataset.uid !== uid) {
				child.dataset.state = 'inactive'
			} else {
				child.dataset.state = 'active'
			}
		})

		nodeOpts.nodKids?.forEach((kid: NodeOptions) => {
			if (kid.nodName == node.name) {
				kid.nodOpen = true
				const tabbarHeight = enableTabbar ? tabHeadHeight : 0
				const body = getTabBodyRect(kid.nodDims, tabbarHeight)
				const visible = !kid.nodFold && !kid.nodHidden && body.h > 0
				tabsRef.current
					.get(kid.uidNode)
					?.style.setProperty('display', visible ? 'block' : 'none')
			} else {
				kid.nodOpen = false
				tabsRef.current
					.get(kid.uidNode)
					?.style.setProperty('display', 'none')
			}
		})
	}

	useEffect(() => {
		const updateDimension = (flag: boolean) => {
			layoutInstance.updateDimension(
				dimensions(),
				flag,
				windowResizeTimeout
			)
		}

		updateDimension(true)

		const handler = async (
			_: UIEvent // eslint-disable-line @typescript-eslint/no-unused-vars
		) => updateDimension(disableResizeTimeout ?? false)

		window.addEventListener('resize', handler)

		updateTabsets(Node.cache.nodOpts.get())
		updateSliders(Node.cache.bndOpts.get())

		Node.cache.nodOpts.triggerChange()
		Node.cache.bndOpts.triggerChange()
		Node.cache.tabOpts.triggerChange()

		if (updateJSON) updateJSON(DynamixLayoutCore._root.toJSON())
		return () => {
			window.removeEventListener('resize', handler)

			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current)
			}
		}
	}, [dimensions, disableResizeTimeout, windowResizeTimeout]) // eslint-disable-line

	useEffect(() => {
		Node.cache.nodOpts.triggerChange()
		Node.cache.bndOpts.triggerChange()
		Node.cache.tabOpts.triggerChange()
		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current)
			}
		}
	}, [tabsets, sliders])

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
