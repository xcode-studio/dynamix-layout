import { isRow } from '../model/guards'
import type { LayoutModel, RowChild, RowNode, TabsetNode } from '../model/types'
import {
	collectNodeIds,
	collectTabsets,
	findParentRow,
	findTabset,
} from './find'
import { replaceNode, withChildren } from './update'

/** Maximize and fold: view state that never changes weights, so both restore exactly. */

const rankOf = (model: LayoutModel, id: string) =>
	model.foldOrder.indexOf(id) + 1

/** Unfolds the most recently folded child of `children` (other than `exceptId`). */
function unfoldMostRecent(
	model: LayoutModel,
	children: readonly RowChild[],
	exceptId?: string
): RowChild[] {
	let pick: TabsetNode | null = null
	for (const child of children) {
		if (child.id === exceptId || isRow(child) || !child.isFolded) continue
		if (!pick || rankOf(model, child.id) > rankOf(model, pick.id))
			pick = child
	}
	return children.map((child) =>
		child === pick ? { ...pick, isFolded: false } : child
	)
}

const isFoldedChild = (child: RowChild) => !isRow(child) && child.isFolded

/** A tabset can fold when its row has another child to take the space. */
export function canFold(root: RowNode, tabsetId: string): boolean {
	const parent = findParentRow(root, tabsetId)
	return !!parent && parent.children.length > 1
}

/** Maximizing needs at least two tabsets. */
export function canMaximize(root: RowNode): boolean {
	return collectTabsets(root).length > 1
}

/**
 * Keeps view state valid after any change: a tabset alone in its row can't
 * stay folded, every row keeps at least one unfolded child, a maximized
 * tabset that left the tree is forgotten, and the fold order only lists
 * existing tabsets.
 */
export function normalizeViewState(model: LayoutModel): LayoutModel {
	const visit = (row: RowNode): RowNode => {
		let children: readonly RowChild[] = row.children
		if (children.length > 0 && children.every(isFoldedChild)) {
			children = unfoldMostRecent(model, children)
		}
		children = children.map((child) => {
			if (isRow(child)) return visit(child)
			return child.isFolded && children.length < 2
				? { ...child, isFolded: false }
				: child
		})
		return withChildren(row, children)
	}

	const root = visit(model.root)
	const ids = new Set(collectNodeIds(root))
	const maximizedTabsetId =
		model.maximizedTabsetId && findTabset(root, model.maximizedTabsetId)
			? model.maximizedTabsetId
			: null
	const foldOrder = model.foldOrder.filter((id) => ids.has(id))
	const lastActiveTabsetId =
		model.lastActiveTabsetId && findTabset(root, model.lastActiveTabsetId)
			? model.lastActiveTabsetId
			: null

	if (
		root === model.root &&
		maximizedTabsetId === model.maximizedTabsetId &&
		foldOrder.length === model.foldOrder.length &&
		lastActiveTabsetId === model.lastActiveTabsetId
	)
		return model
	return { root, maximizedTabsetId, foldOrder, lastActiveTabsetId }
}

/** @returns The new model, or `null` when the tabset can't be maximized. */
export function maximize(
	model: LayoutModel,
	tabsetId: string
): LayoutModel | null {
	if (model.maximizedTabsetId === tabsetId) return null
	if (!findTabset(model.root, tabsetId) || !canMaximize(model.root))
		return null
	return { ...model, maximizedTabsetId: tabsetId }
}

/** @returns The new model, or `null` when nothing is maximized. */
export function restore(model: LayoutModel): LayoutModel | null {
	return model.maximizedTabsetId
		? { ...model, maximizedTabsetId: null }
		: null
}

/**
 * Folds a tabset to a strip. Folding the last unfolded child of a row
 * unfolds its most recently folded sibling instead (LeetCode-style swap).
 * Folding leaves maximized mode.
 */
export function fold(model: LayoutModel, tabsetId: string): LayoutModel | null {
	const tabset = findTabset(model.root, tabsetId)
	const parent = findParentRow(model.root, tabsetId)
	if (!tabset || !parent || tabset.isFolded || parent.children.length < 2)
		return null

	const foldOrder = [
		...model.foldOrder.filter((id) => id !== tabsetId),
		tabsetId,
	]
	const next: LayoutModel = { ...model, foldOrder, maximizedTabsetId: null }
	let children = parent.children.map((child) =>
		child === tabset ? { ...tabset, isFolded: true } : child
	)
	if (children.every(isFoldedChild))
		children = unfoldMostRecent(next, children, tabsetId)

	const root = replaceNode(model.root, parent.id, () =>
		withChildren(parent, children)
	)
	return normalizeViewState({ ...next, root })
}

/** @returns The new model, or `null` when the tabset isn't folded. */
export function unfold(
	model: LayoutModel,
	tabsetId: string
): LayoutModel | null {
	const tabset = findTabset(model.root, tabsetId)
	if (!tabset || !tabset.isFolded) return null
	const root = replaceNode(model.root, tabsetId, () => ({
		...tabset,
		isFolded: false,
	}))
	return normalizeViewState({ ...model, root })
}
