import type { TabState } from '@dynamix-layout/core'
import { useCallback, type KeyboardEvent, type PointerEvent } from 'react'
import { useLayoutContext } from '../context/layout-context'
import { handleTabKeyDown } from '../internal/keyboard'
import { beginPointerDrag } from '../internal/pointer-drag'
import { useTabItem } from '../internal/tab-registry'
import { getSlotGeometry, positionStyle } from '../internal/slot-geometry'
import type { HeadlessTabItem, PropGetter, SlotProps } from '../types'
import { mergeProps } from '../utils/merge-props'
import { useSnapshotSelector } from './use-layout-state'

/** What `useTab` returns. Functions are stable. */
export interface UseTabResult {
	/** The tab's layout state; `undefined` while it isn't placed. */
	tab: TabState | undefined
	/** The item you passed in `tabs`. */
	item: HeadlessTabItem | undefined
	isActive: boolean
	isDragging: boolean
	select(): void
	/** Asks to close the tab (`onTabClose`); does nothing unless it's closable. */
	close(): void
	/** Props for the tab: `role="tab"`, ARIA state, roving tabindex, click, drag and keys. */
	getTabProps: PropGetter
	/** Props for the tab's content: `role="tabpanel"`, positioned by the library. */
	getTabContentProps: PropGetter
}

/**
 * State and prop getters for one tab.
 *
 * @param tabId - The tab's id.
 * @throws When used outside a layout.
 */
export function useTab(tabId: string): UseTabResult {
	const { core, tabs } = useLayoutContext('useTab')
	const item = useTabItem(tabs, tabId)
	const tab = useSnapshotSelector(core, (s) => s.tabs.get(tabId))
	const isDragging = useSnapshotSelector(
		core,
		(s) => s.drag?.source.type === 'tab' && s.drag.source.tabId === tabId
	)
	const isClosable = !!item?.closable

	const contentRef = useCallback(
		(el: HTMLElement | null) => core.register('tabContent', tabId, el),
		[core, tabId]
	)
	const select = useCallback(
		() => void core.engine.selectTab(tabId),
		[core, tabId]
	)
	const close = useCallback(() => {
		if (isClosable) core.options.onTabClose?.(tabId)
	}, [core, tabId, isClosable])

	const getTabProps = useCallback(
		<E extends HTMLElement>(props?: SlotProps<E>) => {
			const snapshot = core.engine.getSnapshot()
			const state = snapshot.tabs.get(tabId)
			const tabset = state && snapshot.tabsets.get(state.tabsetId)
			const isRotated =
				!!tabset?.isFolded && tabset.parentDirection === 'horizontal'
			const active = !!state?.isActive
			return mergeProps(props, {
				role: 'tab',
				id: core.ids.tab(tabId),
				'aria-selected': active,
				'aria-controls': core.ids.tabContent(tabId),
				tabIndex: active ? 0 : -1,
				className: 'dx-tab',
				'data-dx-slot': 'tab',
				'data-dx-id': tabId,
				'data-state': active ? 'active' : 'inactive',
				onClick: () => core.engine.selectTab(tabId),
				onPointerDown: (event: PointerEvent<HTMLElement>) =>
					beginPointerDrag(core, event, { type: 'tab', tabId }),
				onKeyDown: (event: KeyboardEvent<HTMLElement>) =>
					handleTabKeyDown(core, event, tabId, {
						isRotated,
						isClosable,
					}),
			})
		},
		[core, tabId, isClosable]
	) as PropGetter

	const getTabContentProps = useCallback(
		<E extends HTMLElement>(props?: SlotProps<E>) => {
			const geometry = getSlotGeometry(
				core.engine.getSnapshot(),
				core.options,
				'tabContent',
				tabId
			)
			return mergeProps(props, {
				ref: contentRef,
				role: 'tabpanel',
				id: core.ids.tabContent(tabId),
				'aria-labelledby': core.ids.tab(tabId),
				tabIndex: 0,
				className: 'dx-tab-content',
				style: positionStyle(geometry),
				'data-dx-slot': 'tabContent',
				'data-dx-id': tabId,
				'data-dx-hidden': geometry?.isHidden ? '' : undefined,
				hidden: geometry?.isHidden || undefined,
			})
		},
		[core, tabId, contentRef]
	) as PropGetter

	return {
		tab,
		item,
		isActive: !!tab?.isActive,
		isDragging,
		select,
		close,
		getTabProps,
		getTabContentProps,
	}
}
