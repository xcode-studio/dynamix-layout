import { isRow } from '../model/guards'
import type { Point, RowChild, RowNode } from '../model/types'
import { replaceNode, withChildren } from '../tree/update'
import type { GeometryConfig } from './config'
import { splitterId, type LayoutRects } from './compute-rects'
import { computeMinSizes } from './min-size'

/** The row and the two children a splitter sits between. */
export interface SplitterPair {
	readonly row: RowNode
	readonly before: RowChild
	readonly after: RowChild
}

/** Finds the row and neighbours of a splitter id (`before~after`). */
export function findSplitterPair(
	root: RowNode,
	id: string
): SplitterPair | null {
	const visit = (row: RowNode): SplitterPair | null => {
		for (let i = 0; i < row.children.length; i++) {
			const child = row.children[i]
			const next = row.children[i + 1]
			if (next && splitterId(child.id, next.id) === id)
				return { row, before: child, after: next }
			if (isRow(child)) {
				const found = visit(child)
				if (found) return found
			}
		}
		return null
	}
	return visit(root)
}

const isFolded = (node: RowChild) => !isRow(node) && node.isFolded

/** Whether a splitter can't move because a neighbour is folded. */
export function isSplitterLocked(pair: SplitterPair): boolean {
	return isFolded(pair.before) || isFolded(pair.after)
}

const rectOf = (rects: LayoutRects, node: RowChild) =>
	(isRow(node) ? rects.rows : rects.tabsets).get(node.id)

/**
 * Splitter position and limits along its row, in px: `value` is the size of
 * the panel before it, `min`/`max` the limits set by both neighbours' minimum
 * sizes.
 */
export function getSplitterBounds(
	root: RowNode,
	rects: LayoutRects,
	config: GeometryConfig,
	id: string
): { value: number; min: number; max: number } | null {
	const pair = findSplitterPair(root, id)
	if (!pair) return null
	const before = rectOf(rects, pair.before)
	const after = rectOf(rects, pair.after)
	if (!before || !after) return null
	const minSizes = computeMinSizes(root, config)
	const horizontal = pair.row.direction === 'horizontal'
	const size = (rect: { width: number; height: number }) =>
		horizontal ? rect.width : rect.height
	const minOf = (node: RowChild) => {
		const min = minSizes.get(node.id)!
		return horizontal ? min.width : min.height
	}
	return {
		value: size(before),
		min: minOf(pair.before),
		max: size(before) + size(after) - minOf(pair.after),
	}
}

/**
 * Moves a splitter so its centre is at `point`, clamped so both neighbours
 * keep their minimum size. Only the two neighbours' weights change, split in
 * proportion to their space above the minimum, so nothing outside the pair
 * moves. Ported from v1 `updateSliderDimension`.
 *
 * @returns The new root, or `null` when the splitter doesn't exist or is locked.
 */
export function resizeSplitterWeights(
	root: RowNode,
	rects: LayoutRects,
	config: GeometryConfig,
	id: string,
	point: Point
): RowNode | null {
	const pair = findSplitterPair(root, id)
	if (!pair || isSplitterLocked(pair)) return null
	const beforeRect = rectOf(rects, pair.before)
	const afterRect = rectOf(rects, pair.after)
	if (!beforeRect || !afterRect) return null

	const minSizes = computeMinSizes(root, config)
	const horizontal = pair.row.direction === 'horizontal'
	const start = horizontal ? beforeRect.x : beforeRect.y
	const end = horizontal
		? afterRect.x + afterRect.width
		: afterRect.y + afterRect.height
	const beforeMinSize = minSizes.get(pair.before.id)!
	const afterMinSize = minSizes.get(pair.after.id)!
	const beforeMin = horizontal ? beforeMinSize.width : beforeMinSize.height
	const afterMin = horizontal ? afterMinSize.width : afterMinSize.height
	const half = config.splitterSize / 2

	const position = horizontal ? point.x : point.y
	const clamped = Math.max(
		start + beforeMin + half,
		Math.min(end - afterMin - half, position)
	)
	const beforeSize = clamped - half - start
	const afterSize = end - (clamped + half)

	const beforeExtra = Math.max(0, beforeSize - beforeMin)
	const afterExtra = Math.max(0, afterSize - afterMin)
	const totalExtra = beforeExtra + afterExtra
	const totalWeight = pair.before.weight + pair.after.weight
	const beforeWeight =
		totalExtra > 0
			? (beforeExtra / totalExtra) * totalWeight
			: totalWeight / 2
	const afterWeight =
		totalExtra > 0
			? (afterExtra / totalExtra) * totalWeight
			: totalWeight / 2

	const children = pair.row.children.map((child) =>
		child === pair.before
			? { ...child, weight: beforeWeight }
			: child === pair.after
				? { ...child, weight: afterWeight }
				: child
	)
	return replaceNode(root, pair.row.id, () =>
		withChildren(pair.row, children)
	)
}
