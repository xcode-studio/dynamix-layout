import { forwardRef } from 'react'
import type { TabContentProps } from '../types'

/** Default `TabContent`: holds a tab's content; positioned by the library. */
export const TabContent = forwardRef<HTMLDivElement, TabContentProps>(
	function TabContent({ tab, isActive, children, ...props }, ref) {
		return (
			<div ref={ref} {...props}>
				{children}
			</div>
		)
	}
)
