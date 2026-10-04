import type { TabsetState } from '@dynamix-layout/core'
import { useCallback, type MouseEvent, type PointerEvent } from 'react'
import { useLayoutContext } from '../context/layout-context'
import { beginPointerDrag } from '../internal/pointer-drag'
import { getSlotGeometry, positionStyle } from '../internal/slot-geometry'
import type { PropGetter, SlotProps } from '../types'
import { mergeProps } from '../utils/merge-props'
import { useSnapshotSelector } from './use-layout-state'

/** What `useTabset` returns. Functions are stable. */
export interface UseTabsetResult {
	/** `undefined` once the tabset no longer exists. */
	tabset: TabsetState | undefined
	/** The tab bar is drawn as a vertical strip (folded in a side-by-side row). */
	isRotated: boolean
	/** Props for the tabset's box (`role` none; positioned by the library). */
	getPanelProps: PropGetter
	/** Props for the tab bar: `role="tablist"`, drag-to-move the whole tabset, double-click to maximize. */
	getTabBarProps: PropGetter
	toggleMaximize(): void
	toggleFold(): void
}

const isInteractive = (target: EventTarget) =>
	target instanceof Element &&
	!!target.closest('[data-dx-slot="tab"], button, a, input, select, textarea')

/**
 * State and prop getters for one tabset.
 *
 * @param tabsetId - The tabset's id.
 * @throws When used outside a layout.
 */
export function useTabset(tabsetId: string): UseTabsetResult {
	const { core } = useLayoutContext('useTabset')
	const tabset = useSnapshotSelector(core, (s) => s.tabsets.get(tabsetId))
	const isRotated =
		!!tabset?.isFolded && tabset.parentDirection === 'horizontal'

	const panelRef = useCallback(
		(el: HTMLElement | null) => core.register('panel', tabsetId, el),
		[core, tabsetId]
	)
	const barRef = useCallback(
		(el: HTMLElement | null) => core.register('tabBar', tabsetId, el),
		[core, tabsetId]
	)

	const getPanelProps = useCallback(
		<E extends HTMLElement>(props?: SlotProps<E>) => {
			const geometry = getSlotGeometry(
				core.engine.getSnapshot(),
				core.options,
				'panel',
				tabsetId
			)
			return mergeProps(props, {
				ref: panelRef,
				id: core.ids.panel(tabsetId),
				className: 'dx-panel',
				style: positionStyle(geometry),
				'data-dx-slot': 'panel',
				'data-dx-id': tabsetId,
				'data-dx-hidden': geometry?.isHidden ? '' : undefined,
				hidden: geometry?.isHidden || undefined,
			})
		},
		[core, tabsetId, panelRef]
	) as PropGetter

	const getTabBarProps = useCallback(
		<E extends HTMLElement>(props?: SlotProps<E>) => {
			const snapshot = core.engine.getSnapshot()
			const state = snapshot.tabsets.get(tabsetId)
			const geometry = getSlotGeometry(
				snapshot,
				core.options,
				'tabBar',
				tabsetId
			)
			const rotated = !!geometry?.isRotated
			return mergeProps(props, {
				ref: barRef,
				role: 'tablist',
				'aria-orientation': rotated ? 'vertical' : 'horizontal',
				className: 'dx-tab-bar',
				style: positionStyle(geometry),
				'data-dx-slot': 'tabBar',
				'data-dx-id': tabsetId,
				'data-dx-folded': state?.isFolded ? '' : undefined,
				'data-dx-maximized': state?.isMaximized ? '' : undefined,
				'data-dx-rotated': rotated ? '' : undefined,
				'data-dx-hidden': geometry?.isHidden ? '' : undefined,
				hidden: geometry?.isHidden || undefined,
				onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
					if (!isInteractive(event.target))
						beginPointerDrag(core, event, {
							type: 'tabset',
							tabsetId,
						})
				},
				onDoubleClick: (event: MouseEvent<HTMLDivElement>) => {
					const { allowMaximize, maximizeOnDoubleClick } =
						core.options
					if (
						allowMaximize &&
						maximizeOnDoubleClick &&
						!(
							event.target instanceof Element &&
							event.target.closest('button')
						)
					)
						core.engine.toggleMaximize(tabsetId)
				},
			})
		},
		[core, tabsetId, barRef]
	) as PropGetter

	const toggleMaximize = useCallback(
		() => void core.engine.toggleMaximize(tabsetId),
		[core, tabsetId]
	)
	const toggleFold = useCallback(
		() => void core.engine.toggleFold(tabsetId),
		[core, tabsetId]
	)

	return {
		tabset,
		isRotated,
		getPanelProps,
		getTabBarProps,
		toggleMaximize,
		toggleFold,
	}
}
