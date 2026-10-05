import { useEffect, useRef, type ReactElement } from 'react'
import type { TabsetToolbarProps } from '../types'

const ICON_MAXIMIZE =
	'M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3'
const ICON_RESTORE =
	'M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3'
const ICON_CHEVRON = 'm15 18-6-6 6-6'

function Icon({ path, rotate }: { path: string; rotate: number }) {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
		>
			<path d={path} />
		</svg>
	)
}

/**
 * Default `TabsetToolbar`: maximize/restore and fold/unfold buttons at the end
 * of a tab bar, shown on hover and always on folded strips.
 * @param props - The tabset, what it can do, and the toggle handlers.
 * @example
 * function MyToolbar({ tabset, canMaximize, onToggleMaximize }: TabsetToolbarProps) {
 *   return canMaximize ? <button onClick={onToggleMaximize}>{tabset.isMaximized ? 'Restore' : 'Maximize'}</button> : null
 * }
 * <DynamixLayout tabs={tabs} components={{ TabsetToolbar: MyToolbar }} />
 */
export function TabsetToolbar({
	tabset,
	isRotated,
	canMaximize,
	canFold,
	onToggleMaximize,
	onToggleFold,
	className,
	style,
	buttonClassName,
	buttonStyle,
}: TabsetToolbarProps): ReactElement {
	const toolbarRef = useRef<HTMLDivElement>(null)
	const { isMaximized, isFolded } = tabset
	// Fold points back along the row (left or up), unfold the other way; inside
	// a rotated strip the icons turn back so they read upright.
	const chevronTurn =
		(tabset.parentDirection === 'horizontal' ? 0 : 90) +
		(isFolded ? 180 : 0)
	const upright = isRotated ? -90 : 0

	// Stay pinned to the visible end of a tab bar that scrolls.
	useEffect(() => {
		const toolbar = toolbarRef.current
		const bar = toolbar?.parentElement
		if (!toolbar || !bar) return
		const pin = () => {
			toolbar.style.transform = `translateX(${bar.scrollLeft}px)`
		}
		pin()
		bar.addEventListener('scroll', pin, { passive: true })
		return () => bar.removeEventListener('scroll', pin)
	}, [])

	const buttonClass = ['dx-toolbar-button', buttonClassName]
		.filter(Boolean)
		.join(' ')
	return (
		<div
			ref={toolbarRef}
			className={['dx-toolbar', className].filter(Boolean).join(' ')}
			style={style}
			data-dx-slot="toolbar"
			onDoubleClick={(event) => event.stopPropagation()}
		>
			{canMaximize && (
				<button
					type="button"
					className={buttonClass}
					style={buttonStyle}
					aria-label={isMaximized ? 'Restore' : 'Maximize'}
					aria-pressed={isMaximized}
					title={isMaximized ? 'Restore (⌥ +)' : 'Maximize (⌥ +)'}
					onClick={onToggleMaximize}
				>
					<Icon
						path={isMaximized ? ICON_RESTORE : ICON_MAXIMIZE}
						rotate={upright}
					/>
				</button>
			)}
			{canFold && (
				<button
					type="button"
					className={buttonClass}
					style={buttonStyle}
					aria-label={isFolded ? 'Unfold' : 'Fold'}
					aria-expanded={!isFolded}
					title={isFolded ? 'Unfold (⌥ -)' : 'Fold (⌥ -)'}
					onClick={onToggleFold}
				>
					<Icon path={ICON_CHEVRON} rotate={chevronTurn + upright} />
				</button>
			)}
		</div>
	)
}
