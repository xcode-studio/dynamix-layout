import type { Direction } from '../model/types'

/** Version written by {@link toLayoutJSON}. */
export const LAYOUT_VERSION = 2

/** A saved layout. Splitters and pixel sizes are not stored. */
export interface LayoutJSON {
	version: 2
	root: RowJSON
	/** Id of the maximized tabset, if any. */
	maximizedTabsetId?: string
}

/** A saved row. */
export interface RowJSON {
	type: 'row'
	id: string
	/** Share of the parent's space above the minimum sizes (like CSS flex-grow). */
	weight: number
	direction: Direction
	children: (RowJSON | TabsetJSON)[]
}

/** A saved tabset. */
export interface TabsetJSON {
	type: 'tabset'
	id: string
	weight: number
	activeTabId?: string
	/** Written only when true. */
	isFolded?: boolean
	children: TabJSON[]
}

/** A saved tab: only the id the application gave it. */
export interface TabJSON {
	type: 'tab'
	id: string
}

/**
 * A layout saved by v1 (`DynamixLayoutCore._root.toJSON()`). Accepted
 * everywhere a {@link LayoutJSON} is, and migrated automatically.
 */
export interface LayoutTreeV1 {
	typNode: 'row' | 'tabset' | 'tab' | 'bond'
	nodName: string
	uidNode: string
	nodPart: number
	nodOpen?: string | boolean
	nodKids?: LayoutTreeV1[]
	nodFold?: boolean
	nodMaxd?: string
}
