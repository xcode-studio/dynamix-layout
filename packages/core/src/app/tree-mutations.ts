import { Queue } from './queue'
import { Node } from './node'
import { layoutState } from './state'
import type { DynamixLayoutCore as Layout } from './dynamix'

/** Drag and drop: moving tabs/tabsets and keeping bonds and caches consistent. */

export function updateTree(
	engine: Layout,
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
		console.warn(`Source node ${src} not found or is not a Node instance`)
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
	if (desNode.type === 'row' && desNode !== layoutState.root) {
		console.warn(`Cannot move relative to a nested row: ${desNode.unId}`)
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

	if (engine.isOnlyContent(srcNode)) {
		console.warn('Cannot move the only tabset or tab in the layout')
		return false
	}

	// Any move ends maximize, and a dragged tabset arrives unfolded.
	layoutState.maximized = null
	srcNode.collapsed = false

	if (
		desNode.type === 'tab' &&
		(layout === 'contain' || layout === 'left' || layout === 'right')
	) {
		engine.moveNodeAsTab(srcNode, desNode, layout)
	} else if (desNode.type === 'row' && layout !== 'contain') {
		engine.moveRelativeToRoot(srcNode, desNode, layout)
	} else if (desNode.type === 'tabset' && layout !== 'contain') {
		engine.moveRelativeToTabset(srcNode, desNode, layout)
	}

	engine.calcTabsetCountAndMinDim()
	engine.calcDimensions(layoutState.root, true)
	return true
}

export function isOnlyContent(engine: Layout, node: Node): boolean {
	let tabsets = 0
	for (const n of engine.NodeLayoutRecursiveIterator(layoutState.root)) {
		if (n.type === 'tabset') tabsets++
	}
	if (tabsets !== 1) return false

	return (
		node.type === 'tabset' ||
		(node.type === 'tab' && node.host?.kids.size() === 1)
	)
}

export function moveNodeAsTab(
	engine: Layout,
	src: Node,
	des: Node,
	layout: 'left' | 'right' | 'contain'
) {
	if (!des || !des.host) {
		console.warn(`Destination node ${des.unId} has no host, cannot move.`)
		return
	}

	engine.removeNode(src)

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
		desHst.collapsed = false
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
		desHst.collapsed = false
	}

	engine.updateChildDirections(desHst)
}

type Side = 'top' | 'bottom' | 'left' | 'right'

/**
 * Whether dropping on a side of the target needs a new parent (the drop
 * crosses the target's layout axis) or can be inserted as a sibling.
 * `vertical` means the target lays its children out top-to-bottom.
 */
const needsNewParent = {
	root: (vertical: boolean, sideways: boolean) => vertical === sideways,
	tabset: (vertical: boolean, sideways: boolean) => vertical !== sideways,
}

function moveRelative(
	engine: Layout,
	src: Node,
	des: Node,
	side: Side,
	target: keyof typeof needsNewParent
) {
	engine.removeNode(src)
	if (src.type !== 'tab' && src.type !== 'tabset') return

	const vertical = Node.cache.mapDirs.get(des.unId) === false
	const sideways = side === 'left' || side === 'right'
	const before = side === 'top' || side === 'left'

	let moved = src
	if (src.type === 'tab') {
		moved = new Node({ type: 'tabset', host: des.host })
		moved.kids.enqueue(src)
		moved.open = src.name
		src.host = moved
	}

	if (needsNewParent[target](vertical, sideways)) {
		engine.insertNodeWithNewParent(moved, des, before)
	} else {
		engine.insertNode(des, moved, before)
	}
}

export function moveRelativeToRoot(
	engine: Layout,
	src: Node,
	des: Node,
	layout: Side
) {
	moveRelative(engine, src, des, layout, 'root')
}

export function moveRelativeToTabset(
	engine: Layout,
	src: Node,
	des: Node,
	layout: Side
) {
	moveRelative(engine, src, des, layout, 'tabset')
}

export function insertNode(
	engine: Layout,
	des: Node,
	src: Node,
	flag: boolean
) {
	const desHost = des.host
	if (des == layoutState.root) {
		const kidhead = layoutState.root.kids.peek()
		const kidTail = layoutState.root.kids.peekBack()

		if (flag) {
			layoutState.root.kids.enqueueFront(src)
			if (kidhead) kidhead.addBond(layoutState.root, src)
		} else {
			layoutState.root.kids.enqueue(src)
			if (kidTail) src.addBond(layoutState.root, kidTail)
		}

		src!.host = layoutState.root
		engine.updateChildDirections(layoutState.root)
		return
	}

	if (!desHost) {
		console.warn(`Destination node ${des.unId} has no host, cannot insert.`)
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

	engine.updateChildDirections(desHost)
}

export function insertNodeWithNewParent(
	engine: Layout,
	src: Node,
	des: Node,
	flag: boolean
) {
	const kids = new Queue<Node>()
	const node = new Node({ type: 'tabset', host: des.host })

	if (!des || !src) {
		console.warn(`Destination node ${des.unId} has no host, cannot insert.`)
		return
	}

	if (des === layoutState.root) {
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
		} else if (des.kids.size() == 1 && des.kids.peek()?.type === 'row') {
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

		engine.updateChildDirections(des)
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

export function moveAdjacentNodeToGrandParent(engine: Layout, src: Node) {
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

	engine.removeKid(srcHost)

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

		Node.cache.mapDirs.set(src.unId, !Node.cache.mapDirs.get(gndHost.unId)!)

		for (const kid of src.kids) {
			Node.cache.mapDirs.set(
				kid.unId,
				Node.cache.mapDirs.get(gndHost.unId)!
			)
			Node.cache.dimMins.delete(kid.unId)
		}
	}
}

export function removeRelation(src: Node, fix: boolean = true) {
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

export function removeNode(engine: Layout, src: Node) {
	if (!src.host) {
		console.warn(`Kid node has no host, cannot remove.`)
		return
	}

	const papa = src?.host
	const dada = papa?.host

	engine.removeKid(src)

	if (src.type === 'tabset' && papa.kids.size() === 1) {
		/**
		 *
		 */
		const kid = papa.kids.peek()
		if (kid) engine.moveAdjacentNodeToGrandParent(kid)
	} else if (
		/**
		 *
		 */
		src.type === 'tab' &&
		papa!.kids.size() === 0 &&
		dada!.kids.size() === 2
	) {
		engine.removeKid(papa)
		const kid = dada?.kids.peek()
		if (kid) engine.moveAdjacentNodeToGrandParent(kid)
	} else if (
		/**
		 *
		 */
		src.type === 'tab' &&
		papa!.kids.size() === 0 &&
		dada!.kids.size() > 2
	) {
		engine.removeKid(papa)
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

export function removeKid(kid: Node) {
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

export function clearAllCache() {
	Node.cache.dimMins.clear()
	Node.cache.mapDirs.clear()
	Node.cache.tabCnts.clear()
	Node.cache.mapElem.clear()

	Node.cache.nodOpts.get().clear()
	Node.cache.bndOpts.get().clear()
}
