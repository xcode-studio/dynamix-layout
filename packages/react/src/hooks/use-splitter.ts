import type { Direction, SplitterState } from '@dynamix-layout/core'
import { useCallback, type KeyboardEvent, type PointerEvent } from 'react'
import { useLayoutContext } from '../context/layout-context'
import { splitterAria } from '../internal/splitter-aria'
import { nodeLabel } from '../internal/tab-label'
import { handleSplitterKeyDown } from '../internal/keyboard'
import { beginPointerDrag } from '../internal/pointer-drag'
import { getSlotGeometry, positionStyle } from '../internal/slot-geometry'
import type { PropGetter, SlotProps } from '../types'
import { mergeProps } from '../utils/merge-props'
import { useSnapshotSelector } from './use-layout-state'

/** What `useSplitter` returns. Functions are stable. */
export interface UseSplitterResult {
	/** `undefined` once the splitter no longer exists. */
	splitter: SplitterState | undefined
	isDragging: boolean
	/** Direction of the row it divides; a `'horizontal'` row has a vertical bar. */
	direction: Direction | undefined
	/**
	 * Size of the panel before the splitter and its limits, in px, as of the
	 * last render. They aren't reactive (they change on every drag frame); the
	 * `aria-value*` attributes are kept current by the library.
	 */
	value: number
	min: number
	max: number
	/** Props for the splitter: `role="separator"`, ARIA values, pointer drag and arrow keys. */
	getSplitterProps: PropGetter
}

/**
 * State and prop getters for one splitter.
 *
 * @param splitterId - The splitter's id (from `useDynamixLayout().splitters`).
 * @throws When used outside a layout.
 */
export function useSplitter(splitterId: string): UseSplitterResult {
	const { core, tabs } = useLayoutContext('useSplitter')
	const splitter = useSnapshotSelector(core, (s) =>
		s.splitters.get(splitterId)
	)
	const isDragging = useSnapshotSelector(
		core,
		(s) =>
			s.drag?.source.type === 'splitter' &&
			s.drag.source.splitterId === splitterId
	)
	const ref = useCallback(
		(el: HTMLElement | null) => core.register('splitter', splitterId, el),
		[core, splitterId]
	)

	const getSplitterProps = useCallback(
		<E extends HTMLElement>(props?: SlotProps<E>) => {
			const snapshot = core.engine.getSnapshot()
			const state = snapshot.splitters.get(splitterId)
			const geometry = getSlotGeometry(
				snapshot,
				core.options,
				'splitter',
				splitterId
			)
			const { percent } = splitterAria(core, splitterId)
			const label = (id: string | undefined) =>
				id ? nodeLabel(snapshot, id, tabs) : 'panel'
			return mergeProps(props, {
				ref,
				role: 'separator',
				'aria-orientation':
					state?.direction === 'horizontal'
						? 'vertical'
						: 'horizontal',
				'aria-valuenow': percent?.now,
				'aria-valuemin': percent?.min,
				'aria-valuemax': percent?.max,
				'aria-controls':
					state && snapshot.tabsets.has(state.beforeId)
						? core.ids.panel(state.beforeId)
						: undefined,
				'aria-label': `Resize ${label(state?.beforeId)} and ${label(state?.afterId)}`,
				'aria-disabled': state?.isLocked || undefined,
				tabIndex: geometry?.isHidden ? -1 : 0,
				className: 'dx-splitter',
				style: positionStyle(geometry),
				'data-dx-slot': 'splitter',
				'data-dx-id': splitterId,
				'data-dx-direction': state?.direction,
				'data-dx-locked': state?.isLocked ? '' : undefined,
				'data-dx-hidden': geometry?.isHidden ? '' : undefined,
				onPointerDown: (event: PointerEvent<HTMLDivElement>) =>
					beginPointerDrag(core, event, {
						type: 'splitter',
						splitterId,
					}),
				onKeyDown: (event: KeyboardEvent<HTMLDivElement>) =>
					handleSplitterKeyDown(core, event, splitterId),
			})
		},
		[core, tabs, splitterId, ref]
	) as PropGetter

	const bounds = core.engine.getSplitterBounds(splitterId)
	return {
		splitter,
		isDragging,
		direction: splitter?.direction,
		value: bounds?.value ?? 0,
		min: bounds?.min ?? 0,
		max: bounds?.max ?? 0,
		getSplitterProps,
	}
}
