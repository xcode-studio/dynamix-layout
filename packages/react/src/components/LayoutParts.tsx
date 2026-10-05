import {
	memo,
	type CSSProperties,
	type MouseEvent,
	type PointerEvent,
} from 'react'
import { useSplitter } from '../hooks/use-splitter'
import { useTab } from '../hooks/use-tab'
import { useTabset } from '../hooks/use-tabset'
import type { LayoutComponents, LayoutSlot } from '../types'

/**
 * The pieces <DynamixLayout> renders for each tabset, tab, tab content and
 * splitter. Each is memoized and subscribes only to its own state.
 */

/** Rendering settings shared by the parts below. */
export interface Parts {
	components: LayoutComponents
	classNames: Partial<Record<LayoutSlot, string>>
	styles: Partial<Record<LayoutSlot, CSSProperties>>
	showTabBar: boolean
	allowMaximize: boolean
	allowFold: boolean
}

export const slot = (parts: Parts, name: LayoutSlot) => ({
	className: parts.classNames[name],
	style: parts.styles[name],
})

export const TabView = memo(function TabView({
	tabId,
	parts,
}: {
	tabId: string
	parts: Parts
}) {
	const { item, isActive, isDragging, close, getTabProps } = useTab(tabId)
	if (!item) return null
	const props = getTabProps({
		className:
			[parts.classNames.tab, isActive && parts.classNames.activeTab]
				.filter(Boolean)
				.join(' ') || undefined,
		style: {
			...parts.styles.tab,
			...(isActive ? parts.styles.activeTab : {}),
		},
	})
	const closeButtonProps = item.closable
		? {
				className: ['dx-tab-close', parts.classNames.tabClose]
					.filter(Boolean)
					.join(' '),
				style: parts.styles.tabClose,
				'aria-label': `Close ${typeof item.title === 'string' ? item.title : item.id}`,
				tabIndex: -1,
				onPointerDown: (event: PointerEvent) => event.stopPropagation(),
				onClick: (event: MouseEvent) => {
					event.stopPropagation()
					close()
				},
			}
		: undefined
	const Component = parts.components.Tab
	return (
		<Component
			{...props}
			tab={item}
			isActive={isActive}
			isDragging={isDragging}
			onClose={item.closable ? close : undefined}
			closeButtonProps={closeButtonProps}
		/>
	)
})

export const TabsetView = memo(function TabsetView({
	tabsetId,
	parts,
}: {
	tabsetId: string
	parts: Parts
}) {
	const {
		tabset,
		isRotated,
		getPanelProps,
		getTabBarProps,
		toggleMaximize,
		toggleFold,
	} = useTabset(tabsetId)
	if (!tabset) return null
	const {
		Panel: PanelComponent,
		TabBar: TabBarComponent,
		TabsetToolbar: Toolbar,
	} = parts.components
	const canMaximize = parts.allowMaximize && tabset.canMaximize
	const canFold = parts.allowFold && tabset.canFold && !tabset.isMaximized
	return (
		<>
			<PanelComponent
				{...getPanelProps(slot(parts, 'panel'))}
				tabset={tabset}
			/>
			{parts.showTabBar && (
				<TabBarComponent
					{...getTabBarProps(slot(parts, 'tabBar'))}
					tabset={tabset}
					isRotated={isRotated}
					data-dx-has-toolbar={
						canMaximize || canFold ? '' : undefined
					}
				>
					{tabset.tabIds.map((tabId) => (
						<TabView key={tabId} tabId={tabId} parts={parts} />
					))}
					{(canMaximize || canFold) && (
						<Toolbar
							tabset={tabset}
							isRotated={isRotated}
							canMaximize={canMaximize}
							canFold={canFold}
							onToggleMaximize={toggleMaximize}
							onToggleFold={toggleFold}
							className={parts.classNames.toolbar}
							style={parts.styles.toolbar}
							buttonClassName={parts.classNames.toolbarButton}
							buttonStyle={parts.styles.toolbarButton}
						/>
					)}
				</TabBarComponent>
			)}
		</>
	)
})

export const ContentView = memo(function ContentView({
	tabId,
	parts,
}: {
	tabId: string
	parts: Parts
}) {
	const { item, isActive, getTabContentProps } = useTab(tabId)
	if (!item) return null
	const Component = parts.components.TabContent
	return (
		<Component
			{...getTabContentProps(slot(parts, 'tabContent'))}
			tab={item}
			isActive={isActive}
		>
			{item.content}
		</Component>
	)
})

export const SplitterView = memo(function SplitterView({
	splitterId,
	parts,
}: {
	splitterId: string
	parts: Parts
}) {
	const { splitter, isDragging, getSplitterProps } = useSplitter(splitterId)
	if (!splitter) return null
	const Component = parts.components.Splitter
	return (
		<Component
			{...getSplitterProps(slot(parts, 'splitter'))}
			splitter={splitter}
			isDragging={isDragging}
		/>
	)
})

/** Whether two sets of rendering settings are equal by content (they are usually inline objects). */
export function sameParts(a: Parts, b: Parts): boolean {
	const shallow = (x: object, y: object) => {
		const keys = Object.keys(x)
		return (
			keys.length === Object.keys(y).length &&
			keys.every(
				(k) =>
					(x as Record<string, unknown>)[k] ===
					(y as Record<string, unknown>)[k]
			)
		)
	}
	return (
		a.showTabBar === b.showTabBar &&
		a.allowMaximize === b.allowMaximize &&
		a.allowFold === b.allowFold &&
		shallow(a.components, b.components) &&
		shallow(a.classNames, b.classNames) &&
		Object.keys({ ...a.styles, ...b.styles }).every((k) =>
			shallow(
				(a.styles as Record<string, object>)[k] ?? {},
				(b.styles as Record<string, object>)[k] ?? {}
			)
		)
	)
}
