import type { CreateId, DropTarget, LayoutModel, RowNode } from '../model/types'
import { createTabset } from './build'
import {
	collectTabIds,
	collectTabsets,
	findTabset,
	findTabsetOfTab,
} from './find'
import { dockAtRoot, insertBeside, insertTabs } from './insert'
import { normalizeTree } from './normalize'
import { removeTab } from './remove'
import { normalizeViewState } from './view-state'

/** A tab the layout should contain. */
export interface TabInit {
	/** Unique, stable id. It's also what saved layouts store. */
	readonly id: string
	/** Where the tab goes the first time it appears. @default the last active tabset */
	readonly target?: DropTarget
}

/** The tabset new tabs go to: the last active one, else the first. */
function defaultTabsetId(
	model: LayoutModel,
	root: RowNode
): string | undefined {
	if (model.lastActiveTabsetId && findTabset(root, model.lastActiveTabsetId))
		return model.lastActiveTabsetId
	return collectTabsets(root)[0]?.id
}

/**
 * Adds one tab at `target` (or the default tabset). A target that no longer
 * exists falls back to the default tabset.
 *
 * @param activate - Make the new tab the active one in its tabset.
 */
export function addTabToModel(
	model: LayoutModel,
	tab: TabInit,
	createId: CreateId,
	activate = true
): LayoutModel {
	if (findTabsetOfTab(model.root, tab.id)) return model
	const node = { type: 'tab', id: tab.id } as const
	const target = tab.target
	let root = model.root

	const appendTo = (tabsetId: string) => {
		const tabset = findTabset(root, tabsetId)!
		const activeTabId = activate ? tab.id : tabset.activeTabId
		return insertTabs(
			root,
			tabsetId,
			[node],
			tabset.children.length,
			activeTabId
		)
	}

	if (target?.type === 'tab' && findTabsetOfTab(root, target.tabId)) {
		const tabset = findTabsetOfTab(root, target.tabId)!
		const index =
			tabset.children.findIndex((t) => t.id === target.tabId) +
			(target.position === 'after' ? 1 : 0)
		root = insertTabs(
			root,
			tabset.id,
			[node],
			index,
			activate ? tab.id : tabset.activeTabId
		)
	} else if (target?.type === 'tabset' && findTabset(root, target.tabsetId)) {
		root =
			target.position === 'center'
				? appendTo(target.tabsetId)
				: insertBeside(
						root,
						target.tabsetId,
						createTabset(tab.id, createId),
						target.position,
						createId
					)
	} else if (target?.type === 'root' || collectTabsets(root).length === 0) {
		root = dockAtRoot(
			root,
			createTabset(tab.id, createId),
			target?.type === 'root' ? target.position : 'right',
			createId
		)
	} else {
		root = appendTo(defaultTabsetId(model, root)!)
	}

	root = normalizeTree(root)
	return normalizeViewState({
		...model,
		root,
		lastActiveTabsetId: activate
			? (findTabsetOfTab(root, tab.id)?.id ?? null)
			: model.lastActiveTabsetId,
	})
}

/**
 * Makes the layout contain exactly `tabs`: tabs that are no longer listed are
 * removed, and new ones are added at their `target` or the default tabset.
 * Order of `tabs` doesn't reorder tabs already placed.
 *
 * @param activate - Make newly added tabs active (true for runtime additions,
 * false when filling gaps in a just-loaded layout).
 */
export function reconcileTabs(
	model: LayoutModel,
	tabs: readonly TabInit[],
	createId: CreateId,
	activate = true
): LayoutModel {
	const wanted = new Set(tabs.map((tab) => tab.id))
	let root = model.root
	for (const id of collectTabIds(root)) {
		if (!wanted.has(id)) root = removeTab(root, id)
	}
	let next =
		root === model.root ? model : normalizeViewState({ ...model, root })

	for (const tab of tabs) next = addTabToModel(next, tab, createId, activate)
	return next
}
