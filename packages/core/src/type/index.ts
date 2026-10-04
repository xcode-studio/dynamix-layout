import { Node, Bond } from '../app/dynamix'

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

export type LayoutTree = Omit<BaseNode, 'nodeDir' | 'nodDims'> & {
	nodKids?: LayoutTree[]
	/** Tabset only: folded to a strip along its parent row. */
	nodFold?: boolean
	/** Root only: uid of the maximized tabset. */
	nodMaxd?: string
}

export interface NodeOptions extends BaseNode {
	nodKids?: BaseNode[]
	/** Tabset: folded to a strip (ignored while it is maximized). */
	nodFold?: boolean
	/** Tabset: currently maximized over the whole layout. */
	nodMaxd?: boolean
	/** Hidden because another tabset is maximized (content stays mounted). */
	nodHidden?: boolean
	/** Bond: next to a folded tabset, so it cannot be dragged. */
	nodLocked?: boolean
	/** Tabset: can be folded (it has siblings in its row). */
	nodFoldable?: boolean
	/** Tabset: can be maximized (the layout has more than one tabset). */
	nodMaximizable?: boolean
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
