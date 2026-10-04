import { isRow } from '../model/guards'
import type { RowChild, RowNode } from '../model/types'

const sameItems = <T>(a: readonly T[], b: readonly T[]) =>
	a.length === b.length && a.every((item, i) => item === b[i])

/** A copy of `row` with new children, or `row` itself when nothing changed. */
export function withChildren(
	row: RowNode,
	children: readonly RowChild[]
): RowNode {
	return sameItems(row.children, children) ? row : { ...row, children }
}

/**
 * Replaces the row or tabset `id` with the result of `replace` (an array to
 * splice several nodes in its place, or an empty array to remove it). Only the
 * path to the node is copied; every other node keeps its identity.
 */
export function replaceNode(
	root: RowNode,
	id: string,
	replace: (node: RowChild) => RowChild | readonly RowChild[]
): RowNode {
	if (root.id === id) {
		const result = replace(root)
		if (Array.isArray(result) || !isRow(result as RowChild))
			throw new Error('The root can only be replaced by a row.')
		return result as RowNode
	}
	const visit = (row: RowNode): RowNode => {
		const children: RowChild[] = []
		for (const child of row.children) {
			if (child.id === id) {
				const result = replace(child)
				if (Array.isArray(result)) children.push(...result)
				else children.push(result as RowChild)
			} else {
				children.push(isRow(child) ? visit(child) : child)
			}
		}
		return withChildren(row, children)
	}
	return visit(root)
}
