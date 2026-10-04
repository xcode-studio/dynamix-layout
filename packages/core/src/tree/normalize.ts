import { isRow } from '../model/guards'
import type { RowChild, RowNode, TabsetNode } from '../model/types'
import { withChildren } from './update'

/** Weight given to new nodes and to nodes with an invalid weight. */
export const DEFAULT_WEIGHT = 100

const validWeight = (weight: number) =>
	Number.isFinite(weight) && weight >= 0 ? weight : DEFAULT_WEIGHT

function normalizeTabset(tabset: TabsetNode): TabsetNode | null {
	if (tabset.children.length === 0) return null
	const weight = validWeight(tabset.weight)
	const hasActive = tabset.children.some(
		(tab) => tab.id === tabset.activeTabId
	)
	if (weight === tabset.weight && hasActive) return tabset
	return {
		...tabset,
		weight,
		activeTabId: hasActive ? tabset.activeTabId : tabset.children[0].id,
	}
}

/**
 * Children of a dissolved row move up **keeping their own weights**. This is
 * what v1 does (`moveAdjacentNodeToGrandParent`), and keeping it means saved
 * v1 layouts and v1 interactions give pixel-identical results.
 */
function normalizeRow(row: RowNode): RowNode {
	const children: RowChild[] = []
	for (const child of row.children) {
		if (!isRow(child)) {
			const tabset = normalizeTabset(child)
			if (tabset) children.push(tabset)
			continue
		}
		let next: RowChild = normalizeRow(child)
		if (isRow(next) && next.children.length === 1) next = next.children[0]
		if (isRow(next) && next.children.length === 0) continue
		if (isRow(next) && next.direction === row.direction)
			children.push(...next.children)
		else children.push(next)
	}
	const weight = validWeight(row.weight)
	const normalized = withChildren(row, children)
	return weight === row.weight ? normalized : { ...normalized, weight }
}

/**
 * Restores the tree invariants after any change:
 * - tabsets are never empty and their `activeTabId` is one of their tabs;
 * - non-root rows have at least two children and never share their parent's
 *   direction;
 * - weights are finite and not negative (0 is valid: a panel dragged to its
 *   minimum has no share of the extra space).
 *
 * A root with a single row child takes over that row (its direction, weight
 * and children), which renders identically. Unchanged nodes keep their identity.
 */
export function normalizeTree(root: RowNode): RowNode {
	let result = normalizeRow(root)
	while (result.children.length === 1 && isRow(result.children[0])) {
		const only: RowNode = result.children[0]
		result = {
			...result,
			weight: only.weight,
			direction: only.direction,
			children: only.children,
		}
	}
	return result
}
