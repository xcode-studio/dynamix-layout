import {
	forwardRef,
	useImperativeHandle,
	useRef,
	useState,
	type ForwardedRef,
	type ForwardRefExoticComponent,
	type RefAttributes,
	type ReactElement,
	type Ref,
} from 'react'
import { LayoutContext, fromPublicController } from '../context/layout-context'
import { useDynamixLayout } from '../hooks/use-dynamix-layout'
import type {
	DynamixLayoutHandle,
	DynamixLayoutProps,
	LayoutComponents,
} from '../types'
import {
	ContentView,
	sameParts,
	slot,
	SplitterView,
	TabsetView,
	type Parts,
} from './LayoutParts'
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
