import {
	Dimension,
	LayoutTree,
	DynamixLayoutCore,
	Node,
	NodeOptions,
} from '@dynamix-layout/core'
import React, { useState, useEffect } from 'react'
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
		})
		return LT
	}, [layoutJSON, tabOutput, bondWidth, minLayoutHeight, minTabWidth, rootId])

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
						setElementRect(tabsetEl, {
							...node.nodDims,
							h: tabHeadHeightRef.current,
						})
					}
				})
			}
		)

		const offBonds = Node.cache.bndOpts.onChange(
			(nodes: Map<string, NodeOptions>) => {
				nodes.forEach((node: NodeOptions, id: string) => {
					const sliderEl = slidersRef.current.get(id)
					if (sliderEl) setElementRect(sliderEl, node.nodDims)
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
					tabEl.style.display =
						node.nodOpen && body.h > 0 ? 'block' : 'none'
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
	// Pointer events can fire several times per frame; coalesce them so the
	// layout is recomputed at most once per animation frame.
	const pendingSliderPointRef = React.useRef<{ x: number; y: number } | null>(
		null
	)
	const sliderFrameRef = React.useRef<number | null>(null)

	const flushSliderUpdate = () => {
		sliderFrameRef.current = null
		const point = pendingSliderPointRef.current
		const sliderId = dragSliderRef.current.sliderId
		pendingSliderPointRef.current = null
		if (!point || !sliderId) return

		layoutInstance.updateSlider(
			sliderId,
			point,
			disableSliderTimeout,
			sliderUpdateTimeout
		)
	}

	const onPointerMove = (e: PointerEvent) => {
		if (!dragSliderRef.current.isSliding) return

		pendingSliderPointRef.current = { x: e.clientX, y: e.clientY }
		if (sliderFrameRef.current === null) {
			sliderFrameRef.current = requestAnimationFrame(flushSliderUpdate)
		}
	}

	const onPointerUp = (e: PointerEvent) => {
		if (!dragSliderRef.current.isSliding) return

		if (sliderFrameRef.current !== null) {
			cancelAnimationFrame(sliderFrameRef.current)
			flushSliderUpdate()
		}

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

	const lastHoverState = React.useRef<{
		area?: string
		left?: number
		top?: number
		width?: number
		height?: number
	}>({})

	const findDropTargetTabset = (
		clientX: number,
		clientY: number,
		target: HTMLDivElement
	) => {
		if (!hoverElementRef.current || !dragElemRef.current || !target) {
			return null
		}

		dragElemRef.current.des = target

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

		const lastState = lastHoverState.current
		if (
			lastState.area !== newArea ||
			lastState.left !== newLeft ||
			lastState.top !== newTop ||
			lastState.width !== newWidth ||
			lastState.height !== newHeight
		) {
			updateHoverElement(newLeft, newTop, newWidth, newHeight, newArea)

			lastHoverState.current = {
				area: newArea,
				left: newLeft,
				top: newTop,
				width: newWidth,
				height: newHeight,
			}
		}

		dragElemRef.current.area = newArea as
			| 'top'
			| 'bottom'
			| 'left'
			| 'right'
			| 'contain'
	}

	const handleNavbarDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()

		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move'
		}

		const navbarElement = e.currentTarget
		const tabElems = Array.from(
			navbarElement.childNodes
		) as HTMLDivElement[]

		const clientX = e.clientX
		const clientY = e.clientY

		if (
			!hoverElementRef.current ||
			!dragElemRef.current ||
			tabElems.length === 0
		)
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
			dragElemRef.current.des = lastTab
			dragElemRef.current.area = newArea as
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
			dragElemRef.current.des = firstTab
			dragElemRef.current.area = newArea as
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
			dragElemRef.current.des = closestTab
			dragElemRef.current.area = newArea as
				| 'top'
				| 'bottom'
				| 'left'
				| 'right'
				| 'contain'
		}
	}

	const handleRootSplit = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		e.stopPropagation()

		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move'
		}

		const dataArea = e.currentTarget.dataset.area
		const dataUid = e.currentTarget.dataset.uid

		if (
			!dataArea ||
			!dataUid ||
			!hoverElementRef.current ||
			!dragElemRef.current
		) {
			return
		}

		dragElemRef.current.des = e.currentTarget as HTMLDivElement
		dragElemRef.current.area = dataArea as
			| 'top'
			| 'bottom'
			| 'left'
			| 'right'

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
		const lastState = lastHoverState.current
		if (
			lastState.area !== newArea ||
			lastState.left !== newLeft ||
			lastState.top !== newTop ||
			lastState.width !== newWidth ||
			lastState.height !== newHeight
		) {
			const hoverEl = hoverElementRef.current
			if (hoverEl) {
				Object.assign(hoverEl.style, {
					left: `${newLeft}px`,
					top: `${newTop}px`,
					width: `${newWidth}px`,
					height: `${newHeight}px`,
					display: 'block',
					zIndex: '100',
				})

				lastHoverState.current = {
					area: newArea,
					left: newLeft,
					top: newTop,
					width: newWidth,
					height: newHeight,
				}
			}
		}
	}

	const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
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

	const onDragEnd = (e: React.DragEvent<HTMLDivElement>) => { // eslint-disable-line @typescript-eslint/no-unused-vars
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
				tabsRef.current
					.get(kid.uidNode)
					?.style.setProperty(
						'display',
						body.h > 0 ? 'block' : 'none'
					)
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

			if (sliderFrameRef.current !== null) {
				cancelAnimationFrame(sliderFrameRef.current)
				sliderFrameRef.current = null
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
