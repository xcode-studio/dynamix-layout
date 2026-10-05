/** The public API. Internal modules (tree, geometry, store) are not exported. */

export { createLayout } from './create-layout'
export type {
	Layout,
	LayoutChangeReason,
	LayoutOptions,
	LayoutSizeOptions,
	SplitterBounds,
} from './layout-types'
export type {
	CreateId,
	Direction,
	DropTarget,
	LayoutNode,
	Point,
	Rect,
	RowNode,
	Side,
	TabNode,
	TabsetNode,
} from './model/types'
export type {
	DragSource,
	DragState,
	LayoutSnapshot,
	SplitterState,
	TabState,
	TabsetState,
} from './store/snapshot'
export type { LayoutRects } from './geometry/compute-rects'
export type { TabInit } from './tree/reconcile-tabs'
export type {
	DropMeasurements,
	RootDropZoneOptions,
	TabBarMeasurement,
} from './drop/drop-target'
export { getRootDropZoneRect } from './drop/drop-target'
export {
	getTabBarPlacement,
	getTabContentRect,
	type TabBarPlacement,
} from './geometry/tab-bar'
export { applyRect } from './dom/apply-rect'
export {
	DynamixLayoutError,
	type DynamixLayoutErrorCode,
	type LayoutWarning,
	type LayoutWarningCode,
	type WarningHandler,
} from './errors'
export {
	LAYOUT_VERSION,
	type LayoutJSON,
	type LayoutTreeV1,
	type RowJSON,
	type TabJSON,
	type TabsetJSON,
} from './serialize/schema'
export { isLayoutV1, migrateLayoutFromV1 } from './serialize/migrate-v1'
