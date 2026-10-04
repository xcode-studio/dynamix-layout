import { forwardRef } from 'react'
import type { DropIndicatorProps } from '../types'

/** Default `DropIndicator`: highlights where a dragged tab would land. */
export const DropIndicator = forwardRef<HTMLDivElement, DropIndicatorProps>(
	function DropIndicator({ target, ...props }, ref) {
		return <div ref={ref} {...props} />
	}
)
