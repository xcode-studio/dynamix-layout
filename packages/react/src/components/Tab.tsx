import { forwardRef, type HTMLAttributes, type Ref } from 'react'
import type { TabProps } from '../types'

/**
 * Default `Tab`: the title, plus a close button when the tab is closable.
 * @example
 * // Wrap the default tab, e.g. to add a tooltip:
 * const MyTab = forwardRef<HTMLElement, TabProps>(function MyTab(props, ref) {
 *   return <Tooltip content={props.tab.id}><Tab ref={ref} {...props} /></Tooltip>
 * })
 */
export const Tab = forwardRef<HTMLElement, TabProps>(function Tab(
	{ tab, isActive, isDragging, onClose, closeButtonProps, ...props },
	ref
) {
	return (
		<div
			ref={ref as Ref<HTMLDivElement>}
			{...(props as HTMLAttributes<HTMLDivElement>)}
		>
			<span className="dx-tab-title">{tab.title ?? tab.id}</span>
			{closeButtonProps && (
				<button type="button" {...closeButtonProps}>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						aria-hidden="true"
					>
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				</button>
			)}
		</div>
	)
})
