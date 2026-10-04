import type {
	CreateId,
	DropTarget,
	LayoutModel,
	RowNode,
	TabNode,
	TabsetNode,
} from '../model/types'
import { createTabset } from './build'
import { collectTabsets, findTabset, findTabsetOfTab } from './find'
import { dockAtRoot, insertBeside, insertTabs } from './insert'
import { normalizeTree } from './normalize'
import { removeTab, removeTabset } from './remove'
import { normalizeViewState } from './view-state'

/** What is being moved. */
export type MoveSource =
	| { readonly type: 'tab'; readonly tabId: string }
	| { readonly type: 'tabset'; readonly tabsetId: string }

/** The tabset a source currently lives in (the tabset itself for a tabset). */
function sourceTabset(
	root: RowNode,
	source: MoveSource
): TabsetNode | undefined {
	return source.type === 'tab'
		? findTabsetOfTab(root, source.tabId)
		: findTabset(root, source.tabsetId)
}

/**
 * Whether a move is allowed. Mirrors v1's guards (`tree-mutations.ts:17-87`):
 * nothing moves onto itself, a lone tab can't be dropped on its own tabset,
 * and the only tabset in the layout can't move.
 */
export function canMove(
	root: RowNode,
	source: MoveSource,
	target: DropTarget
): boolean {
	const from = sourceTabset(root, source)
	if (!from) return false

	const tabsets = collectTabsets(root)
	const isOnlyContent =
		tabsets.length === 1 &&
		(source.type === 'tabset' || from.children.length === 1)
	if (isOnlyContent) return false

	switch (target.type) {
		case 'root':
			return true
		case 'tab': {
			const targetTabset = findTabsetOfTab(root, target.tabId)
			if (!targetTabset) return false
			if (source.type === 'tab') return source.tabId !== target.tabId
			return targetTabset !== from
		}
		case 'tabset': {
			const targetTabset = findTabset(root, target.tabsetId)
			if (!targetTabset) return false
			if (source.type === 'tabset') return targetTabset !== from
			if (targetTabset !== from) return true
			if (from.children.length < 2) return false
			// Center on its own tabset moves the tab to the end; already there is a no-op.
			return (
				target.position !== 'center' ||
				from.children[from.children.length - 1].id !== source.tabId
			)
		}
	}
}

/**
 * Moves a tab or a whole tabset. The source is removed first (dissolving rows
 * left with one child), then inserted at the target:
 * - `tab` target: into that tab's tabset, before or after it;
 * - `tabset` + `center`: appended to that tabset (v1 inserted before its last
 *   tab; audit B26);
 * - `tabset` + side: beside that tabset (see `insertBeside`);
 * - `root` + side: docked at a layout edge (see `dockAtRoot`).
 *
 * Moving ends maximized mode; the moved tabs arrive unfolded and the receiving
 * tabset becomes the last active one.
 *
 * @returns The new model, or `null` when the move isn't allowed.
 */
export function moveNode(
	model: LayoutModel,
	source: MoveSource,
	target: DropTarget,
	createId: CreateId
): LayoutModel | null {
	if (!canMove(model.root, source, target)) return null
	const from = sourceTabset(model.root, source)!

	const tabs: readonly TabNode[] =
		source.type === 'tab'
			? [{ type: 'tab', id: source.tabId }]
			: from.children
	const activeTabId =
		source.type === 'tab' ? source.tabId : tabs[tabs.length - 1].id
	const asTabset = (): TabsetNode =>
		source.type === 'tab'
			? createTabset(source.tabId, createId)
			: { ...from, isFolded: false }

	let root =
		source.type === 'tab'
			? removeTab(model.root, source.tabId)
			: removeTabset(model.root, from.id)

	switch (target.type) {
		case 'tab': {
			const tabset = findTabsetOfTab(root, target.tabId)!
			const index =
				tabset.children.findIndex((tab) => tab.id === target.tabId) +
				(target.position === 'after' ? 1 : 0)
			root = insertTabs(root, tabset.id, tabs, index, activeTabId)
			break
		}
		case 'tabset': {
			if (target.position === 'center') {
				const tabset = findTabset(root, target.tabsetId)!
				root = insertTabs(
					root,
					tabset.id,
					tabs,
					tabset.children.length,
					activeTabId
				)
			} else {
				root = insertBeside(
					root,
					target.tabsetId,
					asTabset(),
					target.position,
					createId
				)
			}
			break
		}
		case 'root':
			root = dockAtRoot(root, asTabset(), target.position, createId)
			break
	}

	root = normalizeTree(root)
	return normalizeViewState({
		...model,
		root,
		maximizedTabsetId: null,
		lastActiveTabsetId: findTabsetOfTab(root, activeTabId)?.id ?? null,
	})
}
