import type { LayoutSnapshot } from '@dynamix-layout/core'
import { useRef, useSyncExternalStore } from 'react'
import { useLayoutContext } from '../context/layout-context'
import type { LayoutController as Core } from '../internal/controller'

/**
 * Subscribes to a slice of a layout's snapshot. Re-renders only when the
 * selected value changes according to `isEqual`. The selection is cached per
 * snapshot, so React's repeated `getSnapshot` calls return the same value.
 */
export function useSnapshotSelector<T>(
	core: Core,
	selector: (snapshot: LayoutSnapshot) => T,
	isEqual: (a: T, b: T) => boolean = Object.is
): T {
	const cache = useRef<{ snapshot: LayoutSnapshot; value: T } | null>(null)
	const select = () => {
		const snapshot = core.engine.getSnapshot()
		const cached = cache.current
		if (cached && cached.snapshot === snapshot) return cached.value
		const next = selector(snapshot)
		const value =
			cached && isEqual(cached.value, next) ? cached.value : next
		cache.current = { snapshot, value }
		return value
	}
	return useSyncExternalStore(core.engine.subscribe, select, select)
}

/**
 * Reads part of the layout state from anywhere inside a layout, re-rendering
 * only when that part changes. Snapshots share unchanged parts by reference,
 * so selecting an object (`s.tabsets.get(id)`) is cheap and precise.
 *
 * @param selector - Picks the value from the snapshot.
 * @param isEqual - Decides whether the value changed. @default Object.is
 * @returns The selected value.
 * @throws When used outside a layout.
 * @example
 * const activeTabId = useLayoutState((s) => s.tabsets.get(tabsetId)?.activeTabId)
 */
export function useLayoutState<T>(
	selector: (snapshot: LayoutSnapshot) => T,
	isEqual?: (a: T, b: T) => boolean
): T {
	const { core } = useLayoutContext('useLayoutState')
	return useSnapshotSelector(core, selector, isEqual)
}
