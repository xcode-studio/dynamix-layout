import type { DropTarget } from '@dynamix-layout/core'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { LayoutController } from './controller'

/** Splitter keyboard steps, in px. */
const STEP = 10
const LARGE_STEP = 50

const isModifier = (event: ReactKeyboardEvent) => event.metaKey || event.ctrlKey

/** Keyboard move mode: a tab drag driven by arrow keys (Mod+Shift+M, Enter drops, Escape cancels). */
interface MoveMode {
	readonly tabId: string
	readonly targets: readonly DropTarget[]
	index: number
}
const moveModes = new WeakMap<LayoutController, MoveMode>()

function describeTarget(
	controller: LayoutController,
	target: DropTarget
): string {
	const snapshot = controller.engine.getSnapshot()
	const label = (tabId: string | undefined) =>
		tabId ? (controller.labels.get(tabId) ?? tabId) : ''
	if (target.type === 'root') return `${target.position} edge of the layout`
	if (target.type === 'tab')
		return `${target.position} ${label(target.tabId)}`
	const tabset = snapshot.tabsets.get(target.tabsetId)
	const name = label(tabset?.tabIds[0])
	return target.position === 'center'
		? `into ${name}`
		: `${target.position} of ${name}`
}

function showMoveTarget(controller: LayoutController, mode: MoveMode) {
	const target = mode.targets[mode.index]
	controller.engine.setDragTarget(target, controller.measure())
	const name = controller.labels.get(mode.tabId) ?? mode.tabId
	controller.announce(
		`Move ${name}: ${describeTarget(controller, target)}. Enter to drop, Escape to cancel.`
	)
}

function startMoveMode(controller: LayoutController, tabId: string): boolean {
	const source = { type: 'tab', tabId } as const
	const targets = controller.engine.listDropTargets(source)
	if (targets.length === 0 || !controller.engine.startDrag(source))
		return false
	const mode = { tabId, targets, index: 0 }
	moveModes.set(controller, mode)
	showMoveTarget(controller, mode)
	return true
}

function handleMoveMode(
	controller: LayoutController,
	event: ReactKeyboardEvent
): boolean {
	const mode = moveModes.get(controller)
	if (!mode) return false
	const name = controller.labels.get(mode.tabId) ?? mode.tabId
	switch (event.key) {
		case 'ArrowRight':
		case 'ArrowDown':
			mode.index = (mode.index + 1) % mode.targets.length
			showMoveTarget(controller, mode)
			break
		case 'ArrowLeft':
		case 'ArrowUp':
			mode.index =
				(mode.index - 1 + mode.targets.length) % mode.targets.length
			showMoveTarget(controller, mode)
			break
		case 'Enter':
		case ' ':
			moveModes.delete(controller)
			controller.engine.endDrag()
			controller.announce(`Moved ${name}.`)
			break
		case 'Escape':
		case 'Tab':
			moveModes.delete(controller)
			controller.engine.cancelDrag()
			controller.announce(`Move of ${name} cancelled.`)
			if (event.key === 'Tab') return true
			break
		default:
			return true
	}
	event.preventDefault()
	return true
}

/** Ends keyboard move mode, if active (on blur or unmount). */
export function cancelMoveMode(controller: LayoutController): void {
	if (!moveModes.delete(controller)) return
	controller.engine.cancelDrag()
}

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
