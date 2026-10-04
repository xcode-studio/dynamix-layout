import type {
	CreateId,
	Direction,
	RowNode,
	Side,
	TabNode,
	TabsetNode,
} from '../model/types'
import { findParentRow, findTabset } from './find'
import { DEFAULT_WEIGHT } from './normalize'
import { replaceNode, withChildren } from './update'

const flip = (direction: Direction): Direction =>
	direction === 'horizontal' ? 'vertical' : 'horizontal'

const isBefore = (side: Side) => side === 'top' || side === 'left'

/** Whether `side` lies along a row of `direction` (left/right in a horizontal row). */
const isAlong = (side: Side, direction: Direction) =>
	(side === 'left' || side === 'right') === (direction === 'horizontal')

/**
 * Inserts tabs into a tabset at `index` and makes `activeTabId` active. The
 * tabset unfolds, since it just received content.
 */
export function insertTabs(
	root: RowNode,
	tabsetId: string,
	tabs: readonly TabNode[],
	index: number,
	activeTabId: string
): RowNode {
	return replaceNode(root, tabsetId, (node) => {
		const tabset = node as TabsetNode
		const children = [...tabset.children]
		children.splice(index, 0, ...tabs)
		return { ...tabset, children, activeTabId, isFolded: false }
	})
}

/**
 * Places `moved` on one side of a tabset. Along the tabset's row it becomes a
 * sibling; across it, the target is wrapped in a new row with `moved`. The new
 * row takes the target's weight, and the target restarts at the default
 * weight, as in v1. A folded target unfolds (v1 left the new row stuck at its
 * minimum size here; audit B27).
 */
export function insertBeside(
	root: RowNode,
	targetId: string,
	moved: TabsetNode,
	side: Side,
	createId: CreateId
): RowNode {
	const parent = findParentRow(root, targetId)
	const target = findTabset(root, targetId)
	if (!parent || !target) return root

	if (isAlong(side, parent.direction)) {
		const index = parent.children.indexOf(target) + (isBefore(side) ? 0 : 1)
		const children = [...parent.children]
		children.splice(index, 0, moved)
		return replaceNode(root, parent.id, () =>
			withChildren(parent, children)
		)
	}

	const resized: TabsetNode = {
		...target,
		weight: DEFAULT_WEIGHT,
		isFolded: false,
	}
	const wrapper: RowNode = {
		type: 'row',
		id: createId('row'),
		weight: target.weight,
		direction: flip(parent.direction),
		children: isBefore(side) ? [moved, resized] : [resized, moved],
	}
	return replaceNode(root, targetId, () => wrapper)
}

/**
 * Docks `moved` at an edge of the whole layout. Along the root's direction it
 * becomes the first or last child; across it, the current content is wrapped
 * in a row and the root flips direction.
 *
 * The root's `weight` stands in for v1's single child row (see
 * `normalizeTree`), so the wrapped row reuses it to stay pixel-identical.
 */
export function dockAtRoot(
	root: RowNode,
	moved: TabsetNode,
	side: Side,
	createId: CreateId
): RowNode {
	const before = isBefore(side)
	if (root.children.length === 0) return withChildren(root, [moved])

	if (isAlong(side, root.direction)) {
		return withChildren(
			root,
			before ? [moved, ...root.children] : [...root.children, moved]
		)
	}

	const content =
		root.children.length === 1
			? root.children[0]
			: ({
					type: 'row',
					id: createId('row'),
					weight: root.weight,
					direction: root.direction,
					children: root.children,
				} satisfies RowNode)

	return {
		...root,
		weight: DEFAULT_WEIGHT,
		direction: flip(root.direction),
		children: before ? [moved, content] : [content, moved],
	}
}
