import type { LayoutTree, Dimension } from '@dynamix-layout/core'
import { JSX } from 'solid-js'

export interface DynamixLayoutProps {
	children?: JSX.Element
	layoutTree?: LayoutTree
	tabs?: string[]
	class?: string
	style?: JSX.CSSProperties
}

export interface UseDynamixLayoutOptions {
	initialLayoutTree?: LayoutTree
	tabs?: string[]
}

export interface UseDynamixLayoutResult {
	layoutTree: LayoutTree | undefined
	tabs: string[]
	setTabs: (tabs: string[]) => void
	setLayoutTree: (layoutTree: LayoutTree) => void
}

export type DivFC = (
	props: { children?: JSX.Element } & JSX.HTMLAttributes<HTMLDivElement>
) => JSX.Element

export type TabEntry = {
	uqid: string
	name: string
	node: JSX.Element
}

export type TabInput = [string, JSX.Element][]
export type TabOutput = {
	keys: string[]
	maps: Map<string, TabEntry>
	name: Map<string, string>
}

export interface LayoutProps {
	tabs: [string, JSX.Element][]
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
	layoutTree?: LayoutTree
	pad?: {
		t: number
		b: number
		l: number
		r: number
	}
	class?: string
	style?: JSX.CSSProperties
	bondWidth?: number
	/** In 2.0 this receives the v2 `LayoutJSON` format instead of `LayoutTree` (v1 layouts passed to `layoutTree` keep loading). See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	updateJSON?: (layoutTree: LayoutTree) => void
	minTabHeight?: number
	minTabWidth?: number
	/** @deprecated No effect in 2.0: splitters update once per animation frame. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	sliderUpdateTimeout?: number
	windowResizeTimeout?: number
	/** @deprecated No effect in 2.0: splitters update once per animation frame. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
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

export interface useDynamixLayoutOptions {
	tabOutput: TabOutput
	rootId: string
	layoutTree?: LayoutTree
	updateJSON?: (layoutTree: LayoutTree) => void
	enableTabbar: boolean
	dimensions: () => Dimension
	sliderUpdateTimeout: number
	windowResizeTimeout: number
	disableSliderTimeout: boolean
	disableResizeTimeout: boolean
	hoverElementStyles?: JSX.CSSProperties
	bondWidth: number
	minTabHeight: number
	minTabWidth: number
	tabHeadHeight: number
	keyboardShortcuts?: boolean
	enableDoubleClickMaximize?: boolean
}
