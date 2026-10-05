import { forwardRef } from 'react'
import type { SplitterProps } from '../types'

/**
 * Default `Splitter`: a bar with a grip (drawn in CSS).
 * @example
 * const MySplitter = forwardRef<HTMLDivElement, SplitterProps>(function MySplitter({ splitter, isDragging, ...props }, ref) {
 *   return <div ref={ref} {...props} data-dragging={isDragging || undefined}><Grip /></div>
 * })
 * <DynamixLayout tabs={tabs} components={{ Splitter: MySplitter }} />
 */
export const Splitter = forwardRef<HTMLDivElement, SplitterProps>(
	function Splitter({ splitter, isDragging, ...props }, ref) {
		return <div ref={ref} {...props} />
	}
)
