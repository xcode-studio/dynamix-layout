import { forwardRef } from 'react'
import type { DropIndicatorProps } from '../types'

/**
 * Default `DropIndicator`: highlights where a dragged tab would land.
 * @example
 * const MyIndicator = forwardRef<HTMLDivElement, DropIndicatorProps>(function MyIndicator({ target, ...props }, ref) {
 *   return <div ref={ref} {...props}>{target.type === 'root' ? 'Dock here' : null}</div>
 * })
 */
export const DropIndicator = forwardRef<HTMLDivElement, DropIndicatorProps>(
	function DropIndicator({ target, ...props }, ref) {
		return <div ref={ref} {...props} />
	}
)
