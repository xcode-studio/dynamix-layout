import type { LayoutSnapshot, RowNode, TabsetNode } from '@dynamix-layout/core'
import type { HeadlessTabItem } from '../types'

/** Plain-text name of a tab for ARIA labels: its title when that's text, else its id. */
export function tabLabel(tab: HeadlessTabItem | undefined, id: string): string {
	const title = tab?.title
	return typeof title === 'string' || typeof title === 'number'
		? String(title)
		: id
}

/** Name of a row or tabset for a splitter label: the active tab of it (or of its first tabset). */
export function nodeLabel(
	snapshot: LayoutSnapshot,
	id: string,
	tabs: { get(tabId: string): HeadlessTabItem | undefined }
): string {
	const find = (node: RowNode | TabsetNode): TabsetNode | undefined => {
		if (node.type === 'tabset') return node
		for (const child of node.children) {
			const found = find(child)
			if (found) return found
		}
		return undefined
	}
	const search = (row: RowNode): RowNode | TabsetNode | undefined => {
		for (const child of row.children) {
			if (child.id === id) return child
			if (child.type === 'row') {
				const found = search(child)
				if (found) return found
			}
		}
		return undefined
	}
	const node = search(snapshot.root)
	const tabset = node && find(node)
	return tabset
		? tabLabel(tabs.get(tabset.activeTabId), tabset.activeTabId)
		: 'panel'
}
