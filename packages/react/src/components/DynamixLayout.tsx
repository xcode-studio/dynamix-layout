import {
	forwardRef,
	memo,
	useImperativeHandle,
	useRef,
	useState,
	type CSSProperties,
	type ForwardedRef,
	type ForwardRefExoticComponent,
	type RefAttributes,
	type MouseEvent,
	type PointerEvent,
	type ReactElement,
	type Ref,
} from 'react'
import { LayoutContext, fromPublicController } from '../context/layout-context'
import { useDynamixLayout } from '../hooks/use-dynamix-layout'
import { useSplitter } from '../hooks/use-splitter'
import { useTab } from '../hooks/use-tab'
import { useTabset } from '../hooks/use-tabset'
import type {
	DynamixLayoutHandle,
	DynamixLayoutProps,
	LayoutComponents,
	LayoutSlot,
} from '../types'
import { DropIndicator } from './DropIndicator'
import { LiveRegion } from './LiveRegion'
import { Panel } from './Panel'
import { RootDropZone } from './RootDropZone'
import { Splitter } from './Splitter'
import { Tab } from './Tab'
import { TabBar } from './TabBar'
import { TabContent } from './TabContent'
import { TabsetToolbar } from './TabsetToolbar'

const DEFAULT_COMPONENTS: LayoutComponents = {
	Panel,
	TabBar,
	Tab,
	TabContent,
	Splitter,
	DropIndicator,
	RootDropZone,
	TabsetToolbar,
}

/** Rendering settings shared by the parts below. */
interface Parts {
	components: LayoutComponents
	classNames: Partial<Record<LayoutSlot, string>>
	styles: Partial<Record<LayoutSlot, CSSProperties>>
	showTabBar: boolean
	allowMaximize: boolean
	allowFold: boolean
}

const slot = (parts: Parts, name: LayoutSlot) => ({
	className: parts.classNames[name],
	style: parts.styles[name],
})

const TabView = memo(function TabView({
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

const TabsetView = memo(function TabsetView({
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

const ContentView = memo(function ContentView({
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

const SplitterView = memo(function SplitterView({
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

function DynamixLayoutImpl(
	props: DynamixLayoutProps,
	ref: ForwardedRef<DynamixLayoutHandle>
): ReactElement {
	const {
		tabs,
		defaultLayout,
		layout,
		onLayoutChange,
		onTabClose,
		minPanelSize,
		splitterSize,
		tabBarHeight,
		showTabBar = true,
		padding,
		allowMaximize = true,
		allowFold = true,
		maximizeOnDoubleClick,
		keyboardShortcuts,
		tabActivation,
		resizeThrottleMs,
		components,
		classNames = {},
		styles = {},
		className,
		style,
		...rest
	} = props
	const result = useDynamixLayout({
		tabs,
		defaultLayout,
		layout,
		onLayoutChange,
		onTabClose,
		minPanelSize,
		splitterSize,
		tabBarHeight,
		showTabBar,
		padding,
		allowMaximize,
		allowFold,
		maximizeOnDoubleClick,
		keyboardShortcuts,
		tabActivation,
		resizeThrottleMs,
		id: rest.id,
	})
	const {
		controller,
		getRootProps,
		tabsets,
		splitters,
		tabIds,
		dropIndicator,
		rootDropZones,
		actions,
	} = result

	// `components`, `classNames` and `styles` are usually inline objects; only their contents matter.
	const [parts, setParts] = useState<Parts>(() => ({
		components: { ...DEFAULT_COMPONENTS, ...components },
		classNames,
		styles,
		showTabBar,
		allowMaximize,
		allowFold: allowFold && showTabBar,
	}))
	const nextParts: Parts = {
		components: { ...DEFAULT_COMPONENTS, ...components },
		classNames,
		styles,
		showTabBar,
		allowMaximize,
		allowFold: allowFold && showTabBar,
	}
	if (!sameParts(parts, nextParts)) setParts(nextParts)

	const rootElement = useRef<HTMLDivElement | null>(null)
	useImperativeHandle(
		ref,
		() => ({
			...actions,
			get element() {
				return rootElement.current
			},
			focusTab(tabId: string) {
				document
					.getElementById(
						fromPublicController(controller).core.ids.tab(tabId)
					)
					?.focus()
			},
		}),
		[actions, controller]
	)

	const context = fromPublicController(controller)
	const rootProps = getRootProps({
		...rest,
		className:
			[className, classNames.root].filter(Boolean).join(' ') || undefined,
		style: { ...style, ...styles.root },
		ref: rootElement as Ref<HTMLDivElement>,
	})
	const { DropIndicator: Indicator, RootDropZone: Zone } = parts.components

	return (
		<LayoutContext.Provider value={context}>
			<div {...rootProps}>
				{tabsets.map((tabset) => (
					<TabsetView
						key={tabset.id}
						tabsetId={tabset.id}
						parts={parts}
					/>
				))}
				{tabIds.map((tabId) => (
					<ContentView key={tabId} tabId={tabId} parts={parts} />
				))}
				{splitters.map((splitter) => (
					<SplitterView
						key={splitter.id}
						splitterId={splitter.id}
						parts={parts}
					/>
				))}
				{rootDropZones.map((zone) => (
					<Zone
						key={zone.side}
						{...zone.props}
						{...slot(parts, 'rootDropZone')}
						className={[
							zone.props.className,
							parts.classNames.rootDropZone,
						]
							.filter(Boolean)
							.join(' ')}
						style={{
							...parts.styles.rootDropZone,
							...zone.props.style,
						}}
						side={zone.side}
						isActive={zone.isActive}
					/>
				))}
				{dropIndicator && (
					<Indicator
						{...dropIndicator.props}
						className={[
							dropIndicator.props.className,
							parts.classNames.dropIndicator,
						]
							.filter(Boolean)
							.join(' ')}
						style={{
							...parts.styles.dropIndicator,
							...dropIndicator.props.style,
						}}
						target={dropIndicator.target}
					/>
				)}
				<LiveRegion />
			</div>
		</LayoutContext.Provider>
	)
}

function sameParts(a: Parts, b: Parts): boolean {
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

/**
 * A docking layout: tabs in tabsets, split by draggable splitters, with tab
 * drag-and-drop, maximize and fold. Most apps only need this component.
 *
 * Tab contents are rendered once and never remount when tabs move. Save the
 * layout from `onLayoutChange` and pass it back as `defaultLayout` (or control
 * it with `layout`).
 *
 * @example
 * <DynamixLayout
 *   tabs={[
 *     { id: 'editor', title: 'Editor', content: <Editor /> },
 *     { id: 'terminal', title: 'Terminal', content: <Terminal /> },
 *   ]}
 *   defaultLayout={saved}
 *   onLayoutChange={(layout) => save(layout)}
 * />
 */
export const DynamixLayout: ForwardRefExoticComponent<
	DynamixLayoutProps & RefAttributes<DynamixLayoutHandle>
> = forwardRef(DynamixLayoutImpl)

DynamixLayout.displayName = 'DynamixLayout'
