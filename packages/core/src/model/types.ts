/**
 * Direction a row lays out its children in.
 * `'horizontal'` places them side by side; `'vertical'` stacks them.
 */
export type Direction = 'horizontal' | 'vertical'

/** A point in layout-root coordinates (the root's top-left corner is 0,0). */
export interface Point {
	readonly x: number
	readonly y: number
}

/** A rectangle in layout-root coordinates. */
export interface Rect {
	readonly x: number
	readonly y: number
	readonly width: number
	readonly height: number
}

/** A side of a tabset or of the whole layout. */
export type Side = 'top' | 'bottom' | 'left' | 'right'

/** A tab. Its `id` is the id the application gave the tab. */
export interface TabNode {
	readonly type: 'tab'
	readonly id: string
}

/** A group of tabs that shows one of them at a time. */
export interface TabsetNode {
	readonly type: 'tabset'
	readonly id: string
	/**
	 * Share of the parent row's space above the minimum sizes, like CSS
	 * `flex-grow` with `flex-basis` set to the minimum size.
	 */
	readonly weight: number
	/** Always the id of one of `children`. */
	readonly activeTabId: string
	/** Folded to a strip along its row. */
	readonly isFolded: boolean
	/** Never empty. */
	readonly children: readonly TabNode[]
}

/** A row of tabsets and rows separated by splitters. */
export interface RowNode {
	readonly type: 'row'
	readonly id: string
	/** See {@link TabsetNode.weight}. Ignored on the root. */
	readonly weight: number
	readonly direction: Direction
	readonly children: readonly (RowNode | TabsetNode)[]
}

/** Any node of the layout tree. */
export type LayoutNode = RowNode | TabsetNode | TabNode

/** A child of a row. */
export type RowChild = RowNode | TabsetNode

/** The whole layout: the tree plus view state that is not part of any node. */
export interface LayoutModel {
	readonly root: RowNode
	/** Id of the maximized tabset, or `null`. */
	readonly maximizedTabsetId: string | null
	/** Most recently focused or used tabset; new tabs go here. */
	readonly lastActiveTabsetId: string | null
	/** Fold order, so the most recently folded tabset can be unfolded first. */
	readonly foldOrder: readonly string[]
}

/** Generates ids for new rows and tabsets. */
export type CreateId = (kind: 'row' | 'tabset', hint?: string) => string

/** Where a dragged tab or tabset is dropped. */
export type DropTarget =
	| {
			readonly type: 'tabset'
			readonly tabsetId: string
			readonly position: Side | 'center'
	  }
	| {
			readonly type: 'tab'
			readonly tabId: string
			readonly position: 'before' | 'after'
	  }
	| { readonly type: 'root'; readonly position: Side }
