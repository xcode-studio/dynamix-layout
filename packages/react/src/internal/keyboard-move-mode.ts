import type { DropTarget } from '@dynamix-layout/core'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { LayoutController } from './controller'

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

export function startMoveMode(
	controller: LayoutController,
	tabId: string
): boolean {
	const source = { type: 'tab', tabId } as const
	const targets = controller.engine.listDropTargets(source)
	if (targets.length === 0 || !controller.engine.startDrag(source))
		return false
	const mode = { tabId, targets, index: 0 }
	moveModes.set(controller, mode)
	showMoveTarget(controller, mode)
	return true
}

export function handleMoveMode(
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
