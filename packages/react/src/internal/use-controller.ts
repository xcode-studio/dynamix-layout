import type { LayoutChangeReason, LayoutJSON } from '@dynamix-layout/core'
import { useCallback, useMemo, useReducer, useRef, useState } from 'react'
import type { LayoutContextValue } from '../context/layout-context'
import type {
	HeadlessTabItem,
	LayoutPadding,
	UseDynamixLayoutOptions,
} from '../types'
import { useIsomorphicLayoutEffect } from '../utils/use-isomorphic-layout-effect'
import { useStableCallback } from '../utils/use-stable-callback'
import { observeContainer, readContainer } from './container-observer'
import {
	coreSizes,
	createController,
	type ControllerOptions,
	type Padding,
} from './controller'
import { cancelMoveMode } from './keyboard'
import { stopPointerDrag } from './pointer-drag'
import { startRectWriter } from './rect-writer'
import { tabLabel } from './tab-label'
import { createTabRegistry } from './tab-registry'

const DEFAULT_MIN_PANEL_SIZE = { width: 40, height: 40 }

function toPadding(padding: LayoutPadding | undefined): Padding {
	if (typeof padding === 'number')
		return { top: padding, right: padding, bottom: padding, left: padding }
	return {
		top: padding?.top ?? 0,
		right: padding?.right ?? 0,
		bottom: padding?.bottom ?? 0,
		left: padding?.left ?? 0,
	}
}

/** Joins tab ids into a key that changes only when the set or order of ids does. */
const idsKey = (tabs: readonly HeadlessTabItem[]) =>
	tabs.map((tab) => tab.id).join('\u0000')

/**
 * Creates the controller once and keeps it in sync with props: options and
 * tab ids are pushed into the existing engine (never recreated), the container
 * is observed, the fast path runs, and a controlled `layout` is reconciled.
 */
export function useController(
	options: UseDynamixLayoutOptions,
	idBase: string
) {
	const {
		tabs,
		layout,
		defaultLayout,
		minPanelSize = DEFAULT_MIN_PANEL_SIZE,
		splitterSize = 10,
		tabBarHeight = 40,
		showTabBar = true,
	} = options
	const padding = toPadding(options.padding)
	const controllerOptions: ControllerOptions = {
		tabBarHeight,
		showTabBar,
		padding,
		resizeThrottleMs: options.resizeThrottleMs ?? 0,
		allowMaximize: options.allowMaximize ?? true,
		allowFold: (options.allowFold ?? true) && showTabBar,
		maximizeOnDoubleClick: options.maximizeOnDoubleClick ?? true,
		keyboardShortcuts: options.keyboardShortcuts ?? true,
		tabActivation: options.tabActivation ?? 'automatic',
		onTabClose: options.onTabClose,
	}

	const isControlled = layout !== undefined
	const [, reconcile] = useReducer((count: number) => count + 1, 0)
	const controlledRef = useRef(isControlled)
	const userOnLayoutChange = useStableCallback(options.onLayoutChange)
	const onLayoutChange = useCallback(
		(json: LayoutJSON, reason: LayoutChangeReason) => {
			userOnLayoutChange(json, { reason })
			// Re-render so the effect below can revert a change the parent didn't accept.
			if (controlledRef.current) reconcile()
		},
		[userOnLayoutChange]
	)

	const [core] = useState(() =>
		createController({
			idBase,
			tabs: tabs.map(({ id, target }) => ({ id, target })),
			initialLayout: layout ?? defaultLayout,
			options: controllerOptions,
			minPanelSize,
			splitterSize,
			onLayoutChange,
		})
	)
	const sync = useRef({ from: layout, json: core.engine.toJSON() })

	useIsomorphicLayoutEffect(() => {
		controlledRef.current = isControlled
		core.options = controllerOptions
	})

	useIsomorphicLayoutEffect(() => {
		core.engine.setOptions(
			coreSizes(minPanelSize, splitterSize, { tabBarHeight, showTabBar })
		)
	}, [
		core,
		minPanelSize.width,
		minPanelSize.height,
		splitterSize,
		tabBarHeight,
		showTabBar,
	])

	const key = idsKey(tabs)
	const latestTabs = useRef(tabs)
	useIsomorphicLayoutEffect(() => {
		latestTabs.current = tabs
		core.labels.clear()
		for (const tab of tabs) core.labels.set(tab.id, tabLabel(tab, tab.id))
	})
	useIsomorphicLayoutEffect(() => {
		core.engine.setTabs(
			latestTabs.current.map(({ id, target }) => ({ id, target }))
		)
	}, [core, key])

	// Controlled mode: adopt the parent's layout unless it is what we last emitted or loaded.
	useIsomorphicLayoutEffect(() => {
		if (!isControlled) return
		const current = core.engine.toJSON()
		if (layout === current) sync.current = { from: layout, json: current }
		else if (
			layout !== sync.current.from ||
			current !== sync.current.json
		) {
			core.engine.load(layout!)
			sync.current = { from: layout, json: core.engine.toJSON() }
		}
	})

	const [root, setRoot] = useState<HTMLElement | null>(null)
	// State only to re-render once measured; getters read `core.isMeasured`.
	const [, setMeasured] = useState(false)
	const rootRef = useCallback(
		(element: HTMLElement | null) => {
			core.root = element
			setRoot(element)
		},
		[core]
	)
	useIsomorphicLayoutEffect(() => {
		if (!root) return
		const stopObserving = observeContainer(core, root)
		const stopWriting = startRectWriter(core)
		core.isMeasured = true
		setMeasured(true)
		return () => {
			stopObserving()
			stopWriting()
			stopPointerDrag(core)
			cancelMoveMode(core)
		}
	}, [core, root])
	// Padding changes the container without resizing the element.
	useIsomorphicLayoutEffect(() => {
		if (root) core.engine.setContainerRect(readContainer(root, padding))
	}, [core, root, padding.top, padding.right, padding.bottom, padding.left])

	const [registry] = useState(() => createTabRegistry(tabs))
	useIsomorphicLayoutEffect(() => registry.update(tabs), [registry, tabs])
	const contextValue = useMemo<LayoutContextValue>(
		() => ({ core, tabs: registry }),
		[core, registry]
	)
	const tabIds = useMemo(() => (key === '' ? [] : key.split('\u0000')), [key])

	return { core, contextValue, rootRef, tabIds }
}
