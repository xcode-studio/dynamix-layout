import { cn } from '@/lib/utils'
import { forwardRef, type HTMLAttributes, type Ref } from 'react'
import type { SplitterProps, TabProps } from '@dynamix-layout/react'

/** A shadcn-style tab: the library passes ARIA, data-state and handlers in `props`. */
export const Tab = forwardRef<HTMLElement, TabProps>(function Tab(
	{
		tab,
		isActive,
		isDragging,
		onClose,
		closeButtonProps,
		className,
		...props
	},
	ref
) {
	return (
		<div
			ref={ref as Ref<HTMLDivElement>}
			{...(props as HTMLAttributes<HTMLDivElement>)}
			className={cn(
				className,
				'inline-flex h-[calc(100%-6px)] items-center gap-1.5 rounded-md border border-transparent px-2 text-sm font-medium whitespace-nowrap text-foreground',
				'data-[state=active]:bg-background data-[state=active]:shadow-sm dark:data-[state=active]:bg-input/30',
				'focus-visible:outline-1 focus-visible:ring-[3px] focus-visible:ring-ring/50',
				isActive && 'font-semibold',
				isDragging && 'opacity-60'
			)}
		>
			{tab.title ?? tab.id}
			{onClose && closeButtonProps && (
				<button
					{...closeButtonProps}
					className={cn(closeButtonProps.className, 'size-4')}
				>
					×
				</button>
			)}
		</div>
	)
})

/** A transparent splitter with a lucide grip, rotated for vertical rows. */
export const Splitter = forwardRef<HTMLDivElement, SplitterProps>(
	function Splitter({ splitter, isDragging, className, ...props }, ref) {
		return (
			<div
				ref={ref}
				{...props}
				className={cn(
					className,
					'grid place-items-center bg-transparent after:hidden',
					isDragging && 'bg-accent'
				)}
			>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					className="size-2.5"
					style={
						splitter.direction === 'vertical'
							? { transform: 'rotate(90deg)' }
							: undefined
					}
					aria-hidden="true"
				>
					<circle cx="9" cy="12" r="1" />
					<circle cx="9" cy="5" r="1" />
					<circle cx="9" cy="19" r="1" />
					<circle cx="15" cy="12" r="1" />
					<circle cx="15" cy="5" r="1" />
					<circle cx="15" cy="19" r="1" />
				</svg>
			</div>
		)
	}
)
