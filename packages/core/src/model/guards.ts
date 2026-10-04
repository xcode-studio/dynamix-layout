import type { LayoutNode, RowNode, TabNode, TabsetNode } from './types'

/** @returns `true` when `node` is a row. */
export const isRow = (node: LayoutNode): node is RowNode => node.type === 'row'

/** @returns `true` when `node` is a tabset. */
export const isTabset = (node: LayoutNode): node is TabsetNode =>
	node.type === 'tabset'

/** @returns `true` when `node` is a tab. */
export const isTab = (node: LayoutNode): node is TabNode => node.type === 'tab'
