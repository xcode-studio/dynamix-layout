import './styles.css'
export { DynamixLayout } from './components/DynamixLayout'
export {
	DynamixLayoutProvider,
	type DynamixLayoutProviderProps,
} from './context/DynamixLayoutProvider'
export { useDynamixLayout } from './hooks/use-dynamix-layout'
export { useTabset, type UseTabsetResult } from './hooks/use-tabset'
export { useTab, type UseTabResult } from './hooks/use-tab'
export { useSplitter, type UseSplitterResult } from './hooks/use-splitter'
export { useLayoutState } from './hooks/use-layout-state'
export { useLayoutActions } from './hooks/use-layout-actions'
export { useDragState } from './hooks/use-drag-state'
export { Panel } from './components/Panel'
export { TabBar } from './components/TabBar'
export { Tab } from './components/Tab'
export { TabContent } from './components/TabContent'
export { Splitter } from './components/Splitter'
export { DropIndicator } from './components/DropIndicator'
export { RootDropZone } from './components/RootDropZone'
export { TabsetToolbar } from './components/TabsetToolbar'
export type * from './types'
export {
	isLayoutV1,
	migrateLayoutFromV1,
	DynamixLayoutError,
	type DropTarget,
	type LayoutJSON,
	type LayoutTreeV1,
	type LayoutSnapshot,
	type LayoutChangeReason,
	type TabsetState,
	type TabState,
	type SplitterState,
	type Side,
} from '@dynamix-layout/core'
