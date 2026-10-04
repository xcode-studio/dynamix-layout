import { isRow } from '../model/guards'
import type { RowChild, RowNode, TabsetNode } from '../model/types'

/** Every tabset in reading order (depth first, left to right). */
export function collectTabsets(root: RowNode): TabsetNode[] {
	const tabsets: TabsetNode[] = []
	const visit = (node: RowChild) => {
		if (isRow(node)) node.children.forEach(visit)
		else tabsets.push(node)
	}
	root.children.forEach(visit)
	return tabsets
}

/** Every tab id in reading order. */
export function collectTabIds(root: RowNode): string[] {
	return collectTabsets(root).flatMap((tabset) =>
		tabset.children.map((tab) => tab.id)
	)
}

/** Every row and tabset id, including the root's. */
export function collectNodeIds(root: RowNode): string[] {
	const ids: string[] = []
	const visit = (node: RowChild) => {
		ids.push(node.id)
		if (isRow(node)) node.children.forEach(visit)
	}
	visit(root)
	return ids
}

export function findTabset(
	root: RowNode,
	tabsetId: string
): TabsetNode | undefined {
	return collectTabsets(root).find((tabset) => tabset.id === tabsetId)
}

export function findTabsetOfTab(
	root: RowNode,
	tabId: string
): TabsetNode | undefined {
	return collectTabsets(root).find((tabset) =>
		tabset.children.some((tab) => tab.id === tabId)
	)
}

/** The row that directly contains the row or tabset `childId`. */
export function findParentRow(
	root: RowNode,
	childId: string
): RowNode | undefined {
	for (const child of root.children) {
		if (child.id === childId) return root
		if (isRow(child)) {
			const found = findParentRow(child, childId)
			if (found) return found
		}
	}
	return undefined
}

/** Id of the first tab inside a row or tabset. */
export function firstTabId(node: RowChild): string | undefined {
	if (!isRow(node)) return node.children[0]?.id
	for (const child of node.children) {
		const id = firstTabId(child)
		if (id !== undefined) return id
	}
	return undefined
}
