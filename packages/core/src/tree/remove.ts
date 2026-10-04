import type { RowNode } from '../model/types'
import { findTabsetOfTab } from './find'
import { normalizeTree } from './normalize'
import { replaceNode } from './update'

/**
 * Removes a tab. An emptied tabset is removed too, and rows left with one
 * child are dissolved. If the removed tab was active, the first remaining tab
 * becomes active.
 *
 * @returns The new root, or `root` itself when the tab does not exist.
 */
export function removeTab(root: RowNode, tabId: string): RowNode {
	const tabset = findTabsetOfTab(root, tabId)
	if (!tabset) return root
	const children = tabset.children.filter((tab) => tab.id !== tabId)
	const next = replaceNode(root, tabset.id, () =>
		children.length === 0
			? []
			: {
					...tabset,
					children,
					activeTabId:
						tabset.activeTabId === tabId
							? children[0].id
							: tabset.activeTabId,
				}
	)
	return normalizeTree(next)
}

/** Removes a whole tabset and dissolves rows left with one child. */
export function removeTabset(root: RowNode, tabsetId: string): RowNode {
	return normalizeTree(replaceNode(root, tabsetId, () => []))
}
