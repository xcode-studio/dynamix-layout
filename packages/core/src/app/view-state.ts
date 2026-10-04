import { Node } from './node'
import { layoutState } from './state'
import type { DynamixLayoutCore as Layout } from './dynamix'

/** Maximize and fold: view state on top of the tree that never changes parts. */

function findTabset(id: string): Node | null {
	const node = Node.cache.mapElem.get(id)
	return node instanceof Node && node.type === 'tabset' ? node : null
}

function countTabsets(root: Node = layoutState.root): number {
	let count = 0
	const walk = (node: Node) => {
		if (node.type === 'tabset') count++
		for (const kid of node.kids) walk(kid)
	}
	walk(root)
	return count
}

/** A tabset can fold when its row has another child to take the space. */
export function canCollapse(node: Node): boolean {
	return node.type === 'tabset' && !!node.host && node.host.kids.size() > 1
}

export function canMaximize(): boolean {
	return countTabsets() > 1
}

/** The maximized tabset, or null when nothing is maximized. */
export function getMaximizedTabset(): Node | null {
	const id = layoutState.maximized
	return id ? findTabset(id) : null
}

/** Unfold the most recently folded child of a row other than `except`. */
function unfoldMostRecent(row: Node, except?: Node) {
	let pick: Node | null = null
	for (const kid of row.kids) {
		if (kid === except || !kid.collapsed) continue
		if (!pick || kid.foldedAt > pick.foldedAt) pick = kid
	}
	if (pick) pick.collapsed = false
}

/**
 * Keeps view state valid after any tree change: a tabset alone in its row
 * cannot stay folded, every row keeps at least one open child, and a
 * maximized tabset that left the tree is forgotten.
 */
export function normalizeViewState(root: Node = layoutState.root) {
	let maximizedFound = false

	const walk = (node: Node) => {
		if (node.type === 'tabset') {
			if (node.unId === layoutState.maximized) maximizedFound = true
			if (node.collapsed && !canCollapse(node)) node.collapsed = false
		}

		if (node.type !== 'tab' && node.kids.size() > 0) {
			const allFolded = [...node.kids].every((kid) => kid.collapsed)
			if (allFolded) unfoldMostRecent(node)
		}

		for (const kid of node.kids) walk(kid)
	}
	walk(root)

	if (!maximizedFound) layoutState.maximized = null
}

export function maximize(engine: Layout, id: string): boolean {
	if (!findTabset(id) || !canMaximize()) return false
	if (layoutState.maximized === id) return false

	layoutState.maximized = id
	engine.calcDimensions()
	return true
}

export function restore(engine: Layout): boolean {
	if (!layoutState.maximized) return false

	layoutState.maximized = null
	engine.calcDimensions()
	return true
}

export function toggleMaximize(engine: Layout, id: string): boolean {
	return layoutState.maximized === id ? restore(engine) : maximize(engine, id)
}

/** Folding the last open child of a row unfolds its most recently folded sibling. */
export function collapse(engine: Layout, id: string): boolean {
	const node = findTabset(id)
	if (!node || node.collapsed || !canCollapse(node)) return false

	layoutState.maximized = null
	node.collapsed = true
	node.foldedAt = ++layoutState.foldSeq

	const row = node.host!
	if ([...row.kids].every((kid) => kid.collapsed)) unfoldMostRecent(row, node)

	engine.calcTabsetCountAndMinDim()
	engine.calcDimensions()
	return true
}

export function expand(engine: Layout, id: string): boolean {
	const node = findTabset(id)
	if (!node || !node.collapsed) return false

	node.collapsed = false
	engine.calcTabsetCountAndMinDim()
	engine.calcDimensions()
	return true
}

export function toggleCollapse(engine: Layout, id: string): boolean {
	const node = findTabset(id)
	if (!node) return false
	return node.collapsed ? expand(engine, id) : collapse(engine, id)
}
