import { isRow } from '../model/guards'
import type { Rect, RowNode } from '../model/types'
import type { GeometryConfig } from './config'
import { computeMinSizes, requiredRootSize, type MinSize } from './min-size'

/** Every rect of a layout, in layout-root coordinates. */
export interface LayoutRects {
	/** Area the layout fills; larger than the container when it can't fit. */
	readonly container: Rect
	readonly rows: ReadonlyMap<string, Rect>
	/** As displayed: a maximized tabset gets the whole container. */
	readonly tabsets: ReadonlyMap<string, Rect>
	readonly splitters: ReadonlyMap<string, Rect>
}

/** Id of the splitter between two adjacent children of a row. */
export const splitterId = (beforeId: string, afterId: string) =>
	`${beforeId}~${afterId}`

const sameRect = (a: Rect | undefined, b: Rect) =>
	!!a &&
	a.x === b.x &&
	a.y === b.y &&
	a.width === b.width &&
	a.height === b.height

/**
 * Positions every row, tabset and splitter. Each row gives its children their
 * minimum size plus a share of the remaining space proportional to their
 * weights (folded tabsets get no share). Boundaries are rounded cumulatively,
 * so every edge is within half a pixel of its exact position and edges outside
 * a resized pair never move. Ported from v1 `Node.calcDimensions`.
 *
 * When the container is smaller than the layout's minimum, the layout grows
 * past it (and is clipped by the adapter), as in v1.
 *
 * @param previous - Rects to reuse by reference when unchanged.
 */
export function computeLayoutRects(
	root: RowNode,
	container: Rect,
	config: GeometryConfig,
	maximizedTabsetId: string | null,
	previous?: LayoutRects
): LayoutRects {
	const minSizes = computeMinSizes(root, config)
	const required = requiredRootSize(minSizes.get(root.id)!, config)
	const rootRect: Rect = {
		x: container.x,
		y: container.y,
		width: Math.max(container.width, required.width),
		height: Math.max(container.height, required.height),
	}

	const rows = new Map<string, Rect>()
	const tabsets = new Map<string, Rect>()
	const splitters = new Map<string, Rect>()
	const keep = (
		map: Map<string, Rect>,
		old: ReadonlyMap<string, Rect> | undefined,
		id: string,
		rect: Rect
	) => map.set(id, sameRect(old?.get(id), rect) ? old!.get(id)! : rect)

	const layoutRow = (row: RowNode, rect: Rect) => {
		keep(rows, previous?.rows, row.id, rect)
		const horizontal = row.direction === 'horizontal'
		const rowMin = minSizes.get(row.id)!
		const extraSpace = horizontal
			? rect.width - rowMin.width
			: rect.height - rowMin.height
		const isBelowMin = extraSpace < 0

		let totalWeight = 0
		let lastFlexId: string | undefined
		let flexCount = 0
		for (const child of row.children) {
			if (!isRow(child) && child.isFolded) continue
			totalWeight += child.weight
			lastFlexId = child.id
			flexCount++
		}
		// Every open child at weight 0 (each dragged to its minimum): share
		// equally rather than leaving the space unassigned.
		const allZero = totalWeight === 0
		const weightOf = (weight: number) => (allZero ? 1 : weight)
		if (allZero) totalWeight = flexCount

		let offset = 0
		let cumulativeWeight = 0
		let previousBoundary = 0
		row.children.forEach((child, index) => {
			const childMin: MinSize = minSizes.get(child.id)!
			const isFlexible = isRow(child) || !child.isFolded
			let extra = 0
			if (!isBelowMin && isFlexible && totalWeight > 0) {
				cumulativeWeight += weightOf(child.weight)
				const boundary =
					child.id === lastFlexId
						? extraSpace
						: Math.round(
								(extraSpace * cumulativeWeight) / totalWeight
							)
				extra = boundary - previousBoundary
				previousBoundary = boundary
			}

			const childRect: Rect = horizontal
				? {
						x: rect.x + offset,
						y: rect.y,
						width: childMin.width + extra,
						height: rect.height,
					}
				: {
						x: rect.x,
						y: rect.y + offset,
						width: rect.width,
						height: childMin.height + extra,
					}
			offset +=
				(horizontal ? childRect.width : childRect.height) +
				config.splitterSize

			if (isRow(child)) layoutRow(child, childRect)
			else keep(tabsets, previous?.tabsets, child.id, childRect)

			const next = row.children[index + 1]
			if (next) {
				const splitter: Rect = horizontal
					? {
							x: childRect.x + childRect.width,
							y: childRect.y,
							width: config.splitterSize,
							height: childRect.height,
						}
					: {
							x: childRect.x,
							y: childRect.y + childRect.height,
							width: childRect.width,
							height: config.splitterSize,
						}
				keep(
					splitters,
					previous?.splitters,
					splitterId(child.id, next.id),
					splitter
				)
			}
		})
	}

	layoutRow(root, rootRect)
	if (maximizedTabsetId && tabsets.has(maximizedTabsetId)) {
		keep(tabsets, previous?.tabsets, maximizedTabsetId, rootRect)
	}

	const containerRect = sameRect(previous?.container, rootRect)
		? previous!.container
		: rootRect
	return { container: containerRect, rows, tabsets, splitters }
}
