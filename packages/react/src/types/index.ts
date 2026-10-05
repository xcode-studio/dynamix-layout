import type { ReactNode } from 'react'
import type { LayoutTree, Dimension } from '@dynamix-layout/core'

/** @deprecated Unused; removed in 2.0 (the name is reused for the 2.0 component props). See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export interface DynamixLayoutProps {
	children?: ReactNode
	layoutTree?: LayoutTree
	tabs?: string[]
	className?: string
	style?: React.CSSProperties
}

/** @deprecated Unused; removed in 2.0. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export interface UseDynamixLayoutOptions {
	initialLayoutTree?: LayoutTree
	tabs?: string[]
}

/** @deprecated Unused; removed in 2.0. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export interface UseDynamixLayoutResult {
	layoutTree: LayoutTree | undefined
	tabs: string[]
	setTabs: (tabs: string[]) => void
	setLayoutTree: (layoutTree: LayoutTree) => void
}

/** @deprecated Removed in 2.0; slot components receive typed props. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export type DivFC = React.ForwardRefExoticComponent<
	React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
>

/** @deprecated Internal; removed in 2.0. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export type TabEntry = {
	uqid: string
	name: string
	node: React.ReactNode
}

/** @deprecated Replaced in 2.0 by `TabItem[]` (`{ id, title, content }`). See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export type TabInput = [string, React.ReactNode][]
/** @deprecated Internal; removed in 2.0. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export type TabOutput = {
	keys: string[]
	maps: Map<string, TabEntry>
	name: Map<string, string>
}

/**
 * Props of `<DynamixLayout>` in 1.x. Most of them change in 2.0: each
 * deprecated prop names its replacement, and the migration guide has the
 * full list (saved layouts keep working): https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md
 */
export interface LayoutProps {
	tabs: [string, ReactNode][]
	/** @deprecated Replaced in v2 by `showTabBar`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	enableTabbar?: boolean
	/** @deprecated Replaced in v2 by `components.Panel`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	WrapTabPanel?: DivFC
	/** @deprecated Replaced in v2 by `components.Tab`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	WrapTabLabel?: React.ForwardRefExoticComponent<
		React.HTMLAttributes<HTMLDivElement> &
			React.RefAttributes<HTMLDivElement> & { active?: boolean }
	>
	/** @deprecated Replaced in v2 by `components.TabBar`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	WrapTabHead?: DivFC
	/** @deprecated Replaced in v2 by `components.TabContent`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	WrapTabBody?: DivFC
	/** @deprecated Replaced in v2 by `components.DropIndicator`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	HoverElement?: DivFC
	/** @deprecated Replaced in v2 by `components.Splitter`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	SliderElement?: React.ForwardRefExoticComponent<
		React.HTMLAttributes<HTMLDivElement> &
			React.RefAttributes<HTMLDivElement> & { direction?: boolean }
	>
	/** @deprecated Replaced in v2 by `tabBarHeight`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	tabHeadHeight?: number
	/** @deprecated Replaced in v2 by `defaultLayout` (or `layout` for controlled mode). See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	layoutTree?: LayoutTree
	/** @deprecated Replaced in v2 by `padding: number | { top, right, bottom, left }`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	pad?: {
		t: number
		b: number
		l: number
		r: number
	}
	className?: string
	style?: React.CSSProperties
	/** @deprecated Replaced in v2 by `splitterSize`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	bondWidth?: number
	/** @deprecated Replaced in v2 by `minPanelSize: { width, height }`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	minTabHeight?: number
	/** @deprecated Replaced in v2 by `minPanelSize: { width, height }`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	minTabWidth?: number
	/** @deprecated Replaced in v2 by `onLayoutChange(layout, { reason })`, which receives v2 `LayoutJSON` and is not called on mount. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	updateJSON?: (layoutTree: LayoutTree) => void
	/** @deprecated Replaced in v2 by nothing: splitters update once per animation frame. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	sliderUpdateTimeout?: number
	/** @deprecated Replaced in v2 by `resizeThrottleMs`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	windowResizeTimeout?: number
	/** @deprecated Replaced in v2 by nothing: splitters update once per animation frame. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	disableSliderTimeout?: boolean
	/** @deprecated Replaced in v2 by `resizeThrottleMs`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	disableResizeTimeout?: boolean
	/** @deprecated Replaced in v2 by `styles.dropIndicator`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	hoverElementStyles?: React.CSSProperties
	/** @deprecated Replaced in v2 by `styles.splitter`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	sliderElementStyles?: React.CSSProperties
	/** @deprecated Replaced in v2 by `styles.panel`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	tabPanelElementStyles?: React.CSSProperties
	/** @deprecated Replaced in v2 by `styles.tabContent`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	tabBodyElementStyles?: React.CSSProperties
	/** @deprecated Replaced in v2 by `styles.tabBar`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	tabHeadElementStyles?: React.CSSProperties
	/** @deprecated Replaced in v2 by `styles.tab`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	tabLabelElementStyles?: React.CSSProperties
	/** @deprecated Replaced in v2 by `styles.rootDropZone`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	RootSplitterHoverElStyles?: React.CSSProperties
	/** @deprecated Replaced in v2 by `classNames.dropIndicator`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	hoverElementClass?: string
	/** @deprecated Replaced in v2 by `classNames.splitter`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	sliderElementClass?: string
	/** @deprecated Replaced in v2 by `classNames.panel`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	tabPanelElementClass?: string
	/** @deprecated Replaced in v2 by `classNames.tabContent`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	tabBodyElementClass?: string
	/** @deprecated Replaced in v2 by `classNames.tabBar`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	tabHeadElementClass?: string
	/** @deprecated Replaced in v2 by `classNames.tab`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	tabLabelElementClass?: string
	/** @deprecated Replaced in v2 by `classNames.rootDropZone`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	RootSplitterHoverElClass?: string
	/** @deprecated Replaced in v2 by the standard `id` prop. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	rootId?: string
	/** @deprecated Replaced in v2 by `tabs: { id, title, content }[]`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
	tabNames?: Map<string, string | ReactNode>
}

/** @deprecated Internal; removed in 2.0. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
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
}
