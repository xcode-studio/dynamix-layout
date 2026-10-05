import type {
	Layout,
	LayoutJSON,
	LayoutTreeV1,
	Rect,
} from '@dynamix-layout/core'
import { JSX } from 'solid-js'

export type DivFC = (
	props: { children?: JSX.Element } & JSX.HTMLAttributes<HTMLDivElement>
) => JSX.Element

/** Per-tab options: the third element of a `tabs` entry. */
export interface TabOptions {
	/** Tab label. @default `tabNames.get(id)`, else the id */
	title?: JSX.Element
	/** Show a close button; clicking it calls `onTabClose`. @default false */
	closable?: boolean
}

/** One tab: `[id, content]` or `[id, content, options]`. */
export type TabItem = [id: string, content: JSX.Element, options?: TabOptions]

export interface LayoutProps {
	/**
	 * The open tabs. Reactive: add an entry to open a tab, remove it to close
	 * one; existing tabs keep their content mounted.
	 */
	tabs: TabItem[]
	/** Called when a closable tab's close button is clicked; remove it from `tabs` to close it. */
	onTabClose?: (tabId: string) => void
	/**
	 * Receives the layout engine once mounted, for actions from code:
	 * `maximize`, `restore`, `fold`, `unfold`, `selectTab`, `moveTab`, `reset`, `toJSON`, …
	 */
	onReady?: (layout: Layout) => void
	enableTabbar?: boolean
	WrapTabPanel?: DivFC
	WrapTabLabel?: (
		props: {
			children?: JSX.Element
			active?: boolean
		} & JSX.HTMLAttributes<HTMLDivElement>
	) => JSX.Element
	WrapTabHead?: DivFC
	WrapTabBody?: DivFC
	HoverElement?: DivFC
	SliderElement?: (
		props: {
			children?: JSX.Element
			direction?: boolean
		} & JSX.HTMLAttributes<HTMLDivElement>
	) => JSX.Element
	tabHeadHeight?: number
	/** A saved layout: v2 JSON, or a v1 tree (migrated automatically). */
	layoutTree?: LayoutJSON | LayoutTreeV1
	pad?: {
		t: number
		b: number
		l: number
		r: number
	}
	class?: string
	style?: JSX.CSSProperties
	bondWidth?: number
	/** Called with the v2 layout after every change, and once on mount. */
	updateJSON?: (layout: LayoutJSON) => void
	minTabHeight?: number
	minTabWidth?: number
	sliderUpdateTimeout?: number
	windowResizeTimeout?: number
	disableSliderTimeout?: boolean
	disableResizeTimeout?: boolean
	hoverElementStyles?: JSX.CSSProperties
	sliderElementStyles?: JSX.CSSProperties
	tabPanelElementStyles?: JSX.CSSProperties
	tabBodyElementStyles?: JSX.CSSProperties
	tabHeadElementStyles?: JSX.CSSProperties
	tabLabelElementStyles?: JSX.CSSProperties
	RootSplitterHoverElStyles?: JSX.CSSProperties
	hoverElementClass?: string
	sliderElementClass?: string
	tabPanelElementClass?: string
	tabBodyElementClass?: string
	tabHeadElementClass?: string
	tabLabelElementClass?: string
	RootSplitterHoverElClass?: string
	rootId?: string
	tabNames?: Map<string, string | JSX.Element>
	/** Show the maximize button on tab bars (default true). */
	enableMaximize?: boolean
	/** Show the fold button on tab bars (default true; needs the tab bar). */
	enableCollapse?: boolean
	/** Double-click a tab bar to maximize or restore it (default true). */
	enableDoubleClickMaximize?: boolean
	/** Alt/Option + "+" maximizes, Alt/Option + "-" folds the active tabset (default true). */
	keyboardShortcuts?: boolean
	TabsetToolbar?: (props: TabsetToolbarProps) => JSX.Element
}

export interface TabsetToolbarProps {
	maximized: boolean
	folded: boolean
	/** The tab bar is drawn as a rotated vertical strip (folded, side-by-side row). */
	rotated: boolean
	/** The tabset's row lays its children out side by side. */
	rowIsHorizontal: boolean
	showMaximize: boolean
	showFold: boolean
	onToggleMaximize: () => void
	onToggleFold: () => void
}

/** Options of the Solid `useDynamixLayout` (resolved by `<DynamixLayout>`). */
export interface useDynamixLayoutOptions {
	tabIds: string[]
	layoutTree?: LayoutJSON | LayoutTreeV1
	updateJSON?: (layout: LayoutJSON) => void
	enableTabbar: boolean
	/** The area to fill, relative to the root element. */
	container: () => Rect
	getRoot: () => HTMLElement | undefined
	windowResizeTimeout: number
	disableResizeTimeout: boolean
	bondWidth: number
	minTabHeight: number
	minTabWidth: number
	tabHeadHeight: number
	keyboardShortcuts?: boolean
	enableDoubleClickMaximize?: boolean
}
