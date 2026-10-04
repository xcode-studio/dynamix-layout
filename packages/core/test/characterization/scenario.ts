/**
 * Engine-neutral description of layout behaviour.
 *
 * The scenarios in `../fixtures/v1` were recorded from the v1 engine (see the
 * README there). The v2 engine replays the same operations and must produce
 * the same canonical structure and pixel-identical rects. Everything here is
 * keyed by tab ids so it does not depend on either engine's internal node ids.
 */

export type Direction = 'horizontal' | 'vertical'
export type Side = 'top' | 'bottom' | 'left' | 'right'
export type RectTuple = [x: number, y: number, width: number, height: number]

/** A tabset is addressed by any tab inside it. */
export type TabsetRef = { tabsetOf: string }

export type Operation =
	| {
			op: 'move'
			source: { tab: string } | TabsetRef
			target:
				| { tab: string; position: 'left' | 'right' }
				| (TabsetRef & { area: Side | 'contain' })
				| { root: Side }
	  }
	| {
			op: 'splitter'
			before: string
			after: string
			point: { x: number; y: number }
	  }
	| ({ op: 'fold' } & TabsetRef)
	| ({ op: 'maximize' } & TabsetRef)
	| { op: 'resize'; width: number; height: number }

export interface CanonicalTabset {
	tabs: string[]
	active: string
	folded?: true
}
export interface CanonicalRow {
	direction: Direction
	children: CanonicalNode[]
}
export type CanonicalNode = CanonicalRow | CanonicalTabset

export interface Observation {
	tree: CanonicalRow
	/** Tabset rects keyed by `tabs.join('|')`. */
	tabsets: Record<string, RectTuple>
	/** Splitter rects keyed by `firstTab(before) + '>' + firstTab(after)`. */
	splitters: Record<string, RectTuple>
	/** Key of the maximized tabset, if any. */
	maximized: string | null
}

export interface Step {
	operation: Operation
	/** Whether the engine accepted the operation (moves, fold, maximize). */
	accepted?: boolean
	observation: Observation
	/** v1 saved layout after this step (every few steps), for migration checks. */
	savedV1?: unknown
}

export interface Scenario {
	name: string
	tabs: string[]
	container: { width: number; height: number }
	initial: Observation
	initialSavedV1: unknown
	steps: Step[]
}

export interface Driver {
	create(
		tabs: string[],
		container: { width: number; height: number },
		saved?: unknown
	): void
	apply(operation: Operation): boolean | undefined
	observe(): Observation
	save(): unknown
}

export const isRow = (node: CanonicalNode): node is CanonicalRow =>
	'direction' in node

export const firstTab = (node: CanonicalNode): string =>
	isRow(node) ? firstTab(node.children[0]) : node.tabs[0]

export const tabsetKey = (tabs: readonly string[]) => tabs.join('|')

/**
 * Flattens single-child rows and same-direction nesting, which v2 does on
 * every change and v1 sometimes leaves behind (audit B7). Both engines are
 * compared in this normalized form.
 */
export function normalizeCanonical(root: CanonicalRow): CanonicalRow {
	const normalizeRow = (row: CanonicalRow): CanonicalRow => {
		const children: CanonicalNode[] = []
		for (const child of row.children) {
			if (!isRow(child)) {
				if (child.tabs.length > 0) children.push(child)
				continue
			}
			let next: CanonicalNode = normalizeRow(child)
			if (isRow(next) && next.children.length === 1)
				next = next.children[0]
			if (isRow(next) && next.children.length === 0) continue
			if (isRow(next) && next.direction === row.direction) {
				children.push(...next.children)
			} else {
				children.push(next)
			}
		}
		return { direction: row.direction, children }
	}

	let result = normalizeRow(root)
	while (result.children.length === 1 && isRow(result.children[0])) {
		result = result.children[0]
	}
	return result
}

/** Settings the fixtures were recorded with (the v1 React adapter's defaults). */
export const V1_SETTINGS = { bond: 10, minW: 40, minH: 40, collapsedSize: 40 }
