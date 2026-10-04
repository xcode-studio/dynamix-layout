import type {
	Direction,
	DragState,
	DropTarget,
	Layout,
	LayoutChangeReason,
	LayoutJSON,
	LayoutTreeV1,
	Side,
	SplitterState,
	TabState,
	TabsetState,
} from '@dynamix-layout/core'
import type {
	ComponentType,
	CSSProperties,
	HTMLAttributes,
	ReactNode,
	Ref,
	RefCallback,
} from 'react'

/** A tab: its id, what its tab shows, and its content. */
export interface TabItem {
	/** Unique, stable id. It's what saved layouts store. */
	id: string
	/** Tab label. @default id */
	title?: ReactNode
	content: ReactNode
	/** Show a close button (and allow Delete); closing calls `onTabClose`. @default false */
	closable?: boolean
	/** Where the tab goes the first time it appears. @default the last active tabset */
	target?: DropTarget
}

/** A tab for the headless hooks, where content is rendered by you. */
export type HeadlessTabItem = Omit<TabItem, 'content'> & { content?: ReactNode }

/** Elements you can style through `classNames` and `styles`. */
export type LayoutSlot =
	| 'root'
	| 'panel'
	| 'tabBar'
	| 'tab'
	| 'activeTab'
	| 'tabClose'
	| 'tabContent'
	| 'splitter'
	| 'dropIndicator'
	| 'rootDropZone'
	| 'toolbar'
	| 'toolbarButton'

/** DOM props a slot component receives; spread them on its root element and forward `ref`. */
export type SlotProps<E extends HTMLElement = HTMLDivElement> =
	HTMLAttributes<E> & {
		ref?: Ref<E>
		[dataAttribute: `data-${string}`]: string | boolean | undefined
	}

/** Props of the `Panel` slot: the box of a tabset, behind its tab bar and content. */
export type PanelProps = SlotProps & { tabset: TabsetState }

/** Props of the `TabBar` slot. Children are the tabs and the toolbar. */
export type TabBarProps = SlotProps & {
	tabset: TabsetState
	/** Drawn as a vertical strip (a folded tabset in a side-by-side row). */
	isRotated: boolean
	children: ReactNode
}

/** Props of the `Tab` slot. */
export type TabProps = SlotProps<HTMLElement> & {
	tab: HeadlessTabItem
	isActive: boolean
	isDragging: boolean
	/** Present when the tab is closable. */
	onClose?: () => void
	/** Props for the close button, when the tab is closable. */
	closeButtonProps?: SlotProps<HTMLButtonElement>
}

/** Props of the `TabContent` slot. */
export type TabContentProps = SlotProps & {
	tab: HeadlessTabItem
	isActive: boolean
	children: ReactNode
}

/** Props of the `Splitter` slot. */
export type SplitterProps = SlotProps & {
	splitter: SplitterState
	isDragging: boolean
}

/** Props of the `DropIndicator` slot. */
export type DropIndicatorProps = SlotProps & { target: DropTarget }

/** Props of the `RootDropZone` slot: a target at one edge of the layout, shown while dragging. */
export type RootDropZoneProps = SlotProps & { side: Side; isActive: boolean }

/** Props of the `TabsetToolbar` slot (maximize and fold buttons). */
export interface TabsetToolbarProps {
	tabset: TabsetState
	isRotated: boolean
	canMaximize: boolean
	canFold: boolean
	onToggleMaximize: () => void
	onToggleFold: () => void
	className?: string
	style?: CSSProperties
	buttonClassName?: string
	buttonStyle?: CSSProperties
}

/** Components that replace the default slots. Slot components must forward `ref`. */
export interface LayoutComponents {
	Panel: ComponentType<PanelProps>
	TabBar: ComponentType<TabBarProps>
	Tab: ComponentType<TabProps>
	TabContent: ComponentType<TabContentProps>
	Splitter: ComponentType<SplitterProps>
	DropIndicator: ComponentType<DropIndicatorProps>
	RootDropZone: ComponentType<RootDropZoneProps>
	TabsetToolbar: ComponentType<TabsetToolbarProps>
}

/** Padding inside the layout, in px. */
export type LayoutPadding =
	number | { top?: number; right?: number; bottom?: number; left?: number }

