import { getDropIndicatorRect } from './drop/drop-indicator'
import { getDropTarget } from './drop/drop-target'
import { resizeSplitterWeights } from './geometry/splitter'
import type { Layout } from './layout-types'
import type { CreateId } from './model/types'
import { isSameTarget, type LayoutStore } from './store/layout-store'
import { moveNode } from './tree/move'
import { restore } from './tree/view-state'

type DragActions = Pick<
	Layout,
	'startDrag' | 'updateDrag' | 'setDragTarget' | 'endDrag' | 'cancelDrag'
>

/**
 * One drag model for tabs, tabsets and splitters. Frames are transient
 * (published but not reported); `endDrag` commits with a single
 * `onLayoutChange`, and `cancelDrag` puts a dragged splitter back.
 */
export function createDragActions(
	store: LayoutStore,
	createId: CreateId
): DragActions {
	const actions: DragActions = {
		startDrag(source) {
			if (store.isDestroyed) return false
			const { snapshot, model } = store
			if (source.type === 'splitter') {
				const splitter = snapshot.splitters.get(source.splitterId)
				if (!splitter || splitter.isLocked || model.maximizedTabsetId)
					return false
			} else {
				const exists =
					source.type === 'tab'
						? snapshot.tabs.has(source.tabId)
						: snapshot.tabsets.has(source.tabsetId)
				if (!exists) return false
				// Every target must be visible while dragging.
				store.commit(restore(model), 'maximize')
			}
			store.update({
				drag: {
					source,
					target: null,
					indicator: null,
					startRoot: store.model.root,
				},
			})
			return true
		},

		updateDrag(point, measurements) {
			const { drag, model, rects, config } = store
			if (!drag) return
			if (drag.source.type === 'splitter') {
				const root = resizeSplitterWeights(
					model.root,
					rects,
					config,
					drag.source.splitterId,
					point
				)
				if (root) store.update({ model: { ...model, root } })
				return
			}
			actions.setDragTarget(
				getDropTarget(model, rects, point, drag.source, measurements),
				measurements
			)
		},

		setDragTarget(target, measurements) {
			const { drag, model, rects } = store
			if (
				!drag ||
				drag.source.type === 'splitter' ||
				isSameTarget(drag.target, target)
			)
				return
			const indicator =
				target &&
				getDropIndicatorRect(model, rects, target, measurements)
			store.update({ drag: { ...drag, target, indicator } })
		},

		endDrag() {
			const { drag, model } = store
			if (!drag) return false
			store.update({ drag: null })
			if (drag.source.type === 'splitter') {
				if (model.root === drag.startRoot) return false
				store.report('resize')
				return true
			}
			const moved =
				drag.target &&
				moveNode(model, drag.source, drag.target, createId)
			return store.commit(moved, 'move')
		},

		cancelDrag() {
			const { drag, model } = store
			if (!drag) return
			const putBack =
				drag.source.type === 'splitter' && model.root !== drag.startRoot
			store.update({
				drag: null,
				...(putBack
					? { model: { ...model, root: drag.startRoot } }
					: {}),
			})
		},
	}
	return actions
}
