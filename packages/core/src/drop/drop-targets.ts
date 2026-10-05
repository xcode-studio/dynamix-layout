import type { DropTarget, LayoutModel, Side } from '../model/types'
import { collectTabsets } from '../tree/find'
import { canMove, type MoveSource } from '../tree/move'

const POSITIONS: readonly (Side | 'center')[] = [
	'center',
	'left',
	'right',
	'top',
	'bottom',
]
const ROOT_SIDES: readonly Side[] = ['left', 'right', 'top', 'bottom']

/**
 * Every valid target for a source, in reading order: each tabset's center and
 * sides, then the layout edges. Used by keyboard move mode to cycle targets.
 */
export function listDropTargets(
	model: LayoutModel,
	source: MoveSource
): DropTarget[] {
	const targets: DropTarget[] = []
	for (const tabset of collectTabsets(model.root)) {
		for (const position of POSITIONS)
			targets.push({ type: 'tabset', tabsetId: tabset.id, position })
	}
	for (const position of ROOT_SIDES) targets.push({ type: 'root', position })
	return targets.filter((target) => canMove(model.root, source, target))
}
