import type { Side, TabsetState } from '@dynamix-layout/core'
import {
	useCallback,
	useId,
	useMemo,
	type FocusEvent,
	type KeyboardEvent,
	type PointerEvent,
} from 'react'
import { toPublicController } from '../context/layout-context'
import type { LayoutController as Core } from '../internal/controller'
import { handleRootKeyDown } from '../internal/keyboard'
import { getSlotGeometry, positionStyle } from '../internal/slot-geometry'
import { useController } from '../internal/use-controller'
import type {
	PropGetter,
	SlotProps,
	UseDynamixLayoutOptions,
	UseDynamixLayoutResult,
} from '../types'
import { mergeProps } from '../utils/merge-props'
import { createActions } from './use-layout-actions'
import { useSnapshotSelector } from './use-layout-state'

const SIDES: readonly Side[] = ['left', 'right', 'top', 'bottom']

/** Remembers which tabset the user is working in, for the keyboard shortcuts. */
function trackFocusedTabset(core: Core, target: EventTarget) {
	const element =
		target instanceof Element
			? target.closest<HTMLElement>('[data-dx-slot][data-dx-id]')
			: null
	const id = element?.dataset.dxId
	if (!element || !id) return
	const slot = element.dataset.dxSlot
	if (slot === 'panel' || slot === 'tabBar') core.focusedTabsetId = id
	else if (slot === 'tab' || slot === 'tabContent')
		core.focusedTabsetId =
			core.engine.getSnapshot().tabs.get(id)?.tabsetId ??
			core.focusedTabsetId
}

/** Values of a map as an array whose identity follows the map's. */
const useValues = <T>(map: ReadonlyMap<string, T>) =>
	useMemo(() => [...map.values()], [map])

/**
 * The headless layout: state, prop getters and actions for building a fully
 * custom UI. `<DynamixLayout>` is built on it.
 *
 * Render every tab's content once, in `tabIds` order, as direct children of
 * the root (see `useTab().getTabContentProps`); the library positions it, so
 * moving a tab never remounts its content.
 *
 * @param options - Tabs (content optional) and behaviour options.
 * @returns Lists that change only on structural changes, stable prop getters
 * and actions, and the `controller` to pass to `<DynamixLayoutProvider>`.
 * @example
 * const { controller, getRootProps, tabsets, splitters, tabIds } = useDynamixLayout({ tabs })
 */
export function useDynamixLayout(
	options: UseDynamixLayoutOptions
): UseDynamixLayoutResult {
	const reactId = useId()
	const { core, contextValue, rootRef, isMeasured, tabIds } = useController(
		options,
		options.id ?? reactId
	)

	const tabsets: readonly TabsetState[] = useValues(
		useSnapshotSelector(core, (s) => s.tabsets)
	)
	const splitters = useValues(useSnapshotSelector(core, (s) => s.splitters))
	const tabs = useValues(useSnapshotSelector(core, (s) => s.tabs))
	const drag = useSnapshotSelector(core, (s) => s.drag)

	const getRootProps = useCallback(
		<E extends HTMLElement>(props?: SlotProps<E>) =>
			mergeProps(props, {
				ref: rootRef,
				className: 'dx-root',
				'data-dx-measuring': isMeasured ? undefined : '',
				'data-dx-dragging': core.engine.getSnapshot().drag
					? ''
					: undefined,
				onKeyDown: (event: KeyboardEvent<HTMLDivElement>) =>
					handleRootKeyDown(core, event),
				onPointerDownCapture: (event: PointerEvent<HTMLDivElement>) =>
					trackFocusedTabset(core, event.target),
				onFocusCapture: (event: FocusEvent<HTMLDivElement>) =>
					trackFocusedTabset(core, event.target),
			}),
		[core, rootRef, isMeasured]
	) as PropGetter

	const indicatorRef = useCallback(
		(el: HTMLElement | null) =>
			core.register('dropIndicator', 'indicator', el),
		[core]
	)
	const zoneRefs = useMemo(
		() =>
			Object.fromEntries(
				SIDES.map((side) => [
					side,
					(el: HTMLElement | null) =>
						core.register('rootDropZone', side, el),
				])
			),
		[core]
	)

	const dropIndicator = useMemo(() => {
		if (!drag?.target) return null
		const geometry = getSlotGeometry(
			core.engine.getSnapshot(),
			core.options,
			'dropIndicator',
			'indicator'
		)
		return {
			target: drag.target,
			props: {
				ref: indicatorRef,
				className: 'dx-drop-indicator',
				style: positionStyle(geometry),
				'aria-hidden': true,
				'data-dx-slot': 'dropIndicator',
			} satisfies SlotProps,
		}
	}, [core, drag, indicatorRef])

	const rootDropZones = useMemo(() => {
		if (!drag || drag.source.type === 'splitter') return []
		const snapshot = core.engine.getSnapshot()
		return SIDES.map((side) => ({
			side,
			isActive:
				drag.target?.type === 'root' && drag.target.position === side,
			props: {
				ref: zoneRefs[side],
				className: 'dx-root-drop-zone',
				style: positionStyle(
					getSlotGeometry(
						snapshot,
						core.options,
						'rootDropZone',
						side
					)
				),
				'aria-hidden': true,
				'data-dx-slot': 'rootDropZone',
				'data-dx-side': side,
			} satisfies SlotProps,
		}))
	}, [core, drag, zoneRefs])

	const actions = useMemo(() => createActions(core), [core])
	const controller = useMemo(
		() => toPublicController(contextValue),
		[contextValue]
	)

	return {
		controller,
		getRootProps,
		tabsets,
		splitters,
		tabs,
		tabIds,
		dropIndicator,
		rootDropZones,
		actions,
	}
}
