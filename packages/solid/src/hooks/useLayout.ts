import {
	Dimension,
	LayoutTree,
	DynamixLayoutCore,
	Node,
	NodeOptions,
} from '@dynamix-layout/core'
import { createSignal, onCleanup, onMount } from 'solid-js'
import { useDynamixLayoutOptions } from '../types'

const setElementRect = (el: HTMLElement, { x, y, w, h }: Dimension) => {
	el.style.left = `${x}px`
	el.style.top = `${y}px`
	el.style.width = `${w}px`
	el.style.height = `${h}px`
}

/** Area of a tabset below its tab bar; never negative when squeezed. */
const getTabBodyRect = (
	tabset: Dimension,
	tabbarHeight: number
): Dimension => ({
	x: tabset.x,
	y: tabset.y + tabbarHeight,
	w: tabset.w,
	h: Math.max(0, tabset.h - tabbarHeight),
})

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
			tabEl.style.display = node.nodOpen && body.h > 0 ? 'block' : 'none'
		})
	}

	const offNodes = Node.cache.nodOpts.onChange(
		(nodes: Map<string, NodeOptions>) => {
			nodes.forEach((node: NodeOptions, id: string) => {
				const panelEl = panelsRef.get(id)
				if (panelEl) setElementRect(panelEl, node.nodDims)

				const tabsetEl = tabsetsRef.get(id)
				if (tabsetEl && enableTabbar) {
					setElementRect(tabsetEl, {
						...node.nodDims,
						h: tabHeadHeight,
					})
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
				if (sliderEl) setElementRect(sliderEl, node.nodDims)
			})
		}
	)

	// Pointer events can fire several times per frame; coalesce them so the
	// layout is recomputed at most once per animation frame.
	let pendingSliderPoint: { x: number; y: number } | null = null
	let sliderFrame: number | null = null

	const flushSliderUpdate = () => {
		sliderFrame = null
		const point = pendingSliderPoint
		const sliderId = dragSliderRef.sliderId
		pendingSliderPoint = null
		if (!point || !sliderId) return

		layoutInstance.updateSlider(
			sliderId,
			point,
			disableSliderTimeout,
			sliderUpdateTimeout
		)
	}

	const onPointerMove = (e: PointerEvent) => {
		if (!dragSliderRef.isSliding) return

		pendingSliderPoint = { x: e.clientX, y: e.clientY }
		if (sliderFrame === null) {
			sliderFrame = requestAnimationFrame(flushSliderUpdate)
		}
	}

	const onPointerUp = (e: PointerEvent) => {
		if (!dragSliderRef.isSliding) return

		if (sliderFrame !== null) {
			cancelAnimationFrame(sliderFrame)
			flushSliderUpdate()
		}

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

	const lastHoverState: {
		area?: string
		left?: number
		top?: number
		width?: number
		height?: number
	} = {}

	const findDropTargetTabset = (
		clientX: number,
		clientY: number,
		target: HTMLDivElement
	) => {
		if (!hoverElementRef.current || !dragElemRef || !target) {
			return null
		}

		dragElemRef.des = target

		const rect = target.getBoundingClientRect()
		if (!rect) return null

		const w = rect.width
		const h = rect.height
		const x = clientX - rect.left
		const y = clientY - rect.top

		let newArea: string
		let newLeft: number
		let newTop: number
		let newWidth: number
		let newHeight: number

		if (x < w / 3) {
			newArea = 'left'
			newLeft = rect.left
			newTop = rect.top
			newWidth = w / 2
			newHeight = h
		} else if (x > (2 * w) / 3) {
			newArea = 'right'
			newLeft = rect.left + w / 2
			newTop = rect.top
			newWidth = w / 2
			newHeight = h
		} else if (y < h / 3) {
			newArea = 'top'
			newLeft = rect.left
			newTop = rect.top
			newWidth = w
			newHeight = h / 2
		} else if (y > (2 * h) / 3) {
			newArea = 'bottom'
			newLeft = rect.left
			newTop = rect.top + h / 2
			newWidth = w
			newHeight = h / 2
		} else {
			newArea = 'contain'
			newLeft = rect.left + w * 0.1
			newTop = rect.top + h * 0.1
			newWidth = w * 0.8
			newHeight = h * 0.8
		}

		if (
			lastHoverState.area !== newArea ||
			lastHoverState.left !== newLeft ||
			lastHoverState.top !== newTop ||
			lastHoverState.width !== newWidth ||
			lastHoverState.height !== newHeight
		) {
			updateHoverElement(newLeft, newTop, newWidth, newHeight, newArea)

			lastHoverState.area = newArea
			lastHoverState.left = newLeft
			lastHoverState.top = newTop
			lastHoverState.width = newWidth
			lastHoverState.height = newHeight
		}

		dragElemRef.area = newArea as
			| 'top'
			| 'bottom'
			| 'left'
			| 'right'
			| 'contain'
	}

	const handleNavbarDragOver = (e: DragEvent) => {
		e.preventDefault()
		e.stopPropagation()

		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move'
		}

		const navbarElement = e.currentTarget as HTMLDivElement
		const tabElems = Array.from(
			navbarElement.childNodes
		) as HTMLDivElement[]

		const clientX = e.clientX
		const clientY = e.clientY

		if (!hoverElementRef.current || !dragElemRef || tabElems.length === 0)
			return

		const navbarContainer = tabElems[0].parentElement
		if (!navbarContainer) return

		const navbarRect = navbarContainer.getBoundingClientRect()
		const firstTab = tabElems[0]
		const lastTab = tabElems[tabElems.length - 1]
		const firstRect = firstTab.getBoundingClientRect()
		const lastRect = lastTab.getBoundingClientRect()
		let tabsGap = 6

		if (clientY < navbarRect.top || clientY > navbarRect.bottom) return

		if (clientX > lastRect.right) {
			const newLeft = lastRect.right + 1
			const newTop = lastRect.top
			const newWidth = tabsGap - 2
			const newHeight = lastRect.height
			const newArea = 'right'

			updateHoverElement(newLeft, newTop, newWidth, newHeight, newArea)
			dragElemRef.des = lastTab
			dragElemRef.area = newArea as
				| 'top'
				| 'bottom'
				| 'left'
				| 'right'
				| 'contain'
			return
		}

		if (clientX < firstRect.left) {
			const newLeft = firstRect.left - tabsGap + 1
			const newTop = firstRect.top
			const newWidth = tabsGap - 2
			const newHeight = firstRect.height
			const newArea = 'left'

			updateHoverElement(newLeft, newTop, newWidth, newHeight, newArea)
			dragElemRef.des = firstTab
			dragElemRef.area = newArea as
				| 'top'
				| 'bottom'
				| 'left'
				| 'right'
				| 'contain'
			return
		}

		let closestTab = null
		let minDistance = Infinity
		let isLeftSide = false
		let index = 0

		for (let i = 0; i < tabElems.length; i++) {
			const tabRect = tabElems[i].getBoundingClientRect()
			const tabCenterX = tabRect.left + tabRect.width / 2
			const distance = Math.abs(clientX - tabCenterX)

			if (distance < minDistance) {
				minDistance = distance
				closestTab = tabElems[i]
				isLeftSide = clientX < tabCenterX
				index = i
			}
		}

		if (
			tabElems.length > 1 &&
			((isLeftSide && index > 0) ||
				(!isLeftSide && index < tabElems.length - 1))
		) {
			tabsGap = tabElems[1].getBoundingClientRect().left - firstRect.right
		}

		if (closestTab) {
			const tabRect = closestTab.getBoundingClientRect()
			const newLeft = isLeftSide
				? tabRect.left - tabsGap + 1
				: tabRect.right + 1
			const newTop = tabRect.top
			const newWidth = tabsGap - 2
			const newHeight = tabRect.height
			const newArea = isLeftSide ? 'left' : 'right'

			updateHoverElement(newLeft, newTop, newWidth, newHeight, newArea)
			dragElemRef.des = closestTab
			dragElemRef.area = newArea as
				| 'top'
				| 'bottom'
				| 'left'
				| 'right'
				| 'contain'
		}
	}

	const handleRootSplit = (e: DragEvent) => {
		e.preventDefault()
		e.stopPropagation()

		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move'
		}

		const dataArea = (e.currentTarget as HTMLDivElement).dataset.area
		const dataUid = (e.currentTarget as HTMLDivElement).dataset.uid

		if (!dataArea || !dataUid || !hoverElementRef.current || !dragElemRef) {
			return
		}

		dragElemRef.des = e.currentTarget as HTMLDivElement
		dragElemRef.area = dataArea as 'top' | 'bottom' | 'left' | 'right'

		const dimension = dimensions()

		let newLeft = dimension.x
		let newTop = dimension.y
		let newWidth = dimension.w
		let newHeight = dimension.h
		if (dataArea === 'left') {
			newLeft = dimension.x
			newTop = dimension.y
			newWidth = dimension.w / 2
			newHeight = dimension.h
		} else if (dataArea === 'right') {
			newLeft = dimension.x + dimension.w / 2
			newTop = dimension.y
			newWidth = dimension.w / 2
			newHeight = dimension.h
		} else if (dataArea === 'top') {
			newLeft = dimension.x
			newTop = dimension.y
			newWidth = dimension.w
			newHeight = dimension.h / 2
		} else if (dataArea === 'bottom') {
			newLeft = dimension.x
			newTop = dimension.y + dimension.h / 2
			newWidth = dimension.w
			newHeight = dimension.h / 2
		}

		updateHoverElement(newLeft, newTop, newWidth, newHeight, dataArea)
	}

	const updateHoverElement = (
		newLeft: number,
		newTop: number,
		newWidth: number,
		newHeight: number,
		newArea: string
	) => {
		if (
			lastHoverState.area !== newArea ||
			lastHoverState.left !== newLeft ||
			lastHoverState.top !== newTop ||
			lastHoverState.width !== newWidth ||
			lastHoverState.height !== newHeight
		) {
			const hoverEl = hoverElementRef.current
			if (hoverEl) {
				const styleClone: Record<string, string> = {}

				for (let i = 0; i < hoverEl.style.length; i++) {
					const propName = hoverEl.style[i]
					if (propName) {
						styleClone[propName] =
							hoverEl.style.getPropertyValue(propName)
					}
				}

				Object.assign(hoverEl.style, styleClone, {
					left: `${newLeft}px`,
					top: `${newTop}px`,
					width: `${newWidth}px`,
					height: `${newHeight}px`,
					display: 'block',
					'z-index': '100',
				})

				lastHoverState.area = newArea
				lastHoverState.left = newLeft
				lastHoverState.top = newTop
				lastHoverState.width = newWidth
				lastHoverState.height = newHeight
			}
		}
	}

	const onDragStart = (e: DragEvent) => {
		e.stopPropagation()
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

	const onDragEnd = (e: DragEvent) => { // eslint-disable-line @typescript-eslint/no-unused-vars
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

		Object.assign(lastHoverState, {})
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

		updateTabsets(Node.cache.nodOpts.get())
		updateSliders(Node.cache.bndOpts.get())

		updateAllTabBodyStyles()

		if (updateJSON) updateJSON(DynamixLayoutCore._root.toJSON())

		onCleanup(() => {
			window.removeEventListener('resize', handler)
			offNodes()
			offBonds()
			offTabs()

			if (sliderFrame !== null) {
				cancelAnimationFrame(sliderFrame)
				sliderFrame = null
			}

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
		setIsUpdating,
		setDragging,
		setTabsets,
		setSliders,
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
	}
}
