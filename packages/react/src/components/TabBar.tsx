import { forwardRef } from 'react'
import type { TabBarProps } from '../types'

/**
 * Default `TabBar`: a scrollable row of tabs with the toolbar at its end.
 * @example
 * const MyTabBar = forwardRef<HTMLDivElement, TabBarProps>(function MyTabBar({ tabset, isRotated, children, ...props }, ref) {
 *   return <div ref={ref} {...props}>{children}<AddTabButton tabsetId={tabset.id} /></div>
 * })
 * <DynamixLayout tabs={tabs} components={{ TabBar: MyTabBar }} />
 */
export const TabBar = forwardRef<HTMLDivElement, TabBarProps>(function TabBar(
	{ tabset, isRotated, children, ...props },
	ref
) {
	return (
		<div ref={ref} {...props}>
			{children}
		</div>
	)
})
