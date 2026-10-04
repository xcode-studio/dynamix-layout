import { Queue } from './queue'
import { createReactiveState } from './reactive-state'
import { areNodeOptionsMapEqual } from '../app/comparator'
import type {
	Dimension,
	LayoutTree,
	NodeCache,
	NodeOptions,
	RootAdjustment,
	ReactiveValue,
	TabsIds,
} from '../type'

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
			unId: crypto.randomUUID(),
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
			tabCnts!.horizontal * Layout._minW +
				Math.max(0, tabCnts!.horizontal - 1) * Layout._bond
		)

		const reqH = Math.max(
			minDims!.minHeight,
			tabCnts!.vertical * Layout._minH +
				Math.max(0, tabCnts!.vertical - 1) * Layout._bond
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
				curntOffset += kid.dims.w + Layout._bond
			} else {
				kid.dims.h = kidDims.minHeight + extraChildSpace
				kid.dims.w = this.dims.w
				kid.dims.y = this.dims.y + curntOffset
				kid.dims.x = this.dims.x
				curntOffset += kid.dims.h + Layout._bond
			}

			if (kid.next) {
				if (nodeDir) {
					kid.next!.dims = {
						w: Layout._bond,
						h: kid.dims.h,
						x: kid.dims.x + kid.dims.w,
						y: kid.dims.y,
					}
				} else {
					kid.next!.dims = {
						w: kid.dims.w,
						h: Layout._bond,
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

class Layout {
	static _root: Node
	static _tree: LayoutTree | null = null
	static _minW: number = 40
	static _minH: number = 40
	static _bond: number = 10
	static _inst: Layout | null = null

	nodeOps: ReactiveValue<Map<string, NodeOptions>>
	cntdown: ReturnType<typeof setTimeout> | null = null
	tabsIds: TabsIds = new Map<string, string>()
	constructor(
		options: {
			tabs?: string[]
			tree?: LayoutTree | null
			minW?: number
			minH?: number
			bond?: number
			uqid?: string
			tabsIds?: TabsIds
		} = {}
	) {
		const config = {
			tabs: [],
			tree: null,
			minW: 40,
			minH: 40,
			bond: 10,
			uqid: 'dynamix-layout-root',
			tabsIds: new Map<string, string>(),
			...options,
		}

		this.tabsIds = config.tabsIds

		// Reset on every construction so a tabs-only layout never reuses the
		// tree of a previously created layout.
		Layout._tree = config.tree ?? null

		Layout._root = new Node({
			unId: config.uqid,
			name: config.uqid,
			type: 'row',
		})

		this.nodeOps = createReactiveState(
			new Map<string, NodeOptions>(),
			areNodeOptionsMapEqual
		)

		Layout._minW = config.minW
		Layout._minH = config.minH
		Layout._bond = config.bond

		const tabsQueue = new Queue<string>(config.tabs.length, config.tabs)
		if (Layout._tree) this.createNodeLayout()
		else this.createBinaryNodeTreeFromQueue(tabsQueue)

		Layout._inst = this
	}

	*JSONLayoutIterator(root: LayoutTree): IterableIterator<LayoutTree> {
		const queue = new Queue<LayoutTree>()
		queue.enqueue(root)

		while (!queue.isEmpty()) {
			const current = queue.dequeue()
			if (!current) continue

			yield current

			if (current.nodKids && current.nodKids.length > 0) {
				for (const child of current.nodKids) {
					queue.enqueue(child)
				}
			}
		}
	}

	*NodeLayoutIterator(root: Node): IterableIterator<Node> {
		const queue = new Queue<Node>()
		queue.enqueue(root)

		while (!queue.isEmpty()) {
			const current = queue.dequeue()
			if (!current) continue

			Node.cache.mapElem.set(current.unId, current)

			yield current

			if (current.kids.size() > 0) {
				for (const child of current.kids) {
					queue.enqueue(child)
				}
			}
		}
	}

	*NodeLayoutRecursiveIterator(root: Node): IterableIterator<Node> {
		for (const child of root.kids) {
			yield* this.NodeLayoutRecursiveIterator(child)
		}

		yield root
	}

	updateChildDirections(parent: Node) {
		const parentDir = Node.cache.mapDirs.get(parent.unId)
		if (parentDir === undefined) {
			console.warn(
				`Cannot update child directions for node ${parent.unId}; its own direction is not set.`
			)
			return
		}
		for (const child of parent.kids) {
			Node.cache.mapDirs.set(child.unId, !parentDir)
			if (child.kids.size() > 0) {
				child.host = parent
				this.updateChildDirections(child)

				if (child.next) {
					Node.cache.mapDirs.set(child.next.unId, !parentDir)
				}
			}
		}
	}

	createNodeLayout(root: LayoutTree | null = Layout._tree) {
		if (!root) return

		const JSONIterator = this.JSONLayoutIterator(root)
		const nodeIterator = this.NodeLayoutIterator(Layout._root)

		Node.cache.mapDirs.set(Layout._root.unId, true)

		while (true) {
			const jsonNode = JSONIterator.next()
			const nodeNode = nodeIterator.next()

			if (jsonNode.done || nodeNode.done) {
				break
			}

			const jsonValue = jsonNode.value
			const nodeValue = nodeNode.value

			if (!jsonValue || !nodeValue) {
				continue
			}

			this.createNodeTreeFromJSONTree(jsonValue, nodeValue)
		}

		this.calcTabsetCountAndMinDim()
	}

	createNodeTreeFromJSONTree(json: LayoutTree, host: Node) {
		const direction = Node.cache.mapDirs.get(host.unId)

		for (const child of json.nodKids || []) {
			const node = this.createNodeFromJSON(child)
			const prev = host.kids.peekBack()
			node.host = host
			node.addBond(node.host, prev)
			host.kids.enqueue(node)

			Node.cache.mapDirs.set(node.unId, !direction!)
		}

		if (host.type === 'tabset') Node.cache.mapElem.set(host.unId, host)
		if (host.type === 'tab') Node.cache.mapElem.set(host.unId, host)
	}

	/**
	 * Create binary tree
	 * @param queue
	 * @param host
	 */
	createBinaryNodeTreeFromQueue(
		queue: Queue<string>,
		host: Node = Layout._root
	) {
		const nodeQueue = new Queue<Node>()
		nodeQueue.enqueue(host)

		Node.cache.mapDirs.set(Layout._root.unId, true)

		while (!queue.isEmpty()) {
			const host = nodeQueue.dequeue()
			if (!host) {
				break
			}
			const dir = Node.cache.mapDirs.get(host.unId)

			if (queue.size() == 2) {
				const leftName = queue.dequeue()
				const rghtName = queue.dequeue()
				const left = new Node({ type: 'tabset', host })
				const rght = new Node({ type: 'tabset', host })

				const leftKid = new Node({
					type: 'tab',
					host: left,
					name: leftName,
					unId:
						this.tabsIds.get(leftName ?? '') ?? crypto.randomUUID(),
				})
				const rghtKid = new Node({
					type: 'tab',
					host: rght,
					name: rghtName,
					unId:
						this.tabsIds.get(rghtName ?? '') ?? crypto.randomUUID(),
				})
				left.open = leftKid.name
				rght.open = rghtKid.name
				left.kids.enqueue(leftKid)
				rght.kids.enqueue(rghtKid)
				host.kids.enqueue(left)
				host.kids.enqueue(rght)

				rght.addBond(host, left)

				Node.cache.mapDirs.set(left.unId, !dir!)
				Node.cache.mapDirs.set(rght.unId, !dir!)
				Node.cache.mapElem.set(left.unId, left)
				Node.cache.mapElem.set(rght.unId, rght)
				Node.cache.mapDirs.set(leftKid.unId, dir!)
				Node.cache.mapDirs.set(rghtKid.unId, dir!)
				Node.cache.mapElem.set(leftKid.unId, leftKid)
				Node.cache.mapElem.set(rghtKid.unId, rghtKid)

				break
			}
			const leftName = queue.dequeue()
			const left = new Node({ type: 'tabset', host })
			const rght = new Node({ type: 'row', host })
			const leftKid = new Node({
				type: 'tab',
				host: left,
				name: leftName,
				unId: this.tabsIds.get(leftName ?? '') ?? crypto.randomUUID(),
			})
			left.open = leftKid.name

			left.kids.enqueue(leftKid)
			host.kids.enqueue(left)
			host.kids.enqueue(rght)

			rght.addBond(host, left)

			Node.cache.mapDirs.set(left.unId, !dir!)
			Node.cache.mapDirs.set(rght.unId, !dir!)
			Node.cache.mapElem.set(left.unId, left)
			Node.cache.mapDirs.set(leftKid.unId, dir!)
			Node.cache.mapElem.set(leftKid.unId, leftKid)

			nodeQueue.enqueue(rght)
		}

		this.calcTabsetCountAndMinDim()
	}

	createNodeFromJSON(json: LayoutTree): Node {
		const newNode = new Node({
			type: json.typNode as 'row' | 'tabset' | 'tab',
			name: json.nodName,
			unId: json.uidNode,
			part: json.nodPart,
			dims: { w: 0, h: 0, x: 0, y: 0 },
			open: typeof json.nodOpen === 'string' ? json.nodOpen : '',
		})

		if (json.typNode === 'tab') {
			newNode.unId = this.tabsIds.get(json.nodName) || json.uidNode
		}

		return newNode
	}

	calcTabsetCountAndMinDim(root: Node = Layout._root, clear: boolean = true) {
		if (root === Layout._root && clear) {
			Node.cache.tabCnts.clear()
			Node.cache.dimMins.clear()
			Node.cache.mapElem.clear()
			Node.cache.nodOpts.get().clear()
			Node.cache.bndOpts.get().clear()
		}

		for (const node of this.NodeLayoutRecursiveIterator(root)) {
			const tabCnts = Node.cache.tabCnts
			const dimMins = Node.cache.dimMins

			Node.cache.mapElem.set(node.unId, node)

			const hostCnt = tabCnts
				.set(node.unId, {
					horizontal: 0,
					vertical: 0,
				})
				.get(node.unId)

			const hostDim = dimMins
				.set(node.unId, {
					minWidth: 0,
					minHeight: 0,
				})
				.get(node.unId)

			const nodeDir = Node.cache.mapDirs.get(node.unId)

			if (node.type === 'tab') {
				Node.cache.mapElem.set(node.unId, node)
				dimMins.set(node.unId, {
					minWidth: 0,
					minHeight: 0,
				})
			}

			if (node.next) Node.cache.mapElem.set(node.next.unId, node.next)

			if (node.type === 'tabset') {
				Node.cache.mapElem.set(node.unId, node)
				dimMins.set(node.unId, {
					minWidth: Layout._minW,
					minHeight: Layout._minH,
				})

				if (nodeDir) {
					tabCnts.set(node.unId, {
						horizontal: 0,
						vertical: 1,
					})
				} else {
					tabCnts.set(node.unId, {
						horizontal: 1,
						vertical: 0,
					})
				}
			}

			if (node.type === 'row') {
				for (const child of node.kids) {
					const kidCnt = tabCnts.get(child.unId)
					const kidDim = dimMins.get(child.unId)

					if (!kidCnt) continue
					hostCnt!.horizontal += kidCnt!.horizontal
					hostCnt!.vertical += kidCnt!.vertical

					if (nodeDir) {
						hostDim!.minHeight = Math.max(
							hostDim!.minHeight,
							kidDim!.minHeight!
						)
						hostDim!.minWidth += kidDim!.minWidth!
					} else {
						hostDim!.minHeight += kidDim!.minHeight!
						hostDim!.minWidth = Math.max(
							hostDim!.minWidth,
							kidDim!.minWidth!
						)
					}
				}

				if (nodeDir) {
					hostDim!.minWidth += (node.kids.size() - 1) * Layout._bond
				} else {
					hostDim!.minHeight += (node.kids.size() - 1) * Layout._bond
				}
			}
		}

		if (root === Layout._root && clear) this.pruneStaleDirections()
	}

	/** After a full pass `mapElem` holds exactly the live nodes and bonds. */
	pruneStaleDirections() {
		for (const id of Node.cache.mapDirs.keys()) {
			if (!Node.cache.mapElem.has(id)) Node.cache.mapDirs.delete(id)
		}
	}

	calculateRootAdjustment(): RootAdjustment {
		const reqDims = Layout._root.getReqDimension()

		let wasAdjusted = false
		let adjustedW = Layout._root.dims.w
		let adjustedH = Layout._root.dims.h

		if (Layout._root.dims.w < reqDims.width) {
			adjustedW = reqDims.width
			wasAdjusted = true
		}
		if (Layout._root.dims.h < reqDims.height) {
			adjustedH = reqDims.height
			wasAdjusted = true
		}

		if (wasAdjusted) {
			Layout._root.dims.w = adjustedW
			Layout._root.dims.h = adjustedH
		}

		return {
			adjustedW,
			adjustedH,
			wasAdjusted,
		}
	}

	calcDimensions(root: Node = Layout._root, supress: boolean = false) {
		const isRoot = root === Layout._root

		// A subtree pass (e.g. slider drag) only recomputes part of the tree, so
		// it starts from the current maps to keep entries outside the subtree.
		const seed = (current: ReactiveValue<Map<string, NodeOptions>>) =>
			isRoot ? new Map<string, NodeOptions>() : new Map(current.get())

		const nodeOpts = seed(Node.cache.nodOpts)
		const bondOpts = seed(Node.cache.bndOpts)
		const tabsIds = seed(Node.cache.tabOpts)

		if (isRoot) this.calculateRootAdjustment()

		for (const node of this.NodeLayoutIterator(root)) {
			node.calcDimensions()

			const nodeDir = Node.cache.mapDirs.get(node.unId)!

			if (node.type === 'tabset') {
				const nodeOption: NodeOptions = {
					typNode: node.type,
					nodName: node.name,
					uidNode: node.unId,
					nodPart: node.part,
					nodOpen: node.open,
					nodeDir: nodeDir,

					nodKids: Array.from(node.kids).map((kid) => {
						const KidNode = {
							typNode: kid.type,
							nodName: kid.name,
							uidNode: kid.unId,
							nodPart: kid.part,
							nodOpen: node.open === kid.name ? true : false,
							nodeDir: !nodeDir,
							nodDims: {
								...node.dims,
							},
						}
						tabsIds.set(kid.unId, KidNode)
						return KidNode as NodeOptions
					}),
					nodDims: {
						...node.dims,
					},
				}
				nodeOpts.set(node.unId, nodeOption)
			}

			if (node.next && node.type !== 'tab') {
				const bondOption: NodeOptions = {
					typNode: 'bond',
					nodName: node.name,
					uidNode: node.next.unId,
					nodeDir: nodeDir,
					nodPart: 0,
					nodDims: {
						...node.next.dims,
					},
				}

				bondOpts.set(node.next.unId, bondOption)
			}
		}
		Node.cache.nodOpts.set(nodeOpts, supress)
		Node.cache.bndOpts.set(bondOpts, supress)
		Node.cache.tabOpts.set(tabsIds, supress)
	}

	updateDimension(
		dim: Dimension,
		disableTimeout: boolean = false,
		timeout: number = 2
	) {
		Layout._root.dims = dim

		if (disableTimeout) {
			this.calcDimensions(Layout._root)
			return
		}

		if (this.cntdown) {
			clearTimeout(this.cntdown)
			this.cntdown = null
		}

		this.cntdown = setTimeout(() => {
			this.cntdown = null
			this.calcDimensions()
		}, timeout)
	}

	updateSlider(
		id: string,
		dim: { x: number; y: number },
		disableTimeout: boolean = false,
		timeout: number = 2
	) {
		if (disableTimeout) {
			this.updateSliderDimension(id, dim)
			return
		}

		if (this.cntdown) {
			clearTimeout(this.cntdown)
			this.cntdown = null
		}

		this.cntdown = setTimeout(() => {
			this.cntdown = null
			this.updateSliderDimension(id, dim)
		}, timeout)
	}

	updateSliderDimension(id: string, dim: { x: number; y: number }) {
		const bnd = Node.cache.mapElem.get(id)

		if (!bnd || !(bnd instanceof Bond)) {
			console.warn(
				`Bond with id ${id} not found or is not a Bond instance`
			)
			return
		}

		const dir = Node.cache.mapDirs.get(bnd.host!.unId)

		const prev = bnd.prev
		const next = bnd.next
		const host = bnd.host

		if (!prev || !next || !host) {
			console.warn('Missing prev, next, or host node', prev, next, host)
			return
		}

		const prevMinDim = Node.cache.dimMins.get(prev.unId) || {
			minWidth: 0,
			minHeight: 0,
		}
		const nextMinDim = Node.cache.dimMins.get(next.unId) || {
			minWidth: 0,
			minHeight: 0,
		}
		const half = Layout._bond / 2

		if (dir) {
			const endX = next.dims.x + next.dims.w

			const minX = prev.dims.x + prevMinDim.minWidth + half
			const maxX = endX - nextMinDim.minWidth - half

			const clampedX = Math.max(minX, Math.min(maxX, dim.x))

			bnd.dims.x = clampedX - half

			prev.dims.w = bnd.dims.x - prev.dims.x

			next.dims.x = clampedX + half
			next.dims.w = endX - next.dims.x

			const prevExtraSpace = Math.max(
				0,
				prev.dims.w - prevMinDim.minWidth
			)
			const nextExtraSpace = Math.max(
				0,
				next.dims.w - nextMinDim.minWidth
			)
			const totalExtraSpace = prevExtraSpace + nextExtraSpace
			const totalPart = prev.part + next.part

			if (totalExtraSpace > 0) {
				prev.part = (prevExtraSpace / totalExtraSpace) * totalPart
				next.part = (nextExtraSpace / totalExtraSpace) * totalPart
			} else {
				prev.part = totalPart / 2
				next.part = totalPart / 2
			}
		} else {
			const endY = next.dims.y + next.dims.h

			const minY = prev.dims.y + prevMinDim.minHeight + half
			const maxY = endY - nextMinDim.minHeight - half

			const clampedY = Math.max(minY, Math.min(maxY, dim.y))

			bnd.dims.y = clampedY - half

			prev.dims.h = bnd.dims.y - prev.dims.y

			next.dims.y = clampedY + half
			next.dims.h = endY - next.dims.y

			const prevExtraSpace = Math.max(
				0,
				prev.dims.h - prevMinDim.minHeight
			)
			const nextExtraSpace = Math.max(
				0,
				next.dims.h - nextMinDim.minHeight
			)
			const totalExtraSpace = prevExtraSpace + nextExtraSpace
			const totalPart = prev.part + next.part

			if (totalExtraSpace > 0) {
				prev.part = (prevExtraSpace / totalExtraSpace) * totalPart
				next.part = (nextExtraSpace / totalExtraSpace) * totalPart
			} else {
				prev.part = totalPart / 2
				next.part = totalPart / 2
			}
		}

		this.calcDimensions(host)
	}

	updateTree(
		src: string,
		des: string,
		layout: 'top' | 'bottom' | 'left' | 'right' | 'contain'
	): boolean {
		const srcNode = Node.cache.mapElem.get(src)
		let desNode = Node.cache.mapElem.get(des)

		if (
			!srcNode ||
			!(srcNode instanceof Node) ||
			!desNode ||
			!(desNode instanceof Node)
		) {
			console.warn(
				`Source node ${src} not found or is not a Node instance`
			)
			return false
		}

		if (
			srcNode?.type == 'tab' &&
			srcNode.host === desNode &&
			desNode.kids.size() < 2
		) {
			console.warn(`Cannot move to self as it has only one tab`)
			return false
		}

		if (srcNode?.type == 'tabset' && desNode?.host === srcNode) {
			console.warn(`Cannot move tabset to self as it is already a child`)
			return false
		}

		if (!srcNode || !desNode) {
			console.warn(`Source or destination node not found: ${src}, ${des}`)
			return false
		}

		if (srcNode === desNode) {
			console.warn(
				'Source and destination nodes are the same, no action taken.'
			)
			return false
		}

		if (!srcNode.host || (!desNode.host && desNode.type !== 'row')) {
			console.warn(
				`Source node or destination node's host is null: ${srcNode.unId}, ${desNode.unId}`
			)
			return false
		}

		// Only the root row is a valid row target; moveRelativeToRoot assumes it.
		if (desNode.type === 'row' && desNode !== Layout._root) {
			console.warn(
				`Cannot move relative to a nested row: ${desNode.unId}`
			)
			return false
		}

		if (desNode.type === 'row' && layout === 'contain') {
			console.warn(
				`Cannot move to a row with 'contain' layout: ${desNode.unId}`
			)
			return false
		}

		if (srcNode.type === 'row') {
			return false
		}

		if (desNode.type === 'tabset' && layout === 'contain') {
			desNode = desNode.kids.peekBack() || desNode
		}

		// Dropping the last tab of a tabset onto that same tabset is a no-op.
		if (srcNode === desNode) return false

		if (this.isOnlyContent(srcNode)) {
			console.warn('Cannot move the only tabset or tab in the layout')
			return false
		}

		if (
			desNode.type === 'tab' &&
			(layout === 'contain' || layout === 'left' || layout === 'right')
		) {
			this.moveNodeAsTab(srcNode, desNode, layout)
		} else if (desNode.type === 'row' && layout !== 'contain') {
			this.moveRelativeToRoot(srcNode, desNode, layout)
		} else if (desNode.type === 'tabset' && layout !== 'contain') {
			this.moveRelativeToTabset(srcNode, desNode, layout)
		}

		this.calcTabsetCountAndMinDim()
		this.calcDimensions(Layout._root, true)
		return true
	}

	/** Removing this node would leave the layout without any tabset. */
	isOnlyContent(node: Node): boolean {
		let tabsets = 0
		for (const n of this.NodeLayoutRecursiveIterator(Layout._root)) {
			if (n.type === 'tabset') tabsets++
		}
		if (tabsets !== 1) return false

		return (
			node.type === 'tabset' ||
			(node.type === 'tab' && node.host?.kids.size() === 1)
		)
	}

	moveNodeAsTab(src: Node, des: Node, layout: 'left' | 'right' | 'contain') {
		if (!des || !des.host) {
			console.warn(
				`Destination node ${des.unId} has no host, cannot move.`
			)
			return
		}

		this.removeNode(src)

		const desHst = des.host
		const desIdx = desHst.kids.indexOf(des)

		if (desIdx === undefined || desIdx === -1) {
			return
		}

		const insertFlg = layout === 'contain' || layout === 'left'
		const insertIdx = insertFlg ? desIdx : desIdx + 1

		const desNxt = desHst.kids.get(insertIdx + 1)
		const desPre = desHst.kids.get(insertIdx - 1)
		const nxtBnd = des.next
		const prvBnd = des.prev

		if (!insertFlg && nxtBnd) {
			Node.cache.mapElem.delete(nxtBnd.unId)
		} else if (insertFlg && prvBnd) {
			Node.cache.mapElem.delete(prvBnd.unId)
		}

		if (src.type == 'tab') {
			if (insertFlg) {
				if (desPre) src.addBond(desHst, desPre)
				des.addBond(desHst, src)
			} else {
				src.addBond(desHst, des)
				if (desNxt) desNxt.addBond(desHst, src)
			}
			desHst.kids.insert(insertIdx, src)
			src.host = desHst
			desHst.open = src.name
		} else if (src.type == 'tabset') {
			const kidFst = src.kids.peek()
			const kidLst = src.kids.peekBack()

			if (insertFlg) {
				if (kidFst && desPre) kidFst.addBond(desHst, desPre)
				if (kidLst && des) des.addBond(desHst, kidLst)
			} else {
				if (kidFst && des) kidFst.addBond(desHst, des)
				if (kidLst && desNxt) desNxt.addBond(desHst, kidLst)
			}

			desHst.kids.insertQueue(insertIdx, src.kids)

			for (const kid of src.kids) {
				kid.host = desHst
				if (kid.next) kid.next.host = desHst
			}

			desHst.open = kidLst ? kidLst.name : ''
		}

		this.updateChildDirections(desHst)
	}

	moveRelativeToRoot(
		src: Node,
		des: Node,
		layout: 'top' | 'bottom' | 'left' | 'right'
	) {
		this.removeNode(src)

		const nodeDir = Node.cache.mapDirs.get(des.unId)
		const destDir = layout === 'top' || layout === 'left'

		if (src.type === 'tab') {
			const tabset = new Node({ type: 'tabset', host: des.host })
			tabset.kids.enqueue(src)
			src.host = tabset
			tabset.open = src.name

			if (nodeDir == false) {
				if (layout === 'left' || layout === 'right') {
					this.insertNodeWithNewParent(tabset, des, destDir)
				} else {
					this.insertNode(des, tabset, destDir)
				}
			} else {
				if (layout === 'top' || layout === 'bottom') {
					this.insertNodeWithNewParent(tabset, des, destDir)
				} else {
					this.insertNode(des, tabset, destDir)
				}
			}
		} else if (src.type === 'tabset') {
			if (nodeDir == false) {
				if (layout === 'left' || layout === 'right') {
					this.insertNodeWithNewParent(src, des, destDir)
				} else {
					this.insertNode(des, src, destDir)
				}
			} else {
				if (layout === 'top' || layout === 'bottom') {
					this.insertNodeWithNewParent(src, des, destDir)
				} else {
					this.insertNode(des, src, destDir)
				}
			}
		}
	}

	moveRelativeToTabset(
		src: Node,
		des: Node,
		layout: 'top' | 'bottom' | 'left' | 'right'
	) {
		this.removeNode(src)

		const nodeDir = Node.cache.mapDirs.get(des.unId)
		const destDir = layout === 'top' || layout === 'left'

		if (src.type === 'tab') {
			const tabset = new Node({ type: 'tabset', host: des.host })
			tabset.kids.enqueue(src)
			src.host = tabset
			tabset.open = src.name

			if (nodeDir == false) {
				if (layout === 'top' || layout === 'bottom') {
					this.insertNodeWithNewParent(tabset, des, destDir)
				} else {
					this.insertNode(des, tabset, destDir)
				}
			} else {
				if (layout === 'left' || layout === 'right') {
					this.insertNodeWithNewParent(tabset, des, destDir)
				} else {
					this.insertNode(des, tabset, destDir)
				}
			}
		} else if (src.type === 'tabset') {
			if (nodeDir == false) {
				if (layout === 'top' || layout === 'bottom') {
					this.insertNodeWithNewParent(src, des, destDir)
				} else {
					this.insertNode(des, src, destDir)
				}
			} else {
				if (layout === 'left' || layout === 'right') {
					this.insertNodeWithNewParent(src, des, destDir)
				} else {
					this.insertNode(des, src, destDir)
				}
			}
		}
	}

	insertNode(des: Node, src: Node, flag: boolean) {
		const desHost = des.host
		if (des == Layout._root) {
			const kidhead = Layout._root.kids.peek()
			const kidTail = Layout._root.kids.peekBack()

			if (flag) {
				Layout._root.kids.enqueueFront(src)
				if (kidhead) kidhead.addBond(Layout._root, src)
			} else {
				Layout._root.kids.enqueue(src)
				if (kidTail) src.addBond(Layout._root, kidTail)
			}

			src!.host = Layout._root
			this.updateChildDirections(Layout._root)
			return
		}

		if (!desHost) {
			console.warn(
				`Destination node ${des.unId} has no host, cannot insert.`
			)
			return
		}

		const desIdx = desHost.kids.indexOf(des)
		if (desIdx === -1) {
			console.warn(
				`Destination node ${des.unId} not found in its host's kids.`
			)
			return
		}

		const hostDir = Node.cache.mapDirs.get(desHost.unId)
		if (hostDir) Node.cache.mapDirs.set(src.unId, !hostDir)

		const desNxt = desHost.kids.get(desIdx + 1)
		const desPre = desHost.kids.get(desIdx - 1)
		const bndNxt = des.next
		const bndPre = des.prev

		src.host = desHost

		if (flag) {
			desHost.kids.insert(desIdx, src)

			des.addBond(desHost, src)
			if (desPre) src.addBond(desHost, desPre)

			if (bndPre) {
				Node.cache.mapElem.delete(bndPre.unId)
			}
		} else {
			desHost.kids.insert(desIdx + 1, src)
			src.addBond(desHost, des)
			if (desNxt) desNxt.addBond(desHost, src)

			if (bndNxt) {
				Node.cache.mapElem.delete(bndNxt.unId)
			}
		}

		this.updateChildDirections(desHost)
	}

	insertNodeWithNewParent(src: Node, des: Node, flag: boolean) {
		const kids = new Queue<Node>()
		const node = new Node({ type: 'tabset', host: des.host })

		if (!des || !src) {
			console.warn(
				`Destination node ${des.unId} has no host, cannot insert.`
			)
			return
		}

		if (des === Layout._root) {
			const row = new Node({ type: 'row', host: des })
			if (des.kids.size() === 0) {
				des.kids.enqueue(src)
				src.host = des
			} else if (des.kids.size() == 1 && des.kids.peek()?.type === 'tabset') {
				const kid = des.kids.dequeue()

				if (!kid) {
					console.warn(
						`No kid found in destination node ${des.unId}, cannot insert.`
					)
					return
				}

				if (flag) {
					row.kids.enqueue(src)
					row.kids.enqueue(kid)
					des.kids.enqueue(row)
					kid.addBond(row, src)
				} else {
					row.kids.enqueue(kid)
					row.kids.enqueue(src)
					src.addBond(row, kid)
					des.kids.enqueue(row)
				}
				src.host = row
				kid.host = row
			} else if (
				des.kids.size() == 1 &&
				des.kids.peek()?.type === 'row'
			) {
				const kid = des.kids.peek()

				const kidhead = kid?.kids.peek()
				const kidTail = kid?.kids.peekBack()

				if (flag && kid) {
					kid.kids.enqueueFront(src)
					if (kidhead) kidhead.addBond(kid, src)
				} else if (kid) {
					kid.kids.enqueue(src)
					if (kidTail) src.addBond(kid, kidTail)
				}

				src!.host = kid!
			} else if (des.kids.size() > 1) {
				const rowA = new Node({ type: 'row', host: des })
				const rowB = new Node({ type: 'row', host: rowA })

				for (const kid of des.kids) {
					rowB.kids.enqueue(kid)
					kid.host = rowB
					if (kid.next) kid.next.host = rowB
				}

				src.host = rowA
				des.kids.clear()

				if (flag) {
					rowA.kids.enqueueFront(src)
					rowA.kids.enqueue(rowB)
					rowB.addBond(rowA, src)
				} else {
					rowA.kids.enqueue(rowB)
					rowA.kids.enqueue(src)
					src.addBond(rowA, rowB)
				}

				des.kids.enqueue(rowA)
			}

			this.updateChildDirections(des)
			return
		}

		src.host = des

		node.host = des
		node.kids = des.kids
		node.open = des.open

		const desDir = Node.cache.mapDirs.get(des.unId)

		for (const kid of node.kids) {
			kid.host = node
			if (kid.next) kid.next.host = node
			Node.cache.mapDirs.set(kid.unId, desDir!)
		}

		for (const kid of src.kids) {
			kid.host = src
			if (kid.next) kid.next.host = src
			Node.cache.mapDirs.set(kid.unId, desDir!)
		}

		Node.cache.mapDirs.set(node.unId, !desDir!)
		Node.cache.mapDirs.set(src.unId, !desDir!)

		if (flag) {
			kids.enqueue(src)
			kids.enqueue(node)
			des.kids = kids
			des.type = 'row'
			node.addBond(des, src)
		} else {
			kids.enqueue(node)
			kids.enqueue(src)
			des.kids = kids
			des.type = 'row'
			src.addBond(des, node)
		}
	}

	moveAdjacentNodeToGrandParent(src: Node) {
		if (!src.host || !src.host.host) {
			console.warn(`Source node ${src.unId} has no host, cannot move.`)
			return
		}

		const srcHost = src.host
		const gndHost = src.host.host

		const srcHostIndex = gndHost.kids.indexOf(srcHost)
		const hostPrev = gndHost.kids.get(srcHostIndex - 1)
		const hostNext = gndHost.kids.get(srcHostIndex + 1)
		const fstKid = src.kids.peek()
		const lstKid = src.kids.peekBack()

		this.removeKid(srcHost)

		let insrtIndex = srcHostIndex

		if (src.type == 'row' && srcHost) {
			if (hostPrev && fstKid) fstKid.addBond(gndHost, hostPrev)
			if (hostNext && lstKid) hostNext.addBond(gndHost, lstKid)

			for (const kid of src.kids) {
				kid.host = gndHost
				if (kid.next) kid.next.host = gndHost
				gndHost.kids.insert(insrtIndex, kid)

				Node.cache.mapDirs.set(
					kid.unId,
					!Node.cache.mapDirs.get(gndHost.unId)!
				)
				Node.cache.dimMins.delete(kid.unId)
				insrtIndex++
			}
		} else if (src.type == 'tabset') {
			if (hostPrev) src.addBond(gndHost, hostPrev)
			if (hostNext) hostNext.addBond(gndHost, src)

			gndHost.kids.insert(insrtIndex, src)

			src.host = gndHost

			Node.cache.mapDirs.set(
				src.unId,
				!Node.cache.mapDirs.get(gndHost.unId)!
			)

			for (const kid of src.kids) {
				Node.cache.mapDirs.set(
					kid.unId,
					Node.cache.mapDirs.get(gndHost.unId)!
				)
				Node.cache.dimMins.delete(kid.unId)
			}
		}
	}

	removeRelation(src: Node, fix: boolean = true) {
		const host = src.host
		const prev = src.prev
		const next = src.next

		src.host = null
		src.next = null
		src.prev = null

		if (prev) prev.next = null
		if (next) next.prev = null

		if (!fix) {
			return src
		}

		if (prev && next && prev.prev && next.next) {
			prev.prev.addBond(host, next.next)
		} else if (prev && prev.prev) {
			prev.prev.next = null
		} else if (next && next.next) {
			next.next.prev = null
		}
	}

	removeNode(src: Node) {
		if (!src.host) {
			console.warn(`Kid node has no host, cannot remove.`)
			return
		}

		const papa = src?.host
		const dada = papa?.host

		this.removeKid(src)

		if (src.type === 'tabset' && papa.kids.size() === 1) {
			/**
			 *
			 */
			const kid = papa.kids.peek()
			if (kid) this.moveAdjacentNodeToGrandParent(kid)
		} else if (
			/**
			 *
			 */
			src.type === 'tab' &&
			papa!.kids.size() === 0 &&
			dada!.kids.size() === 2
		) {
			this.removeKid(papa)
			const kid = dada?.kids.peek()
			if (kid) this.moveAdjacentNodeToGrandParent(kid)
		} else if (
			/**
			 *
			 */
			src.type === 'tab' &&
			papa!.kids.size() === 0 &&
			dada!.kids.size() > 2
		) {
			this.removeKid(papa)
		} else if (
			/**
			 *
			 */
			src.type === 'tab' &&
			papa!.open === src.name &&
			papa!.kids.size() > 0
		) {
			const kid = papa.kids.peek()
			if (kid) papa.open = kid.name
		}
	}

	removeKid(kid: Node) {
		if (!kid.host) {
			console.warn(`Kid node has no host, cannot remove.`)
			return
		}

		const host = kid.host
		const idx = host.kids.indexOf(kid)

		const nextNode = host.kids.get(idx + 1)
		const prevNode = host.kids.get(idx - 1)
		const nextBond = kid.next
		const prevBond = kid.prev

		if (idx === -1) {
			console.warn(`Kid node not found in its host's kids.`)
			return
		}

		if (nextBond) {
			Node.cache.mapElem.delete(nextBond.unId)
		}

		if (prevBond) {
			Node.cache.mapElem.delete(prevBond.unId)
		}

		if (nextNode && prevNode) {
			nextNode.addBond(host, prevNode)
		} else if (nextNode) {
			nextNode.prev = null
		} else if (prevNode) {
			prevNode.next = null
		}

		host.kids.removeAt(idx)

		Node.cache.mapElem.delete(kid.unId)
		Node.cache.dimMins.delete(kid.unId)
		Node.cache.mapDirs.delete(kid.unId)
		Node.cache.tabCnts.delete(kid.unId)

		if (kid.type === 'tabset') {
			Node.cache.mapElem.delete(kid.unId)
		}

		if (kid.type === 'tab') {
			Node.cache.mapElem.delete(kid.unId)
		}

		kid.host = null
		kid.next = null
		kid.prev = null
	}

	clearAllCache() {
		Node.cache.dimMins.clear()
		Node.cache.mapDirs.clear()
		Node.cache.tabCnts.clear()
		Node.cache.mapElem.clear()

		Node.cache.nodOpts.get().clear()
		Node.cache.bndOpts.get().clear()
	}
}

export class Bond {
	dims: Dimension = { w: 0, h: 0, x: 0, y: 0 }
	unId: string = crypto.randomUUID()
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

export { Layout as DynamixLayoutCore }
