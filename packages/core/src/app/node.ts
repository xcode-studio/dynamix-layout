import { Queue } from './queue'
import { createReactiveState } from './reactive-state'
import { areNodeOptionsMapEqual } from './comparator'
import { layoutState } from './state'
import type { Dimension, LayoutTree, NodeCache, NodeOptions } from '../type'

/** @deprecated Internal; removed in 2.0. Read layout state from `layout.getSnapshot()` / `subscribe()`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export class Node {
	static cache: NodeCache = {
		dimMins: new Map<string, { minWidth: number; minHeight: number }>(),
		mapDirs: new Map<string, boolean>(),
		tabCnts: new Map<string, { horizontal: number; vertical: number }>(),
		mapElem: new Map<string, Node | Bond>(),
		tabOpts: createReactiveState(
			new Map<string, NodeOptions>(),
			areNodeOptionsMapEqual
		),
		nodOpts: createReactiveState(
			new Map<string, NodeOptions>(),
			areNodeOptionsMapEqual
		),
		bndOpts: createReactiveState(
			new Map<string, NodeOptions>(),
			areNodeOptionsMapEqual
		),
	}

	kids: Queue<Node> = new Queue<Node>()
	dims: Dimension = { w: 0, h: 0, x: 0, y: 0 }
	unId: string
	next: Bond | null = null
	prev: Bond | null = null
	type: 'row' | 'tabset' | 'tab' | 'bond' = 'row'
	name: string = ''
	part: number = 0
	host: Node | null = null
	open: string = ''

	constructor(
		options: {
			type?: 'row' | 'tabset' | 'tab' | 'bond'
			host?: Node | null
			name?: string
			part?: number
			dims?: Dimension
			unId?: string
			open?: string
		} = {}
	) {
		const defaults = {
			type: 'row' as 'row' | 'tabset' | 'tab' | 'bond',
			host: null,
			name: '',
			part: 100,
			dims: { w: 0, h: 0, x: 0, y: 0 },
			unId: layoutState.createId(),
			open: '',
		}

		this.type = options.type ?? defaults.type
		this.host = options.host ?? defaults.host
		this.name = options.name ?? defaults.name
		this.part = options.part ?? defaults.part
		this.dims = options.dims ?? defaults.dims
		this.open = options.open ?? defaults.open

		this.unId = options.unId || defaults.unId
	}

	addBond(parent: Node | null, prev: Node | null = null) {
		if (!prev) return

		const bond = new Bond(parent, this, prev)
		Node.cache.mapElem.set(bond.unId, bond)
	}

	getReqDimension(): { width: number; height: number } {
		const minDims = Node.cache.dimMins.get(this.unId)
		const tabCnts = Node.cache.tabCnts.get(this.unId)

		const reqW = Math.max(
			minDims!.minWidth,
			tabCnts!.horizontal * layoutState.minW +
				Math.max(0, tabCnts!.horizontal - 1) * layoutState.bond
		)

		const reqH = Math.max(
			minDims!.minHeight,
			tabCnts!.vertical * layoutState.minH +
				Math.max(0, tabCnts!.vertical - 1) * layoutState.bond
		)

		return {
			width: reqW,
			height: reqH,
		}
	}

	calcDimensions() {
		const nodeDir = Node.cache.mapDirs.get(this.unId)

		if (!this.kids) return

		let totalWeight = 0
		const totlMinSize = Node.cache.dimMins.get(this.unId) || {
			minWidth: 0,
			minHeight: 0,
		}
		let curntOffset = 0

		for (const kid of this.kids) {
			totalWeight += kid.part
		}

		if (totalWeight === 0) return

		let extraSpace
		if (nodeDir) {
			extraSpace = this.dims.w - totlMinSize.minWidth
		} else {
			extraSpace = this.dims.h - totlMinSize.minHeight
		}

		const isBelowMinSize = extraSpace < 0
		const lastKid = this.kids.peekBack()

		// Round cumulative boundaries instead of individual sizes. Each edge
		// stays within half a pixel of its exact position, moves at most one
		// pixel per pixel of resize, and edges outside a dragged pair never move
		// (their cumulative part is unchanged).
		let cumWeight = 0
		let prevBoundary = 0

		for (const kid of this.kids) {
			const kidDims = Node.cache.dimMins.get(kid.unId) || {
				minWidth: 0,
				minHeight: 0,
			}

			let extraChildSpace = 0
			if (!isBelowMinSize) {
				cumWeight += kid.part
				const boundary =
					kid === lastKid
						? extraSpace
						: Math.round((extraSpace * cumWeight) / totalWeight)
				extraChildSpace = boundary - prevBoundary
				prevBoundary = boundary
			}

			if (nodeDir) {
				kid.dims.w = kidDims.minWidth + extraChildSpace
				kid.dims.h = this.dims.h
				kid.dims.x = this.dims.x + curntOffset
				kid.dims.y = this.dims.y
				curntOffset += kid.dims.w + layoutState.bond
			} else {
				kid.dims.h = kidDims.minHeight + extraChildSpace
				kid.dims.w = this.dims.w
				kid.dims.y = this.dims.y + curntOffset
				kid.dims.x = this.dims.x
				curntOffset += kid.dims.h + layoutState.bond
			}

			if (kid.next) {
				if (nodeDir) {
					kid.next!.dims = {
						w: layoutState.bond,
						h: kid.dims.h,
						x: kid.dims.x + kid.dims.w,
						y: kid.dims.y,
					}
				} else {
					kid.next!.dims = {
						w: kid.dims.w,
						h: layoutState.bond,
						x: kid.dims.x,
						y: kid.dims.y + kid.dims.h,
					}
				}
			}
		}
	}

	toJSON(): LayoutTree {
		const children: LayoutTree[] = []

		for (const child of this.kids) {
			children.push(child.toJSON())
		}

		const result: LayoutTree = {
			typNode: this.type,
			nodPart: this.part,
			nodName: this.name,
			uidNode: this.unId,
		}

		if (this.open) {
			result.nodOpen = this.open
		}

		if (children.length > 0) {
			result.nodKids = children
		}

		return result
	}
}

/** @deprecated Internal; removed in 2.0. Splitters are `snapshot.splitters`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export class Bond {
	dims: Dimension = { w: 0, h: 0, x: 0, y: 0 }
	unId: string = layoutState.createId()
	next: Node | null = null
	prev: Node | null = null
	host: Node | null = null

	constructor(
		parent: Node | null = null,
		next: Node | null = null,
		prev: Node | null = null
	) {
		this.host = parent
		this.next = next
		this.prev = prev
		if (this.next) this.next.prev = this
		if (this.prev) this.prev.next = this
	}

	toJSON(): LayoutTree {
		return {
			nodName: this.host?.name || '',
			typNode: 'bond',
			uidNode: this.unId,
			nodPart: 0,
			nodOpen: '',
			nodKids: [],
		}
	}
}
