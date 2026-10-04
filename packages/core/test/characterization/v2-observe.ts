import { isRow } from '../../src/model/guards'
import type {
	LayoutModel,
	Rect,
	RowChild,
	RowNode,
} from '../../src/model/types'
import type { LayoutRects } from '../../src/geometry/compute-rects'
import { splitterId } from '../../src/geometry/compute-rects'
import { firstTabId } from '../../src/tree/find'
import {
	normalizeCanonical,
	tabsetKey,
	type CanonicalNode,
	type CanonicalRow,
	type Observation,
	type RectTuple,
} from './scenario'

const tuple = (r: Rect): RectTuple => [r.x, r.y, r.width, r.height]

/** Describes a v2 model and its rects in the engine-neutral fixture format. */
export function observeV2(model: LayoutModel, rects: LayoutRects): Observation {
	const toCanonical = (node: RowChild): CanonicalNode => {
		if (isRow(node))
			return {
				direction: node.direction,
				children: node.children.map(toCanonical),
			}
		const tabset = {
			tabs: node.children.map((t) => t.id),
			active: node.activeTabId,
		}
		return node.isFolded ? { ...tabset, folded: true } : tabset
	}

	const tabsets: Record<string, RectTuple> = {}
	const splitters: Record<string, RectTuple> = {}
	let maximized: string | null = null
	const visit = (row: RowNode) => {
		row.children.forEach((child, i) => {
			if (isRow(child)) visit(child)
			else {
				const key = tabsetKey(child.children.map((t) => t.id))
				tabsets[key] = tuple(rects.tabsets.get(child.id)!)
				if (child.id === model.maximizedTabsetId) maximized = key
			}
			const next = row.children[i + 1]
			if (next)
				splitters[`${firstTabId(child)}>${firstTabId(next)}`] = tuple(
					rects.splitters.get(splitterId(child.id, next.id))!
				)
		})
	}
	visit(model.root)

	return {
		tree: normalizeCanonical(toCanonical(model.root) as CanonicalRow),
		tabsets,
		splitters,
		maximized,
	}
}
