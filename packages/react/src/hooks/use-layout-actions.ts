import { useMemo } from 'react'
import { useLayoutContext } from '../context/layout-context'
import type { LayoutController as Core } from '../internal/controller'
import type { LayoutActions } from '../types'

/** Builds the stable actions object of a layout. */
export function createActions(core: Core): LayoutActions {
	const { engine } = core
	return {
		moveTab: engine.moveTab,
		moveTabset: engine.moveTabset,
		selectTab: engine.selectTab,
		maximize: engine.maximize,
		restore: engine.restore,
		toggleMaximize: engine.toggleMaximize,
		fold: engine.fold,
		unfold: engine.unfold,
		toggleFold: engine.toggleFold,
		reset: engine.reset,
		toJSON: engine.toJSON,
		getSnapshot: engine.getSnapshot,
	}
}

/**
 * Layout actions from anywhere inside a layout. The object and every function
 * in it keep their identity for the layout's lifetime.
 *
 * @throws When used outside a layout.
 * @example
 * const { moveTab, selectTab } = useLayoutActions()
 * moveTab('terminal', { type: 'root', position: 'bottom' })
 */
export function useLayoutActions(): LayoutActions {
	const { core } = useLayoutContext('useLayoutActions')
	return useMemo(() => createActions(core), [core])
}
