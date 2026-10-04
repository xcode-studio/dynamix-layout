import { JSX, createMemo, onCleanup, onMount, splitProps } from 'solid-js'
import type { TabsetToolbarProps } from '../types'

type DivProps = {
	children?: JSX.Element
	active?: boolean
} & JSX.HTMLAttributes<HTMLDivElement>

export const DefaultWrapTabLabel = (props: DivProps) => (
	<div
		{...props}
		class={`DefaultWrapTabLabel ${props.class || ''}`}
		data-state={props.active ? 'active' : 'inactive'}
		style={{
			'align-self': 'center',
			padding: '4px 6px',
			'box-sizing': 'border-box',
			'font-size': '14px',
			'border-radius': '4px',
			...(props.style as JSX.CSSProperties),
		}}
	>
		{props.children}
	</div>
)

export const DefaultWrapTabBody = (props: DivProps) => (
	<div
		{...props}
		class={`DefaultWrapTabBody hide-scrollbar ${props.class || ''}`}
		style={{
			'box-sizing': 'border-box',
			height: '100%',
			width: '100%',
			display: 'grid',
			overflow: 'auto',
			'scrollbar-width': 'none',
			'-ms-overflow-style': 'none',
			...(props.style as JSX.CSSProperties),
		}}
	>
		{props.children}
	</div>
)

export const DefaultWrapTabHead = (props: DivProps) => (
	<div
		{...props}
		class={`DefaultWrapTabHead hide-scrollbar ${props.class || ''}`}
		style={{
			display: 'grid',
			'grid-auto-flow': 'column',
			'justify-content': 'start',
			'align-items': 'center',
			gap: '6px',
			'padding-left': '8px',
			width: '100%',
			'box-sizing': 'border-box',
			height: '100%',
			'place-items': 'self-start',
			overflow: 'auto',
			'background-color': '#dfdfdf',
			'scrollbar-width': 'none',
			'-ms-overflow-style': 'none',
			...(props.style as JSX.CSSProperties),
		}}
	>
		{props.children}
	</div>
)

export const DefaultWrapTabPanel = (props: DivProps) => (
	<div
		{...props}
		class={`DefaultWrapTabPanel ${props.class || ''}`}
		style={{
			display: 'grid',
			'align-items': 'center',
			'place-items': 'self-start',
			'box-sizing': 'border-box',
			position: 'absolute',
			'border-radius': '8px',
			...(props.style as JSX.CSSProperties),
		}}
	>
		{props.children}
	</div>
)

export const DefaultHoverElement = (props: DivProps) => (
	<div
		{...props}
		class={`DefaultHoverElement ${props.class || ''}`}
		style={{
			display: 'flex',
			'justify-content': 'center',
			'align-items': 'center',
			opacity: 0.7,
			position: 'absolute',
			'box-sizing': 'border-box',
			'font-weight': 'bold',
			'pointer-events': 'none',
			'background-color': 'rgba(0, 175, 249, 0.5)',
			'border-radius': '10px',
			transition: 'all 0.2s ease',
			border: '2px dashed rgb(0, 196, 42)',
			...(props.style as JSX.CSSProperties),
		}}
	>
		{props.children}
	</div>
)

