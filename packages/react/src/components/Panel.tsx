import { forwardRef } from 'react'
import type { PanelProps } from '../types'

/**
 * Default `Panel`: the box of a tabset, behind its tab bar and content.
 * @example
 * // Wrap the default (slot components must forward `ref`):
 * const MyPanel = forwardRef<HTMLDivElement, PanelProps>(function MyPanel(props, ref) {
 *   return <Panel ref={ref} {...props} data-theme="dark" />
 * })
 * <DynamixLayout tabs={tabs} components={{ Panel: MyPanel }} />
 */
export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
	{ tabset, ...props },
	ref
) {
	return <div ref={ref} {...props} />
})
