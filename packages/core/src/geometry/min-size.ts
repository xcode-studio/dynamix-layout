import { isRow } from '../model/guards'
import type { Direction, RowChild, RowNode } from '../model/types'
import type { GeometryConfig } from './config'

/** Minimum size of a node, plus how many tabsets it stacks along each axis. */
export interface MinSize {
	readonly width: number
	readonly height: number
	/** Tabsets inside rows of each direction (v1 `tabCnts`). */
	readonly horizontalCount: number
	readonly verticalCount: number
}

/**
 * Minimum sizes of every row and tabset, keyed by id. A tabset needs
 * `minPanelSize` (a folded one only `foldedSize` along its row); a row needs
 * the sum of its children along its direction plus splitters, and the largest
 * child across it. Ported from v1 `calcTabsetCountAndMinDim`.
 */
export function computeMinSizes(
	root: RowNode,
	config: GeometryConfig
): Map<string, MinSize> {
	const sizes = new Map<string, MinSize>()
	const { width: minWidth, height: minHeight } = config.minPanelSize

	const visit = (node: RowChild, parentDirection: Direction): MinSize => {
		let size: MinSize
		if (!isRow(node)) {
			const alongHorizontal = parentDirection === 'horizontal'
			size = node.isFolded
				? alongHorizontal
					? {
							width: config.foldedSize,
							height: minHeight,
							horizontalCount: 0,
							verticalCount: 0,
						}
					: {
							width: minWidth,
							height: config.foldedSize,
							horizontalCount: 0,
							verticalCount: 0,
						}
				: {
						width: minWidth,
						height: minHeight,
						horizontalCount: alongHorizontal ? 1 : 0,
						verticalCount: alongHorizontal ? 0 : 1,
					}
		} else {
			let width = 0
			let height = 0
			let horizontalCount = 0
			let verticalCount = 0
			for (const child of node.children) {
				const childSize = visit(child, node.direction)
				horizontalCount += childSize.horizontalCount
				verticalCount += childSize.verticalCount
				if (node.direction === 'horizontal') {
					width += childSize.width
					height = Math.max(height, childSize.height)
				} else {
					height += childSize.height
					width = Math.max(width, childSize.width)
				}
			}
			const splitters = (node.children.length - 1) * config.splitterSize
			if (node.direction === 'horizontal') width += splitters
			else height += splitters
			size = { width, height, horizontalCount, verticalCount }
		}
		sizes.set(node.id, size)
		return size
	}

	visit(root, root.direction)
	return sizes
}

/**
 * Size the root needs. Like v1 `getReqDimension`, this also requires room for
 * every tabset counted along each axis.
 */
export function requiredRootSize(
	rootMin: MinSize,
	config: GeometryConfig
): { width: number; height: number } {
	const along = (count: number, size: number) =>
		count * size + Math.max(0, count - 1) * config.splitterSize
	return {
		width: Math.max(
			rootMin.width,
			along(rootMin.horizontalCount, config.minPanelSize.width)
		),
		height: Math.max(
			rootMin.height,
			along(rootMin.verticalCount, config.minPanelSize.height)
		),
	}
}
