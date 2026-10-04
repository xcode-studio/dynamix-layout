import { Queue } from './queue'
import { Node } from './node'
import { layoutState } from './state'
import type { LayoutTree } from '../type'
import type { DynamixLayoutCore as Layout } from './dynamix'

/** Building the node tree from a saved layout or a list of tabs, and walking it. */

export function* JSONLayoutIterator(
	root: LayoutTree
): IterableIterator<LayoutTree> {
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

export function* NodeLayoutIterator(root: Node): IterableIterator<Node> {
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

export function* NodeLayoutRecursiveIterator(
	engine: Layout,
	root: Node
): IterableIterator<Node> {
	for (const child of root.kids) {
		yield* engine.NodeLayoutRecursiveIterator(child)
	}

	yield root
}

export function updateChildDirections(engine: Layout, parent: Node) {
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
			engine.updateChildDirections(child)

			if (child.next) {
				Node.cache.mapDirs.set(child.next.unId, !parentDir)
			}
		}
	}
}

export function createNodeLayout(
	engine: Layout,
	root: LayoutTree | null = layoutState.tree
) {
	if (!root) return

	const JSONIterator = engine.JSONLayoutIterator(root)
	const nodeIterator = engine.NodeLayoutIterator(layoutState.root)

	Node.cache.mapDirs.set(layoutState.root.unId, true)

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

		engine.createNodeTreeFromJSONTree(jsonValue, nodeValue)
	}

	engine.calcTabsetCountAndMinDim()
}

export function createNodeTreeFromJSONTree(
	engine: Layout,
	json: LayoutTree,
	host: Node
) {
	const direction = Node.cache.mapDirs.get(host.unId)

	for (const child of json.nodKids || []) {
		const node = engine.createNodeFromJSON(child)
		const prev = host.kids.peekBack()
		node.host = host
		node.addBond(node.host, prev)
		host.kids.enqueue(node)

		Node.cache.mapDirs.set(node.unId, !direction!)
	}

	if (host.type === 'tabset') Node.cache.mapElem.set(host.unId, host)
	if (host.type === 'tab') Node.cache.mapElem.set(host.unId, host)
}

export function createBinaryNodeTreeFromQueue(
	engine: Layout,
	queue: Queue<string>,
	host: Node = layoutState.root
) {
	const nodeQueue = new Queue<Node>()
	nodeQueue.enqueue(host)

	Node.cache.mapDirs.set(layoutState.root.unId, true)

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
					engine.tabsIds.get(leftName ?? '') ??
					layoutState.createId(),
			})
			const rghtKid = new Node({
				type: 'tab',
				host: rght,
				name: rghtName,
				unId:
					engine.tabsIds.get(rghtName ?? '') ??
					layoutState.createId(),
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
			unId: engine.tabsIds.get(leftName ?? '') ?? layoutState.createId(),
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

	engine.calcTabsetCountAndMinDim()
}

export function createNodeFromJSON(engine: Layout, json: LayoutTree): Node {
	const newNode = new Node({
		type: json.typNode as 'row' | 'tabset' | 'tab',
		name: json.nodName,
		unId: json.uidNode,
		part: json.nodPart,
		dims: { w: 0, h: 0, x: 0, y: 0 },
		open: typeof json.nodOpen === 'string' ? json.nodOpen : '',
	})

	if (json.typNode === 'tab') {
		newNode.unId = engine.tabsIds.get(json.nodName) || json.uidNode
	}

	return newNode
}
