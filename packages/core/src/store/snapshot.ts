import type { LayoutRects } from '../geometry/compute-rects'
import { splitterId } from '../geometry/compute-rects'
import { isRow } from '../model/guards'
import type {
	Direction,
	DropTarget,
	LayoutModel,
	Rect,
	RowNode,
} from '../model/types'
import { isDev } from '../dev'

/** Derived state of one tabset. */
export interface TabsetState {
	readonly id: string
	readonly tabIds: readonly string[]
	readonly activeTabId: string
	/** Direction of the row this tabset sits in. */
	readonly parentDirection: Direction
	readonly isFolded: boolean
	readonly isMaximized: boolean
	/** Hidden because another tabset is maximized (its content stays mounted). */
	readonly isHidden: boolean
	readonly canFold: boolean
	readonly canMaximize: boolean
}

/** Derived state of one splitter. */
export interface SplitterState {
	readonly id: string
	readonly rowId: string
	/** The row's direction: a `'horizontal'` row has a vertical splitter bar. */
	readonly direction: Direction
	readonly beforeId: string
	readonly afterId: string
	/** Next to a folded tabset, so it can't be dragged. */
	readonly isLocked: boolean
	readonly isHidden: boolean
}

/** Derived state of one tab. */
export interface TabState {
	readonly id: string
	readonly tabsetId: string
	readonly isActive: boolean
	/** Active and its tabset neither folded nor hidden. */
	readonly isVisible: boolean
}

/** What is being dragged. */
export type DragSource =
	| { readonly type: 'tab'; readonly tabId: string }
	| { readonly type: 'tabset'; readonly tabsetId: string }
	| { readonly type: 'splitter'; readonly splitterId: string }

/** The current drag, if any. */
export interface DragState {
	readonly source: DragSource
	/** Where a tab or tabset would land; `null` over nothing valid. */
	readonly target: DropTarget | null
	/** Rect of the drop indicator for `target`. */
	readonly indicator: Rect | null
}

/**
 * An immutable view of the layout. Every field keeps its previous reference
 * unless it changed, and so does every entry of every map, so consumers can
 * compare by reference at any depth.
 */
export interface LayoutSnapshot {
	readonly root: RowNode
	readonly tabsets: ReadonlyMap<string, TabsetState>
	readonly splitters: ReadonlyMap<string, SplitterState>
	readonly tabs: ReadonlyMap<string, TabState>
	readonly rects: LayoutRects
	readonly maximizedTabsetId: string | null
	readonly drag: DragState | null
}

const shallowEqual = <T extends object>(a: T, b: T) => {
	for (const key of Object.keys(a) as (keyof T)[]) {
		const x = a[key]
		const y = b[key]
		if (Array.isArray(x) && Array.isArray(y)) {
			if (x.length !== y.length || x.some((item, i) => item !== y[i]))
				return false
		} else if (x !== y) return false
	}
	return true
}

const freeze = <T>(value: T): T => (isDev() ? Object.freeze(value) : value)

/** Reuses `previous` entries (and the map itself) when nothing changed. */
function share<T extends object>(
	next: Map<string, T>,
	previous: ReadonlyMap<string, T> | undefined
): ReadonlyMap<string, T> {
	if (!previous) {
		next.forEach((value) => freeze(value))
		return next
	}
	let changed = next.size !== previous.size
	const previousKeys = [...previous.keys()]
	let index = 0
	for (const [id, value] of next) {
		const old = previous.get(id)
		if (old && shallowEqual(old, value)) next.set(id, old)
		else {
			freeze(value)
			changed = true
		}
		if (previousKeys[index++] !== id) changed = true
	}
	return changed ? next : previous
}

/** Builds the next snapshot from the model, sharing everything unchanged with `previous`. */
export function deriveSnapshot(
	model: LayoutModel,
	rects: LayoutRects,
	drag: DragState | null,
	previous?: LayoutSnapshot
): LayoutSnapshot {
	if (
		previous &&
		previous.root === model.root &&
		previous.maximizedTabsetId === model.maximizedTabsetId &&
		previous.rects === rects &&
		previous.drag === drag
	)
		return previous

	const tabsets = new Map<string, TabsetState>()
	const splitters = new Map<string, SplitterState>()
	const tabs = new Map<string, TabState>()
	const maximized = model.maximizedTabsetId
	let tabsetCount = 0
	const countTabsets = (row: RowNode) =>
		row.children.forEach((child) =>
			isRow(child) ? countTabsets(child) : tabsetCount++
		)
	countTabsets(model.root)

	const visit = (row: RowNode) => {
		row.children.forEach((child, index) => {
			if (isRow(child)) visit(child)
			else {
				const isMaximized = child.id === maximized
				const isHidden = !!maximized && !isMaximized
				const isFolded = child.isFolded && !isMaximized
				tabsets.set(child.id, {
					id: child.id,
					tabIds: child.children.map((tab) => tab.id),
					activeTabId: child.activeTabId,
					parentDirection: row.direction,
					isFolded,
					isMaximized,
					isHidden,
					canFold: row.children.length > 1,
					canMaximize: tabsetCount > 1,
				})
				for (const tab of child.children) {
					const isActive = tab.id === child.activeTabId
					tabs.set(tab.id, {
						id: tab.id,
						tabsetId: child.id,
						isActive,
						isVisible: isActive && !isFolded && !isHidden,
					})
				}
			}
			const next = row.children[index + 1]
			if (next) {
				const id = splitterId(child.id, next.id)
				const folded = (node: typeof child) =>
					!isRow(node) && node.isFolded
				splitters.set(id, {
					id,
					rowId: row.id,
					direction: row.direction,
					beforeId: child.id,
					afterId: next.id,
					isLocked: folded(child) || folded(next),
					isHidden: !!maximized,
				})
			}
		})
	}
	visit(model.root)

	return freeze({
		root: model.root,
		tabsets: share(tabsets, previous?.tabsets),
		splitters: share(splitters, previous?.splitters),
		tabs: share(tabs, previous?.tabs),
		rects,
		maximizedTabsetId: maximized,
		drag,
	})
}
