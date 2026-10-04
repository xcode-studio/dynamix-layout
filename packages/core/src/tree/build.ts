import type { CreateId, Direction, RowNode, TabsetNode } from '../model/types'
import { DEFAULT_WEIGHT } from './normalize'

const flip = (direction: Direction): Direction =>
	direction === 'horizontal' ? 'vertical' : 'horizontal'

/** A tabset holding a single tab. */
export function createTabset(tabId: string, createId: CreateId): TabsetNode {
	return {
		type: 'tabset',
		id: createId('tabset', tabId),
		weight: DEFAULT_WEIGHT,
		activeTabId: tabId,
		isFolded: false,
		children: [{ type: 'tab', id: tabId }],
	}
}

/**
 * The layout used when there is no saved one: each tab gets its own tabset,
 * nested so that directions alternate (`t1 | (t2 / (t3 | …))`). This matches
 * v1's default layout exactly.
 *
 * @param tabIds - Tabs in display order.
 * @param createId - Id factory for the rows and tabsets.
 * @param rootId - Id of the root row.
 */
export function buildDefaultTree(
	tabIds: readonly string[],
	createId: CreateId,
	rootId = 'root'
): RowNode {
	const build = (
		ids: readonly string[],
		direction: Direction,
		id: string
	): RowNode => {
		const children: RowNode['children'] =
			ids.length <= 2
				? ids.map((tabId) => createTabset(tabId, createId))
				: [
						createTabset(ids[0], createId),
						build(ids.slice(1), flip(direction), createId('row')),
					]
		return { type: 'row', id, weight: DEFAULT_WEIGHT, direction, children }
	}
	return build(tabIds, 'horizontal', rootId)
}
