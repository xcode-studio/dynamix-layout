import type { ReactElement, ReactNode } from 'react'
import type { LayoutController } from '../types'
import { LayoutContext, fromPublicController } from './layout-context'

/** Props of {@link DynamixLayoutProvider}. */
export interface DynamixLayoutProviderProps {
	/** The `controller` returned by `useDynamixLayout`. */
	controller: LayoutController
	children?: ReactNode
}

/**
 * Makes a layout created with `useDynamixLayout` available to `useTab`,
 * `useTabset`, `useSplitter`, `useLayoutState` and `useLayoutActions`.
 * `<DynamixLayout>` renders one for you.
 *
 * @example
 * const layout = useDynamixLayout({ tabs })
 * return (
 *   <DynamixLayoutProvider controller={layout.controller}>
 *     <div {...layout.getRootProps()}>…</div>
 *   </DynamixLayoutProvider>
 * )
 */
export function DynamixLayoutProvider({
	controller,
	children,
}: DynamixLayoutProviderProps): ReactElement {
	return (
		<LayoutContext.Provider value={fromPublicController(controller)}>
			{children}
		</LayoutContext.Provider>
	)
}
