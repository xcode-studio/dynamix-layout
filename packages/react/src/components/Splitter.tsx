import { forwardRef } from 'react'
import type { SplitterProps } from '../types'

/** Default `Splitter`: a bar with a grip (drawn in CSS). */
export const Splitter = forwardRef<HTMLDivElement, SplitterProps>(
	function Splitter({ splitter, isDragging, ...props }, ref) {
		return <div ref={ref} {...props} />
	}
)
