import { forwardRef } from 'react'
import type { RootDropZoneProps } from '../types'

/** Default `RootDropZone`: a handle at one edge of the layout, shown while dragging a tab. */
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
