import type { ReactNode } from 'react'
import type { LayoutTree, Dimension } from '@dynamix-layout/core'

export interface DynamixLayoutProps {
	children?: ReactNode
	layoutTree?: LayoutTree
	tabs?: string[]
	className?: string
	style?: React.CSSProperties
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

export type DivFC = React.ForwardRefExoticComponent<
	React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
>

export type TabEntry = {
	uqid: string
	name: string
	node: React.ReactNode
}

export type TabInput = [string, React.ReactNode][]
export type TabOutput = {
	keys: string[]
	maps: Map<string, TabEntry>
	name: Map<string, string>
}

export interface LayoutProps {
	tabs: [string, ReactNode][]
	enableTabbar?: boolean
	WrapTabPanel?: DivFC
	WrapTabLabel?: React.ForwardRefExoticComponent<
		React.HTMLAttributes<HTMLDivElement> &
			React.RefAttributes<HTMLDivElement> & { active?: boolean }
	>
	WrapTabHead?: DivFC
	WrapTabBody?: DivFC
	HoverElement?: DivFC
	SliderElement?: React.ForwardRefExoticComponent<
		React.HTMLAttributes<HTMLDivElement> &
			React.RefAttributes<HTMLDivElement> & { direction?: boolean }
	>
	tabHeadHeight?: number
	layoutTree?: LayoutTree
	pad?: {
		t: number
		b: number
		l: number
		r: number
	}
	className?: string
	style?: React.CSSProperties
	bondWidth?: number
	minTabHeight?: number
	minTabWidth?: number
	updateJSON?: (layoutTree: LayoutTree) => void
	sliderUpdateTimeout?: number
	windowResizeTimeout?: number
	disableSliderTimeout?: boolean
	disableResizeTimeout?: boolean
	hoverElementStyles?: React.CSSProperties
	sliderElementStyles?: React.CSSProperties
	tabPanelElementStyles?: React.CSSProperties
	tabBodyElementStyles?: React.CSSProperties
	tabHeadElementStyles?: React.CSSProperties
	tabLabelElementStyles?: React.CSSProperties
	RootSplitterHoverElStyles?: React.CSSProperties
	hoverElementClass?: string
	sliderElementClass?: string
	tabPanelElementClass?: string
	tabBodyElementClass?: string
	tabHeadElementClass?: string
	tabLabelElementClass?: string
	RootSplitterHoverElClass?: string
	rootId?: string
	tabNames?: Map<string, string | ReactNode>
	/** Show the maximize button on tab bars (default true). */
	enableMaximize?: boolean
	/** Show the fold button on tab bars (default true; needs the tab bar). */
	enableCollapse?: boolean
	/** Double-click a tab bar to maximize or restore it (default true). */
	enableDoubleClickMaximize?: boolean
	/** Alt/Option + "+" maximizes, Alt/Option + "-" folds the active tabset (default true). */
	keyboardShortcuts?: boolean
	TabsetToolbar?: React.ComponentType<TabsetToolbarProps>
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
	rootId?: string
	layoutTree?: LayoutTree
	enableTabbar: boolean
	updateJSON?: (layoutTree: LayoutTree) => void
	dimensions: () => Dimension
	sliderUpdateTimeout: number
	windowResizeTimeout: number
	disableSliderTimeout: boolean
	disableResizeTimeout: boolean
	hoverElementStyles?: React.CSSProperties
	bondWidth: number
	minTabHeight: number
	minTabWidth: number
	tabHeadHeight: number
	keyboardShortcuts?: boolean
	enableDoubleClickMaximize?: boolean
}
