import { forwardRef } from 'react'
import type { PanelProps } from '../types'

/** Default `Panel`: the box of a tabset, behind its tab bar and content. */
export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
	{ tabset, ...props },
	ref
) {
	return <div ref={ref} {...props} />
})
