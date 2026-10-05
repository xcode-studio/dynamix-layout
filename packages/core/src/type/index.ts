import { Node, Bond } from '../app/dynamix'

/** @deprecated Replaced in 2.0 by `Rect { x, y, width, height }`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export type Dimension = {
	w: number
	h: number
	x: number
	y: number
}

export interface NodeCache {
	dimMins: Map<string, { minWidth: number; minHeight: number }>
	mapDirs: Map<string, boolean>
	tabCnts: Map<string, { horizontal: number; vertical: number }>
	mapElem: Map<string, Node | Bond>
	nodOpts: ReactiveValue<Map<string, NodeOptions>>
	bndOpts: ReactiveValue<Map<string, NodeOptions>>
	tabOpts: ReactiveValue<Map<string, NodeOptions>>
}

export type NodeType = 'row' | 'tabset' | 'tab'
export type NodeTypeWithBond = NodeType | 'bond'

export type TabsIds = Map<string, string>

export interface BaseNode {
	typNode: NodeTypeWithBond
	nodName: string
	uidNode: string
	nodPart: number
	nodeDir: boolean
	nodDims: Dimension
	nodOpen?: string | boolean
}

/** @deprecated Replaced in 2.0 by `LayoutJSON` (v1 trees load automatically; `LayoutTreeV1` describes this shape). See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export type LayoutTree = Omit<BaseNode, 'nodeDir' | 'nodDims'> & {
	nodKids?: LayoutTree[]
}

/** @deprecated Replaced in 2.0 by `TabsetState`, `SplitterState`, `TabState` and `snapshot.rects`. See https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md */
export interface NodeOptions extends BaseNode {
	nodKids?: BaseNode[]
}

export interface RootAdjustment {
	adjustedW: number
	adjustedH: number
	wasAdjusted: boolean
}

export type ChangeListener<T> = (newValue: T) => void

export interface ReactiveValue<T> {
	get: () => T
	set: (newValue: T, flag?: boolean) => void
	onChange: (listener: ChangeListener<T>) => () => void
	nextChange: () => Promise<T>
	onChangePromise: (listener: ChangeListener<T>) => () => void
	triggerChange: () => void
}
