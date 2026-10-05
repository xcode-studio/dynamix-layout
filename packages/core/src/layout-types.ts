import type { DropMeasurements } from './drop/drop-target'
import type { WarningHandler } from './errors'
import type { CreateId, DropTarget, Point, Rect } from './model/types'
import type { LayoutJSON, LayoutTreeV1 } from './serialize/schema'
import type { DragSource, LayoutSnapshot } from './store/snapshot'
import type { TabInit } from './tree/reconcile-tabs'

/** Why `onLayoutChange` was called. */
export type LayoutChangeReason =
	'move' | 'resize' | 'select' | 'fold' | 'maximize' | 'tabs' | 'reset'

/** Sizes that can change after creation. */
export interface LayoutSizeOptions {
	/** Smallest size of a tabset. @default { width: 40, height: 40 } */
	minPanelSize?: { width: number; height: number }
	/** Thickness of splitters. @default 10 */
	splitterSize?: number
	/** Size of a folded tabset along its row. @default minPanelSize.height */
	foldedSize?: number
}

/** Options for `createLayout`. */
export interface LayoutOptions extends LayoutSizeOptions {
	/** Open tabs. Their order only matters for the default layout. */
	tabs: readonly TabInit[]
	/**
	 * A saved layout (v2, or a v1 tree that is migrated automatically).
	 * @default the default layout built from `tabs`
	 */
	initialLayout?: LayoutJSON | LayoutTreeV1 | null
	/**
	 * Id factory for rows and tabsets.
	 * @default deterministic per instance (`ts-<first tab>`, `row-<n>`)
	 */
	createId?: CreateId
	/** Called after every committed change; never for drag frames or `load`. */
	onLayoutChange?: (layout: LayoutJSON, reason: LayoutChangeReason) => void
	/** @default `console.warn` in development, silent in production */
	onWarning?: WarningHandler
}

/** Splitter position and limits in px along its row. */
export interface SplitterBounds {
	/** Size of the panel before the splitter. */
	readonly value: number
	readonly min: number
	readonly max: number
}

/**
 * A layout instance. Independent of every other instance; holds no timers and
 * never touches the DOM. Actions return `true` when they changed the layout and
 * `false` when they were refused or did nothing; they never throw.
 */
export interface Layout {
	/** The current immutable snapshot. */
	getSnapshot(): LayoutSnapshot
	/** Calls `listener` after every change. @returns A function that unsubscribes. */
	subscribe(listener: (snapshot: LayoutSnapshot) => void): () => void
	/** Area to fill, in the coordinates every rect uses (`x`/`y` is usually the padding). */
	setContainerRect(rect: Rect): void
	/** Replaces the open tabs: unlisted tabs are removed, new ones added and activated. */
	setTabs(tabs: readonly TabInit[]): void
	/** Changes sizes without rebuilding anything. */
	setOptions(options: LayoutSizeOptions): void

	moveTab(tabId: string, target: DropTarget): boolean
	moveTabset(tabsetId: string, target: DropTarget): boolean
	selectTab(tabId: string): boolean
	addTab(tab: TabInit, target?: DropTarget): boolean
	removeTab(tabId: string): boolean

	/** Moves a splitter so its centre is at `point`, clamped to the neighbours' minimum sizes. */
	resizeSplitter(splitterId: string, point: Point): boolean
	/** Moves a splitter by `delta` px along its row (keyboard resizing). */
	moveSplitterBy(splitterId: string, delta: number): boolean

	maximize(tabsetId: string): boolean
	restore(): boolean
	toggleMaximize(tabsetId: string): boolean
	fold(tabsetId: string): boolean
	unfold(tabsetId: string): boolean
	toggleFold(tabsetId: string): boolean

	/** Starts a pointer or keyboard drag. Tab and tabset drags leave maximized mode first. */
	startDrag(source: DragSource): boolean
	/** Updates the drop target (tabs) or splitter position (splitters); never calls `onLayoutChange`. */
	updateDrag(point: Point, measurements?: DropMeasurements): void
	/** Sets the drop target directly (keyboard move mode). */
	setDragTarget(
		target: DropTarget | null,
		measurements?: DropMeasurements
	): void
	/** Commits the drag with one `onLayoutChange`. @returns Whether the layout changed. */
	endDrag(): boolean
	/** Ends the drag and undoes any splitter movement. */
	cancelDrag(): void

	getDropTarget(
		point: Point,
		source: DragSource,
		measurements?: DropMeasurements
	): DropTarget | null
	getDropIndicatorRect(
		target: DropTarget,
		measurements?: DropMeasurements
	): Rect | null
	/** Every valid target for `source`, in reading order. */
	listDropTargets(source: DragSource): readonly DropTarget[]
	/** For `aria-valuenow`, `aria-valuemin` and `aria-valuemax`. */
	getSplitterBounds(splitterId: string): SplitterBounds | null

	/** Replaces the layout (v1 or v2) without calling `onLayoutChange`. */
	load(layout: LayoutJSON | LayoutTreeV1): void
	/** Back to `initialLayout`, or the default layout of the current tabs. */
	reset(): void
	/** The current layout. The same object is returned until the layout changes. */
	toJSON(): LayoutJSON
	/** Removes every listener; later actions are ignored with a warning. */
	destroy(): void
}
