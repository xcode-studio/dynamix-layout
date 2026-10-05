import type { WarningHandler } from '../errors'
import { computeLayoutRects, type LayoutRects } from '../geometry/compute-rects'
import type { GeometryConfig } from '../geometry/config'
import type { LayoutChangeReason } from '../layout-types'
import type { DropTarget, LayoutModel, Rect, RowNode } from '../model/types'
import type { LayoutJSON } from '../serialize/schema'
import { toLayoutJSON } from '../serialize/to-json'
import { deriveSnapshot, type DragState, type LayoutSnapshot } from './snapshot'

/** A drag in progress, plus what's needed to cancel it. */
export interface Drag extends DragState {
	/** Root when the drag started, restored on cancel. */
	readonly startRoot: RowNode
}

/** Everything a layout instance holds, with one place that publishes changes. */
export interface LayoutStore {
	readonly model: LayoutModel
	readonly rects: LayoutRects
	readonly config: GeometryConfig
	readonly snapshot: LayoutSnapshot
	readonly drag: Drag | null
	readonly isDestroyed: boolean
	subscribe(listener: (snapshot: LayoutSnapshot) => void): () => void
	setContainer(rect: Rect): void
	setConfig(config: GeometryConfig): void
	/** A transient change (drag frames): published, but not reported as a layout change. */
	update(change: { model?: LayoutModel; drag?: Drag | null }): void
	/**
	 * Applies a committed change and reports it through `onLayoutChange`.
	 * @returns Whether anything changed.
	 */
	commit(next: LayoutModel | null, reason?: LayoutChangeReason): boolean
	/** Reports the current layout (after a splitter drag already applied its frames). */
	report(reason: LayoutChangeReason): void
	toJSON(): LayoutJSON
	destroy(): void
}

/** Creates the state holder of one layout instance. */
export function createLayoutStore(
	initial: LayoutModel,
	initialConfig: GeometryConfig,
	onLayoutChange:
		((layout: LayoutJSON, reason: LayoutChangeReason) => void) | undefined,
	warn: WarningHandler
): LayoutStore {
	const listeners = new Set<(snapshot: LayoutSnapshot) => void>()
	let model = initial
	let config = initialConfig
	let container: Rect = { x: 0, y: 0, width: 0, height: 0 }
	let rects = computeLayoutRects(
		model.root,
		container,
		config,
		model.maximizedTabsetId
	)
	let drag: Drag | null = null
	let snapshot = deriveSnapshot(model, rects, null)
	let destroyed = false
	let json: { model: LayoutModel; value: LayoutJSON } | null = null

	const publish = () => {
		rects = computeLayoutRects(
			model.root,
			container,
			config,
			model.maximizedTabsetId,
			rects
		)
		const dragState = sameDrag(snapshot.drag, drag)
			? snapshot.drag
			: drag && toDragState(drag)
		const next = deriveSnapshot(model, rects, dragState, snapshot)
		if (next === snapshot) return
		snapshot = next
		listeners.forEach((listener) => listener(snapshot))
	}

	const toJSON = () => {
		const unchanged =
			json &&
			json.model.root === model.root &&
			json.model.maximizedTabsetId === model.maximizedTabsetId
		if (!unchanged) json = { model, value: toLayoutJSON(model) }
		return json!.value
	}

	return {
		get model() {
			return model
		},
		get rects() {
			return rects
		},
		get config() {
			return config
		},
		get snapshot() {
			return snapshot
		},
		get drag() {
			return drag
		},
		get isDestroyed() {
			return destroyed
		},
		subscribe(listener) {
			listeners.add(listener)
			return () => listeners.delete(listener)
		},
		setContainer(rect) {
			container = rect
			if (!destroyed) publish()
		},
		setConfig(next) {
			config = next
			if (!destroyed) publish()
		},
		update(change) {
			if (destroyed) return
			if (change.model) model = change.model
			if (change.drag !== undefined) drag = change.drag
			publish()
		},
		commit(next, reason) {
			if (destroyed) {
				warn({
					code: 'DESTROYED',
					message: 'This layout was destroyed; the call was ignored.',
				})
				return false
			}
			if (!next || next === model) return false
			model = next
			publish()
			if (reason) onLayoutChange?.(toJSON(), reason)
			return true
		},
		report(reason) {
			if (!destroyed) onLayoutChange?.(toJSON(), reason)
		},
		toJSON,
		destroy() {
			destroyed = true
			drag = null
			listeners.clear()
		},
	}
}

const toDragState = ({ source, target, indicator }: Drag): DragState => ({
	source,
	target,
	indicator,
})

function sameDrag(state: DragState | null, drag: Drag | null): boolean {
	if (!state || !drag) return state === drag
	return (
		state.source === drag.source &&
		state.target === drag.target &&
		state.indicator === drag.indicator
	)
}

/** @returns Whether two drop targets point at the same place. */
export function isSameTarget(
	a: DropTarget | null,
	b: DropTarget | null
): boolean {
	if (a === b) return true
	if (!a || !b || a.type !== b.type || a.position !== b.position) return false
	if (a.type === 'tab') return a.tabId === (b as typeof a).tabId
	if (a.type === 'tabset') return a.tabsetId === (b as typeof a).tabsetId
	return true
}
