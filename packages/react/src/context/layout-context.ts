import { createContext, useContext } from 'react'
import type { LayoutController as Core } from '../internal/controller'
import type { TabRegistry } from '../internal/tab-registry'
import type { LayoutController } from '../types'

/** What the hooks share. Stable for the layout's lifetime, so it never re-renders consumers. */
export interface LayoutContextValue {
	readonly core: Core
	readonly tabs: TabRegistry
}

export const LayoutContext = createContext<LayoutContextValue | null>(null)

/** The public, opaque controller is the context value itself. */
export const toPublicController = (value: LayoutContextValue) =>
	value as unknown as LayoutController

export const fromPublicController = (controller: LayoutController) =>
	controller as unknown as LayoutContextValue

/**
 * Reads the layout context.
 * @throws When used outside `<DynamixLayout>` or `<DynamixLayoutProvider>`.
 */
export function useLayoutContext(hookName: string): LayoutContextValue {
	const value = useContext(LayoutContext)
	if (!value) {
		throw new Error(
			`\`${hookName}\` must be used inside <DynamixLayout> or <DynamixLayoutProvider>.`
		)
	}
	return value
}
