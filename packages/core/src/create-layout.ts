import { defaultWarningHandler, isDev } from './dev'
import { createDragActions } from './drag-actions'
import { getDropIndicatorRect } from './drop/drop-indicator'
import { getDropTarget } from './drop/drop-target'
import { listDropTargets } from './drop/drop-targets'
import { DynamixLayoutError, type WarningHandler } from './errors'
import { DEFAULT_GEOMETRY, type GeometryConfig } from './geometry/config'
import { getSplitterBounds, resizeSplitterWeights } from './geometry/splitter'
import { createIdGenerator } from './ids'
import type { Layout, LayoutOptions, LayoutSizeOptions } from './layout-types'
import type { LayoutModel } from './model/types'
import { parseLayout } from './serialize/parse'
import type { LayoutJSON, LayoutTreeV1 } from './serialize/schema'
import { createLayoutStore } from './store/layout-store'
import { buildDefaultTree } from './tree/build'
import { collectNodeIds, findTabsetOfTab } from './tree/find'
import { moveNode } from './tree/move'
import {
	addTabToModel,
	reconcileTabs,
	type TabInit,
} from './tree/reconcile-tabs'
import { removeTab } from './tree/remove'
import { replaceNode } from './tree/update'
import * as viewState from './tree/view-state'

const ROOT_ID = 'root'

/**
 * Creates a layout instance.
 *
 * @param options - Open tabs, an optional saved layout (v1 or v2), sizes and callbacks.
 * @returns An instance that shares nothing with other instances. It never
 * touches the DOM; call `setContainerRect` to give it a size.
 * @throws {DynamixLayoutError} `INVALID_LAYOUT` or `UNSUPPORTED_VERSION` for a
 * bad `initialLayout`; `DUPLICATE_TAB_ID` for duplicate tab ids in development.
 * @example
 * const layout = createLayout({
 *   tabs: [{ id: 'editor' }, { id: 'terminal' }],
 *   onLayoutChange: (json) => localStorage.setItem('layout', JSON.stringify(json)),
 * })
 * layout.subscribe((snapshot) => render(snapshot))
 * layout.setContainerRect({ x: 0, y: 0, width: 1200, height: 800 })
 */
