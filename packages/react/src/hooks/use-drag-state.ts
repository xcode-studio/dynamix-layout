import type { DragState } from '@dynamix-layout/core'
import { useLayoutState } from './use-layout-state'

/**
 * The drag in progress (its source, target and indicator rect), or `null`.
 * Changes when a drag starts or ends and when its target changes, not on every
 * pointer move.
 *
 * @throws When used outside a layout.
 */
export function useDragState(): DragState | null {
	return useLayoutState((snapshot) => snapshot.drag)
}
