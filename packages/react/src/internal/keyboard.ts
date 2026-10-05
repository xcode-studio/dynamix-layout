import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { LayoutController } from './controller'
import { handleMoveMode, startMoveMode } from './keyboard-move-mode'

export { cancelMoveMode } from './keyboard-move-mode'

/** Splitter keyboard steps, in px. */
const STEP = 10
const LARGE_STEP = 50

const isModifier = (event: ReactKeyboardEvent) => event.metaKey || event.ctrlKey

/**
 * Keys on a focused tab (WAI-ARIA tabs pattern): arrows and Home/End move
 * focus along the tab bar (selecting with automatic activation), Enter/Space
 * select, Delete closes a closable tab, Mod+Shift+M starts move mode.
 */
export function handleTabKeyDown(
	controller: LayoutController,
	event: ReactKeyboardEvent,
	tabId: string,
	options: { isRotated: boolean; isClosable: boolean }
): void {
	if (handleMoveMode(controller, event)) return
	const { engine, options: settings } = controller

	if (
		event.key.toLowerCase() === 'm' &&
		event.shiftKey &&
		isModifier(event)
	) {
		if (startMoveMode(controller, tabId)) event.preventDefault()
		return
	}

	const snapshot = engine.getSnapshot()
	const tab = snapshot.tabs.get(tabId)
	const tabIds = tab && snapshot.tabsets.get(tab.tabsetId)?.tabIds
	if (!tabIds) return
	const index = tabIds.indexOf(tabId)
	const [previousKey, nextKey] = options.isRotated
		? ['ArrowUp', 'ArrowDown']
		: ['ArrowLeft', 'ArrowRight']

	let next: string | undefined
	if (event.key === previousKey)
		next = tabIds[(index - 1 + tabIds.length) % tabIds.length]
	else if (event.key === nextKey) next = tabIds[(index + 1) % tabIds.length]
	else if (event.key === 'Home') next = tabIds[0]
	else if (event.key === 'End') next = tabIds[tabIds.length - 1]
	else if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault()
		engine.selectTab(tabId)
		return
	} else if (
		(event.key === 'Delete' || event.key === 'Backspace') &&
		options.isClosable
	) {
		event.preventDefault()
		settings.onTabClose?.(tabId)
		return
	}
	if (next === undefined) return

	event.preventDefault()
	document.getElementById(controller.ids.tab(next))?.focus()
	if (settings.tabActivation === 'automatic') engine.selectTab(next)
}

/**
 * Keys on a focused splitter (WAI-ARIA window splitter pattern): arrows along
 * its row move it (Shift for larger steps), Home/End move it to its limits,
 * Enter folds or unfolds the panel before it when that panel can fold.
 */
export function handleSplitterKeyDown(
	controller: LayoutController,
	event: ReactKeyboardEvent,
	splitterId: string
): void {
	const { engine } = controller
	const splitter = engine.getSnapshot().splitters.get(splitterId)
	if (!splitter) return
	const horizontal = splitter.direction === 'horizontal'
	const step = event.shiftKey ? LARGE_STEP : STEP
	const keys = horizontal
		? ['ArrowLeft', 'ArrowRight']
		: ['ArrowUp', 'ArrowDown']
	const bounds = engine.getSplitterBounds(splitterId)

	let delta: number | null = null
	if (event.key === keys[0]) delta = -step
	else if (event.key === keys[1]) delta = step
	else if (event.key === 'Home' && bounds) delta = bounds.min - bounds.value
	else if (event.key === 'End' && bounds) delta = bounds.max - bounds.value
	else if (event.key === 'Enter') {
		const before = engine.getSnapshot().tabsets.get(splitter.beforeId)
		const after = engine.getSnapshot().tabsets.get(splitter.afterId)
		const target =
			before?.isFolded || (before && !after?.isFolded) ? before : after
		if (target?.canFold && controller.options.allowFold) {
			event.preventDefault()
			engine.toggleFold(target.id)
		}
		return
	}
	if (delta === null) return
	event.preventDefault()
	engine.moveSplitterBy(splitterId, delta)
}

/**
 * Layout-wide shortcuts, listened to on the root (so several layouts on a
 * page don't all react): Alt/Option + "+" maximizes or restores, Alt/Option +
 * "-" folds or unfolds the tabset that has focus or was last pointed at.
 */
export function handleRootKeyDown(
	controller: LayoutController,
	event: ReactKeyboardEvent
): void {
	const { engine, options } = controller
	if (!options.keyboardShortcuts || !event.altKey || isModifier(event)) return
	const snapshot = engine.getSnapshot()
	const id = controller.focusedTabsetId ?? snapshot.maximizedTabsetId
	if (!id || !snapshot.tabsets.has(id)) return

	if (
		(event.code === 'Equal' || event.code === 'NumpadAdd') &&
		options.allowMaximize
	) {
		event.preventDefault()
		engine.toggleMaximize(id)
	} else if (
		(event.code === 'Minus' || event.code === 'NumpadSubtract') &&
		options.allowFold &&
		options.showTabBar
	) {
		event.preventDefault()
		engine.toggleFold(id)
	}
}
