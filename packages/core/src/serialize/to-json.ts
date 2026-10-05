import { isRow } from '../model/guards'
import type { LayoutModel, RowChild, RowNode, TabsetNode } from '../model/types'
import type { LayoutJSON, RowJSON, TabsetJSON } from './schema'

const tabsetToJSON = (tabset: TabsetNode): TabsetJSON => ({
	type: 'tabset',
	id: tabset.id,
	weight: tabset.weight,
	activeTabId: tabset.activeTabId,
	...(tabset.isFolded ? { isFolded: true } : {}),
	children: tabset.children.map((tab) => ({ type: 'tab', id: tab.id })),
})

const rowToJSON = (row: RowNode): RowJSON => ({
	type: 'row',
	id: row.id,
	weight: row.weight,
	direction: row.direction,
	children: row.children.map((child: RowChild) =>
		isRow(child) ? rowToJSON(child) : tabsetToJSON(child)
	),
})

/**
 * Serializes a model. Weights are kept as they are, so a container resize
 * never changes the result.
 */
export function toLayoutJSON(
	model: Pick<LayoutModel, 'root' | 'maximizedTabsetId'>
): LayoutJSON {
	return {
		version: 2,
		root: rowToJSON(model.root),
		...(model.maximizedTabsetId
			? { maximizedTabsetId: model.maximizedTabsetId }
			: {}),
	}
}