export const DefaultSliderElement = (
	props: {
		direction?: boolean
		children?: JSX.Element
	} & DivProps
) => {
	return (
		<div
			{...props}
			class={`DefaultSliderElement ${props.class || ''}`}
			style={{
				width: '100%',
				height: '100%',
				position: 'absolute',
				'box-sizing': 'border-box',
				'background-color': 'white',
				'z-index': 9,
				cursor: 'grab',
				...(props.style as JSX.CSSProperties),
			}}
		>
			<div
				style={{
					display: 'flex',
					'align-items': 'center',
					gap: '4px',
					height: '100%',
					'flex-direction': props.direction ? 'column' : 'row',
				}}
			>
				{!props.direction ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="lucide lucide-grip-vertical size-2.5"
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
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
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
			{props.children}
		</div>
	)
}

export const RootSplitterHoverEl = (
	props: {
		area: 'left' | 'right' | 'top' | 'bottom'
		size?: { w: string; h: string }
		gap?: string
	} & DivProps
) => {
	const [local, rest] = splitProps(props, [
		'area',
		'size',
		'gap',
		'class',
		'style',
		'children',
	])

	const dynamicStyle = createMemo(() => {
		const size = local.size || { h: '20%', w: '6px' }
		const gap = local.gap || '0px'
		const style: JSX.CSSProperties = {}

		if (local.area === 'left') {
			Object.assign(style, {
				'border-top-right-radius': '16px',
				'border-bottom-right-radius': '16px',
				height: size.h,
				left: gap,
				width: size.w,
			})
			style.top = `calc(50% - ${size.h} / 2)`
		} else if (local.area === 'top') {
			Object.assign(style, {
				'border-bottom-left-radius': '16px',
				'border-bottom-right-radius': '16px',
				width: size.h,
				top: gap,
				height: size.w,
			})
			style.left = `calc(50% - ${size.h} / 2)`
		} else if (local.area === 'right') {
			Object.assign(style, {
				'border-top-left-radius': '16px',
				'border-bottom-left-radius': '16px',
				height: size.h,
				right: gap,
				width: size.w,
			})
			style.top = `calc(50% - ${size.h} / 2)`
		} else if (local.area === 'bottom') {
			Object.assign(style, {
				'border-top-left-radius': '16px',
				'border-top-right-radius': '16px',
				width: size.h,
				bottom: gap,
				height: size.w,
			})
			style.left = `calc(50% - ${size.h} / 2)`
		}
		return style
	})

	return (
		<div
			{...rest}
			class={`RootSplitterHoverEl ${local.class || ''}`}
			style={{
				position: 'absolute',
				'z-index': -1,
				display: 'none',
				'box-sizing': 'border-box',
				'background-color': '#0081f9',
				cursor: 'grab',
				...(local.style as JSX.CSSProperties),
				...dynamicStyle(),
			}}
		>
			{local.children}
		</div>
	)
}

const ToolbarIcon = (props: { path: string; rotate?: number }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
		style={props.rotate ? { transform: `rotate(${props.rotate}deg)` } : {}}
	>
		<path d={props.path} />
	</svg>
)

const ICON_MAXIMIZE =
	'M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3'
const ICON_RESTORE =
	'M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3'
const ICON_CHEVRON_LEFT = 'm15 18-6-6 6-6'

export const DefaultTabsetToolbar = (props: TabsetToolbarProps) => {
	// Fold points back along the row (left or up); unfold points the other way.
	// Inside a rotated strip the icons are turned back so they read upright.
	const chevronTurn = () =>
		(props.rowIsHorizontal ? 0 : 90) + (props.folded ? 180 : 0)
	const upright = () => (props.rotated ? -90 : 0)
	let toolbar: HTMLDivElement | undefined

	// Stay pinned to the visible end of the tab bar when its tabs overflow
	// and it scrolls.
	onMount(() => {
		const bar = toolbar?.parentElement
		if (!toolbar || !bar) return
		const pin = () => {
			toolbar!.style.transform = `translateX(${bar.scrollLeft}px)`
		}
		pin()
		bar.addEventListener('scroll', pin, { passive: true })
		onCleanup(() => bar.removeEventListener('scroll', pin))
	})

	return (
		<div
			ref={toolbar}
			class="DefaultTabsetToolbar"
			onDblClick={(e) => e.stopPropagation()}
		>
			{props.showMaximize && (
				<button
					type="button"
					class="DefaultTabsetToolbarButton"
					aria-label={props.maximized ? 'Restore' : 'Maximize'}
					aria-pressed={props.maximized}
					title={props.maximized ? 'Restore (⌥ +)' : 'Maximize (⌥ +)'}
					onClick={() => props.onToggleMaximize()}
				>
					<ToolbarIcon
						path={props.maximized ? ICON_RESTORE : ICON_MAXIMIZE}
						rotate={upright()}
					/>
				</button>
			)}
			{props.showFold && (
				<button
					type="button"
					class="DefaultTabsetToolbarButton"
					aria-label={props.folded ? 'Unfold' : 'Fold'}
					aria-expanded={!props.folded}
					title={props.folded ? 'Unfold (⌥ -)' : 'Fold (⌥ -)'}
					onClick={() => props.onToggleFold()}
				>
					<ToolbarIcon
						path={ICON_CHEVRON_LEFT}
						rotate={chevronTurn() + upright()}
					/>
				</button>
			)}
		</div>
	)
}
