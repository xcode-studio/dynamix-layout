import type { Node } from './node'
import type { DynamixLayoutCore } from './dynamix'
import type { LayoutTree } from '../type'

export type Timer = {
	set: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>
	clear: (handle: ReturnType<typeof setTimeout>) => void
}

export const defaultCreateId = (): string => crypto.randomUUID()

export const defaultTimer: Timer = {
	set: (callback, ms) => setTimeout(callback, ms),
	clear: (handle) => clearTimeout(handle),
}

/** Shared layout settings and the current root, used by every layout module. */
export const layoutState = {
	createId: defaultCreateId,
	timer: defaultTimer,
	root: undefined as unknown as Node,
	tree: null as LayoutTree | null,
	minW: 40,
	minH: 40,
	bond: 10,
	inst: null as DynamixLayoutCore | null,
}