export function createLayout(options: LayoutOptions): Layout {
	const warn = options.onWarning ?? defaultWarningHandler
	const ids = createIdGenerator(options.createId)
	const { createId, reserve } = ids
	let tabs = uniqueTabs(options.tabs, warn)

	const fromLayout = (input: LayoutJSON | LayoutTreeV1): LayoutModel => {
		const parsed = parseLayout(input, warn)
		reserve(collectNodeIds(parsed.root))
		const loaded = { ...parsed, lastActiveTabsetId: null, foldOrder: [] }
		return reconcileTabs(loaded, tabs, createId, false)
	}
	const initialModel = (): LayoutModel => {
		if (options.initialLayout) return fromLayout(options.initialLayout)
		reserve([ROOT_ID])
		const tabIds = tabs.map((tab) => tab.id)
		return {
			root: buildDefaultTree(tabIds, createId, ROOT_ID),
			maximizedTabsetId: null,
			lastActiveTabsetId: null,
			foldOrder: [],
		}
	}

	const store = createLayoutStore(
		initialModel(),
		configFrom(options, DEFAULT_GEOMETRY),
		options.onLayoutChange,
		warn
	)
	const unknown = (kind: string, id: string) => {
		warn({ code: 'UNKNOWN_ID', message: `Unknown ${kind} "${id}"` })
		return false
	}

	const layout: Layout = {
		getSnapshot: () => store.snapshot,
		subscribe: (listener) => store.subscribe(listener),
		setContainerRect: (rect) => store.setContainer(rect),
		setOptions: (next) => store.setConfig(configFrom(next, store.config)),
		setTabs(next) {
			tabs = uniqueTabs(next, warn)
			store.commit(
				reconcileTabs(store.model, tabs, createId, true),
				'tabs'
			)
		},

		moveTab: (tabId, target) =>
			store.commit(
				moveNode(store.model, { type: 'tab', tabId }, target, createId),
				'move'
			),
		moveTabset: (tabsetId, target) =>
			store.commit(
				moveNode(
					store.model,
					{ type: 'tabset', tabsetId },
					target,
					createId
				),
				'move'
			),
		selectTab(tabId) {
			const { model } = store
			const tabset = findTabsetOfTab(model.root, tabId)
			if (!tabset) return unknown('tab', tabId)
			if (
				tabset.activeTabId === tabId &&
				model.lastActiveTabsetId === tabset.id
			)
				return false
			const root = replaceNode(model.root, tabset.id, () => ({
				...tabset,
				activeTabId: tabId,
			}))
			return store.commit(
				{ ...model, root, lastActiveTabsetId: tabset.id },
				'select'
			)
		},
		addTab(tab, target) {
			if (tabs.some((t) => t.id === tab.id)) return false
			const init = target ? { ...tab, target } : tab
			tabs = [...tabs, init]
			return store.commit(
				addTabToModel(store.model, init, createId, true),
				'tabs'
			)
		},
		removeTab(tabId) {
			if (!tabs.some((t) => t.id === tabId)) return unknown('tab', tabId)
			tabs = tabs.filter((t) => t.id !== tabId)
			const { model } = store
			const root = removeTab(model.root, tabId)
			return store.commit(
				viewState.normalizeViewState({ ...model, root }),
				'tabs'
			)
		},

		resizeSplitter(id, point) {
			const { model, rects, config } = store
			if (model.maximizedTabsetId) return false
			const root = resizeSplitterWeights(
				model.root,
				rects,
				config,
				id,
				point
			)
			return store.commit(root && { ...model, root }, 'resize')
		},
		moveSplitterBy(id, delta) {
			const rect = store.rects.splitters.get(id)
			const splitter = store.snapshot.splitters.get(id)
			if (!rect || !splitter) return unknown('splitter', id)
			const x = rect.x + rect.width / 2
			const y = rect.y + rect.height / 2
			const point =
				splitter.direction === 'horizontal'
					? { x: x + delta, y }
					: { x, y: y + delta }
			return layout.resizeSplitter(id, point)
		},

		maximize: (id) =>
			store.commit(viewState.maximize(store.model, id), 'maximize'),
		restore: () => store.commit(viewState.restore(store.model), 'maximize'),
		toggleMaximize: (id) =>
			store.model.maximizedTabsetId === id
				? layout.restore()
				: layout.maximize(id),
		fold: (id) => store.commit(viewState.fold(store.model, id), 'fold'),
		unfold: (id) => store.commit(viewState.unfold(store.model, id), 'fold'),
		toggleFold(id) {
			const tabset = store.snapshot.tabsets.get(id)
			if (!tabset) return unknown('tabset', id)
			return tabset.isFolded ? layout.unfold(id) : layout.fold(id)
		},

		...createDragActions(store, createId),

		getDropTarget: (point, source, measurements) =>
			source.type === 'splitter'
				? null
				: getDropTarget(
						store.model,
						store.rects,
						point,
						source,
						measurements
					),
		getDropIndicatorRect: (target, measurements) =>
			getDropIndicatorRect(
				store.model,
				store.rects,
				target,
				measurements
			),
		listDropTargets: (source) =>
			source.type === 'splitter'
				? []
				: listDropTargets(store.model, source),
		getSplitterBounds: (id) =>
			getSplitterBounds(store.model.root, store.rects, store.config, id),

		load: (input) => void store.commit(fromLayout(input)),
		reset() {
			ids.reset()
			store.commit(initialModel(), 'reset')
		},
		toJSON: () => store.toJSON(),
		destroy: () => store.destroy(),
	}
	return layout
}

/**
 * `foldedSize` follows `minPanelSize.height` unless set; adapters pass it
 * explicitly (the tab bar height).
 */
function configFrom(
	options: LayoutSizeOptions,
	fallback: GeometryConfig
): GeometryConfig {
	return {
		minPanelSize: options.minPanelSize ?? fallback.minPanelSize,
		splitterSize: options.splitterSize ?? fallback.splitterSize,
		foldedSize:
			options.foldedSize ??
			options.minPanelSize?.height ??
			fallback.foldedSize,
	}
}

/** Duplicate ids throw in development; in production the first one wins. */
function uniqueTabs(tabs: readonly TabInit[], warn: WarningHandler): TabInit[] {
	const seen = new Set<string>()
	return tabs.filter((tab) => {
		if (!seen.has(tab.id)) {
			seen.add(tab.id)
			return true
		}
		if (isDev())
			throw new DynamixLayoutError(
				'DUPLICATE_TAB_ID',
				`Duplicate tab id "${tab.id}"`
			)
		warn({
			code: 'DUPLICATE_TAB_ID',
			message: `Duplicate tab id "${tab.id}" ignored`,
		})
		return false
	})
}
