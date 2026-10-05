import React, { forwardRef, HTMLAttributes, ReactNode } from 'react'

type DefaultWrapTabLabelProps = HTMLAttributes<HTMLDivElement> & {
	active?: boolean
	children?: ReactNode
}

/** @deprecated Renamed in 2.0 to `Tab` (pass it as `components.Tab`). See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export const DefaultWrapTabLabel = forwardRef<
	HTMLDivElement,
	DefaultWrapTabLabelProps
>(({ children, active, ...props }, ref) => (
	<div
		ref={ref}
		{...props}
		data-state={active ? 'active' : 'inactive'}
		className={`DefaultWrapTabLabel ${props.className || ''}`}
		style={{
			alignSelf: 'center',
			padding: '4px 6px',
			boxSizing: 'border-box',
			fontSize: '14px',
			borderRadius: '4px',
			...props.style,
		}}
	>
		{children}
	</div>
))
DefaultWrapTabLabel.displayName = 'DefaultWrapTabLabel'

/** @deprecated Renamed in 2.0 to `TabContent` (pass it as `components.TabContent`). See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export const DefaultWrapTabBody = forwardRef<
	HTMLDivElement,
	{ children?: ReactNode } & HTMLAttributes<HTMLDivElement>
>(({ children, ...props }, ref) => (
	<div
		ref={ref}
		{...props}
		className={`DefaultWrapTabBody hide-scrollbar ${props.className || ''}`}
		style={{
			boxSizing: 'border-box',
			height: '100%',
			width: '100%',
			display: 'grid',
			overflow: 'auto',
			scrollbarWidth: 'none',
			msOverflowStyle: 'none',
			...props.style,
		}}
	>
		{children}
	</div>
))
DefaultWrapTabBody.displayName = 'DefaultWrapTabBody'

/** @deprecated Renamed in 2.0 to `TabBar` (pass it as `components.TabBar`). See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export const DefaultWrapTabHead = forwardRef<
	HTMLDivElement,
	{ children?: ReactNode } & HTMLAttributes<HTMLDivElement>
>(({ children, ...props }, ref) => (
	<div
		ref={ref}
		{...props}
		className={`DefaultWrapTabHead hide-scrollbar ${props.className || ''}`}
		style={{
			display: 'grid',
			gridAutoFlow: 'column',
			justifyContent: 'start',
			alignItems: 'center',
			gap: '6px',
			paddingLeft: '8px',
			backgroundColor: '#dfdfdf',
			width: '100%',
			boxSizing: 'border-box',
			height: '100%',
			overflow: 'auto',
			placeItems: 'self-start',
			scrollbarWidth: 'none',
			msOverflowStyle: 'none',
			...props.style,
		}}
	>
		{children}
	</div>
))
DefaultWrapTabHead.displayName = 'DefaultWrapTabHead'

/** @deprecated Renamed in 2.0 to `Panel` (pass it as `components.Panel`). See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export const DefaultWrapTabPanel = forwardRef<
	HTMLDivElement,
	{ children?: ReactNode } & HTMLAttributes<HTMLDivElement>
>(({ children, ...props }, ref) => (
	<div
		ref={ref}
		className={`DefaultWrapTabPanel ${props.className || ''}`}
		{...props}
		style={{
			display: 'grid',
			alignItems: 'center',
			placeItems: 'self-start',
			boxSizing: 'border-box',
			position: 'absolute',
			borderRadius: '8px',
			...props.style,
		}}
	>
		{children}
	</div>
))
DefaultWrapTabPanel.displayName = 'DefaultWrapTabPanel'

/** @deprecated Renamed in 2.0 to `DropIndicator` (pass it as `components.DropIndicator`). See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export const DefaultHoverElement = forwardRef<
	HTMLDivElement,
	{ children?: ReactNode } & HTMLAttributes<HTMLDivElement>
>(({ children, ...props }, ref) => (
	<div
		ref={ref}
		className={`DefaultHoverElement ${props.className || ''}`}
		{...props}
		style={{
			position: 'absolute',
			display: 'none',
			zIndex: -1,
			backgroundColor: 'rgba(0, 175, 249, 0.5)',
			justifyContent: 'center',
			alignItems: 'center',
			opacity: 0.7,
			boxSizing: 'border-box',
			fontWeight: 'bold',
			pointerEvents: 'none',
			borderRadius: '10px',
			transition: 'all 0.2s ease',
			border: '2px dashed rgb(0, 196, 42)',
			...props.style,
		}}
	>
		{children}
	</div>
))
DefaultHoverElement.displayName = 'DefaultHoverElement'

type DefaultSliderElementProps = HTMLAttributes<HTMLDivElement> & {
	children?: ReactNode
	direction?: boolean
}

/** @deprecated Renamed in 2.0 to `Splitter` (pass it as `components.Splitter`). See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export const DefaultSliderElement = forwardRef<
	HTMLDivElement,
	DefaultSliderElementProps
>(({ children, direction, ...props }, ref) => (
	<div
		ref={ref}
		{...props}
		className={`DefaultSliderElement ${props.className || ''}`}
		style={{
			width: '100%',
			height: '100%',
			position: 'absolute',
			boxSizing: 'border-box',
			backgroundColor: 'white',
			zIndex: 9,
			cursor: 'grab',
			...props.style,
		}}
	>
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '4px',
				height: '100%',
				flexDirection: direction ? 'column' : 'row',
			}}
		>
			{!direction ? (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="lucide lucide-grip-vertical size-2.5"
				>
					<circle cx="9" cy="12" r="1" />
					<circle cx="9" cy="5" r="1" />
					<circle cx="9" cy="19" r="1" />
					<circle cx="15" cy="12" r="1" />
					<circle cx="15" cy="5" r="1" />
					<circle cx="15" cy="19" r="1" />
				</svg>
			) : (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					style={{ transform: 'rotate(90deg)' }}
				>
					<circle cx="9" cy="12" r="1" />
					<circle cx="9" cy="5" r="1" />
					<circle cx="9" cy="19" r="1" />
					<circle cx="15" cy="12" r="1" />
					<circle cx="15" cy="5" r="1" />
					<circle cx="15" cy="19" r="1" />
				</svg>
			)}
		</div>
		{children}
	</div>
))
DefaultSliderElement.displayName = 'DefaultSliderElement'

/** @deprecated Renamed in 2.0 to `RootDropZone` (pass it as `components.RootDropZone`). See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export const RootSplitterHoverEl = forwardRef<
	HTMLDivElement,
	{
		children?: ReactNode
		area: 'left' | 'right' | 'top' | 'bottom'
		size?: { w: string; h: string }
		gap?: string
	} & HTMLAttributes<HTMLDivElement>
>(
	(
		{
			children,
			area,
			size = { h: '20%', w: '6px' },
			gap = '0px',
			...props
		},
		ref
	) => {
		let dynamicStyle: React.CSSProperties = {}

		if (area === 'left') {
			dynamicStyle = {
				borderTopRightRadius: '16px',
				borderBottomRightRadius: '16px',
				height: size.h,
				left: gap,
				width: size.w,
			}
			dynamicStyle.top = `calc(50% - ${dynamicStyle.height} / 2)`
		} else if (area === 'top') {
			dynamicStyle = {
				borderBottomLeftRadius: '16px',
				borderBottomRightRadius: '16px',
				width: size.h,
				top: gap,
				height: size.w,
			}
			dynamicStyle.left = `calc(50% - ${dynamicStyle.width} / 2)`
		} else if (area === 'right') {
			dynamicStyle = {
				borderTopLeftRadius: '16px',
				borderBottomLeftRadius: '16px',
				height: size.h,
				right: gap,
				width: size.w,
			}
			dynamicStyle.top = `calc(50% - ${dynamicStyle.height} / 2)`
		} else if (area === 'bottom') {
			dynamicStyle = {
				borderTopLeftRadius: '16px',
				borderTopRightRadius: '16px',
				width: size.h,
				bottom: gap,
				height: size.w,
			}
			dynamicStyle.left = `calc(50% - ${dynamicStyle.width} / 2)`
		}

		return (
			<div
				ref={ref}
				{...props}
				className={`RootSplitterHoverEl ${props.className || ''}`}
				style={{
					position: 'absolute',
					zIndex: -1,
					display: 'none',
					boxSizing: 'border-box',
					backgroundColor: '#0081f9',
					cursor: 'grab',
					...dynamicStyle,
					...props.style,
				}}
			>
				{children}
			</div>
		)
	}
)
RootSplitterHoverEl.displayName = 'RootSplitterHoverEl'