/** Options shared by `<DynamixLayout>` and `useDynamixLayout`. */
export interface LayoutBehaviorOptions {
	/** Uncontrolled: the initial layout (v1 or v2). Later changes are ignored. */
	defaultLayout?: LayoutJSON | LayoutTreeV1
	/** Controlled: the layout to show (v1 or v2). Update it from `onLayoutChange`. */
	layout?: LayoutJSON | LayoutTreeV1
	/** Called after every committed change, never on mount or for drag frames. */
	onLayoutChange?: (
		layout: LayoutJSON,
		details: { reason: LayoutChangeReason }
	) => void
	/** Called when a closable tab is closed; remove it from `tabs` to close it. */
	onTabClose?: (tabId: string) => void
	/** @default { width: 40, height: 40 } */
	minPanelSize?: { width: number; height: number }
	/** @default 10 */
	splitterSize?: number
	/** @default 40 */
	tabBarHeight?: number
	/** @default true */
	showTabBar?: boolean
	/** @default 0 */
	padding?: LayoutPadding
	/** @default true */
	allowMaximize?: boolean
	/** Requires the tab bar. @default true */
	allowFold?: boolean
	/** @default true */
	maximizeOnDoubleClick?: boolean
	/** Alt/Option + "+" maximizes, Alt/Option + "-" folds the focused tabset. @default true */
	keyboardShortcuts?: boolean
	/** WAI-ARIA tabs activation: select on focus, or on Enter/Space. @default 'automatic' */
	tabActivation?: 'automatic' | 'manual'
	/** Container resize throttle; 0 means once per animation frame. @default 0 */
	resizeThrottleMs?: number
}

/** Props of `<DynamixLayout>`. */
export interface DynamixLayoutProps
	extends
		LayoutBehaviorOptions,
		Omit<
			HTMLAttributes<HTMLDivElement>,
			'children' | 'defaultValue' | 'onChange'
		> {
	tabs: readonly TabItem[]
	/** Replace any default slot component. */
	components?: Partial<LayoutComponents>
	/** Extra class names, by slot. */
	classNames?: Partial<Record<LayoutSlot, string>>
	/** Extra styles, by slot (positioning is applied last and always wins). */
	styles?: Partial<Record<LayoutSlot, CSSProperties>>
}

/** Actions available anywhere inside a layout. Every function is stable. */
export type LayoutActions = Pick<
	Layout,
	| 'moveTab'
	| 'moveTabset'
	| 'selectTab'
	| 'maximize'
	| 'restore'
	| 'toggleMaximize'
	| 'fold'
	| 'unfold'
	| 'toggleFold'
	| 'reset'
	| 'toJSON'
	| 'getSnapshot'
>

/** The imperative handle `ref` gives on `<DynamixLayout>`. */
export interface DynamixLayoutHandle extends LayoutActions {
	/** The root element. */
	readonly element: HTMLDivElement | null
	/** Moves keyboard focus to a tab. */
	focusTab(tabId: string): void
}

/**
 * A prop getter: merges your props with the library's (see `mergeProps`).
 * The element type follows the `ref` you pass, and the returned `ref` is a
 * callback that fits any element, so the result can be spread on a `<div>`,
 * `<button>` or anything else.
 */
export type PropGetter = <E extends HTMLElement = HTMLElement>(
	props?: SlotProps<E>
) => SlotProps<E> & { ref: RefCallback<E> }

declare const controllerBrand: unique symbol
/**
 * A layout created by `useDynamixLayout`. Pass it to
 * `<DynamixLayoutProvider>` so `useTab`, `useSplitter` and the other hooks work.
 */
export interface LayoutController {
	readonly [controllerBrand]: true
}

/** Options of `useDynamixLayout`. */
export interface UseDynamixLayoutOptions extends LayoutBehaviorOptions {
	tabs: readonly HeadlessTabItem[]
	/** Base for DOM ids (ARIA relationships). @default React's `useId()` */
	id?: string
}

/** What `useDynamixLayout` returns. Functions and `controller` are stable. */
export interface UseDynamixLayoutResult {
	controller: LayoutController
	getRootProps: PropGetter
	/** Changes only when the set or state of tabsets changes (not on resize or drag frames). */
	tabsets: readonly TabsetState[]
	splitters: readonly SplitterState[]
	tabs: readonly TabState[]
	/** Tab ids in `tabs` prop order. Render tab contents in this order: it never changes on moves. */
	tabIds: readonly string[]
	/** Present while a drag has a valid target. */
	dropIndicator: { target: DropTarget; props: SlotProps } | null
	/** The four edge targets, present while a tab or tabset is dragged. */
	rootDropZones: readonly {
		side: Side
		isActive: boolean
		props: SlotProps
	}[]
	actions: LayoutActions
}

export type { Direction, DragState }
