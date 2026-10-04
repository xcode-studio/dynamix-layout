import { Node } from './node'
import { layoutState } from './state'
import type {
	Dimension,
	NodeOptions,
	RootAdjustment,
	ReactiveValue,
} from '../type'
import type { DynamixLayoutCore as Layout } from './dynamix'

/** Minimum sizes and the position/size of every tabset, tab and bond. */

export function calcTabsetCountAndMinDim(
	engine: Layout,
	root: Node = layoutState.root,
	clear: boolean = true
) {
	if (root === layoutState.root && clear) {
		Node.cache.tabCnts.clear()
		Node.cache.dimMins.clear()
		Node.cache.mapElem.clear()
		Node.cache.nodOpts.get().clear()
		Node.cache.bndOpts.get().clear()
	}

	for (const node of engine.NodeLayoutRecursiveIterator(root)) {
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
				minWidth: layoutState.minW,
				minHeight: layoutState.minH,
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
				hostDim!.minWidth += (node.kids.size() - 1) * layoutState.bond
			} else {
				hostDim!.minHeight += (node.kids.size() - 1) * layoutState.bond
			}
		}
	}

	if (root === layoutState.root && clear) engine.pruneStaleDirections()
}

export function pruneStaleDirections() {
	for (const id of Node.cache.mapDirs.keys()) {
		if (!Node.cache.mapElem.has(id)) Node.cache.mapDirs.delete(id)
	}
}

export function calculateRootAdjustment(): RootAdjustment {
	const reqDims = layoutState.root.getReqDimension()

	let wasAdjusted = false
	let adjustedW = layoutState.root.dims.w
	let adjustedH = layoutState.root.dims.h

	if (layoutState.root.dims.w < reqDims.width) {
		adjustedW = reqDims.width
		wasAdjusted = true
	}
	if (layoutState.root.dims.h < reqDims.height) {
		adjustedH = reqDims.height
		wasAdjusted = true
	}

	if (wasAdjusted) {
		layoutState.root.dims.w = adjustedW
		layoutState.root.dims.h = adjustedH
	}

	return {
		adjustedW,
		adjustedH,
		wasAdjusted,
	}
}

export function calcDimensions(
	engine: Layout,
	root: Node = layoutState.root,
	supress: boolean = false
) {
	const isRoot = root === layoutState.root

	// A subtree pass (e.g. slider drag) only recomputes part of the tree, so
	// it starts from the current maps to keep entries outside the subtree.
	const seed = (current: ReactiveValue<Map<string, NodeOptions>>) =>
		isRoot ? new Map<string, NodeOptions>() : new Map(current.get())

	const nodeOpts = seed(Node.cache.nodOpts)
	const bondOpts = seed(Node.cache.bndOpts)
	const tabsIds = seed(Node.cache.tabOpts)

	if (isRoot) engine.calculateRootAdjustment()

	for (const node of engine.NodeLayoutIterator(root)) {
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

export function updateDimension(
	engine: Layout,
	dim: Dimension,
	disableTimeout: boolean = false,
	timeout: number = 2
) {
	layoutState.root.dims = dim

	if (disableTimeout) {
		engine.calcDimensions(layoutState.root)
		return
	}

	if (engine.cntdown) {
		layoutState.timer.clear(engine.cntdown)
		engine.cntdown = null
	}

	engine.cntdown = layoutState.timer.set(() => {
		engine.cntdown = null
		engine.calcDimensions()
	}, timeout)
}
