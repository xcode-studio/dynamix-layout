import { forwardRef } from 'react'
import type { RootDropZoneProps } from '../types'

/**
 * Default `RootDropZone`: a handle at one edge of the layout, shown while dragging a tab.
 * @example
 * const MyZone = forwardRef<HTMLDivElement, RootDropZoneProps>(function MyZone({ side, isActive, ...props }, ref) {
 *   return <div ref={ref} {...props} data-active={isActive || undefined} aria-label={`Dock ${side}`} />
 * })
 */
export const RootDropZone = forwardRef<HTMLDivElement, RootDropZoneProps>(
	function RootDropZone({ side, isActive, ...props }, ref) {
		return (
			<div
				ref={ref}
				{...props}
				data-dx-active={isActive ? '' : undefined}
			/>
		)
	}
)
