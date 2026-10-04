import { createLayout, type Layout } from '../../src/create-layout'
import type { DropTarget, Side } from '../../src/model/types'
import type { LayoutTreeV1 } from '../../src/serialize/schema'
import { findSplitterPair } from '../../src/geometry/splitter'
import { firstTabId } from '../../src/tree/find'
import { V1_SETTINGS } from './v1-driver'
import { observeV2 } from './v2-observe'
import type { Driver, Operation } from './scenario'

/**
 * Drives the v2 `createLayout` through the public API. v1's center drop
 * inserted the tab before the target's last tab (audit B26); to compare like
 * with like, `contain` is replayed as exactly that.
 */
export function createV2Driver(): Driver {
	let layout: Layout

	const tabsetOf = (tab: string) =>
		layout.getSnapshot().tabs.get(tab)?.tabsetId

	const toTarget = (
		target: Extract<Operation, { op: 'move' }>['target']
	): DropTarget | null => {
		if ('root' in target) return { type: 'root', position: target.root }
		if ('tab' in target)
			return {
				type: 'tab',
				tabId: target.tab,
				position: target.position === 'left' ? 'before' : 'after',
			}
		const tabsetId = tabsetOf(target.tabsetOf)
		if (!tabsetId) return null
		if (target.area !== 'contain')
			return { type: 'tabset', tabsetId, position: target.area as Side }
		const tabIds = layout.getSnapshot().tabsets.get(tabsetId)!.tabIds
		return {
			type: 'tab',
			tabId: tabIds[tabIds.length - 1],
			position: 'before',
		}
	}

	return {
		create(tabs, size, saved) {
			layout = createLayout({
				tabs: tabs.map((id) => ({ id })),
				initialLayout: (saved as LayoutTreeV1 | undefined) ?? null,
				minPanelSize: {
					width: V1_SETTINGS.minW,
					height: V1_SETTINGS.minH,
				},
				splitterSize: V1_SETTINGS.bond,
				foldedSize: V1_SETTINGS.collapsedSize,
				onWarning: () => {},
			})
			layout.setContainerRect({ x: 0, y: 0, ...size })
		},
		apply(operation) {
			switch (operation.op) {
				case 'resize':
					layout.setContainerRect({
						x: 0,
						y: 0,
						width: operation.width,
						height: operation.height,
					})
					return undefined
				case 'fold':
					return layout.toggleFold(tabsetOf(operation.tabsetOf)!)
				case 'maximize':
					return layout.toggleMaximize(tabsetOf(operation.tabsetOf)!)
				case 'splitter': {
					const { root } = layout.getSnapshot()
					const id = [...layout.getSnapshot().splitters.keys()].find(
						(key) => {
							const pair = findSplitterPair(root, key)!
							return (
								firstTabId(pair.before) === operation.before &&
								firstTabId(pair.after) === operation.after
							)
						}
					)
					if (id) layout.resizeSplitter(id, operation.point)
					return undefined
				}
				case 'move': {
					const target = toTarget(operation.target)
					if (!target) return false
					const { source } = operation
					return 'tab' in source
						? layout.moveTab(source.tab, target)
						: layout.moveTabset(tabsetOf(source.tabsetOf)!, target)
				}
			}
		},
		observe() {
			const snapshot = layout.getSnapshot()
			return observeV2(
				{
					root: snapshot.root,
					maximizedTabsetId: snapshot.maximizedTabsetId,
					lastActiveTabsetId: null,
					foldOrder: [],
				},
				snapshot.rects
			)
		},
		save: () => layout.toJSON(),
	}
}
