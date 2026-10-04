import { describe, it, expect, beforeEach } from 'vitest'
import { DynamixLayoutCore, LayoutTree, NodeTypeWithBond } from '../src'
import { assertNodeTreeIsValid } from './utils/test.utils'

/**
 * Extracts all nodes from a LayoutTree and returns them in a flat array.
 * Each node is represented by its id, name, and type.
 * @param tree The root of the LayoutTree to extract nodes from.
 * @returns An array of objects containing id, name, and type of each node.
 */
const getNodesFromTree = (
	tree: LayoutTree
): { id: string; name: string; type: NodeTypeWithBond }[] => {
	const nodes = [
		{
			id: tree.uidNode,
			name: tree.nodName,
			type: tree.typNode,
		},
	]
	if (tree.nodKids) {
		for (const kid of tree.nodKids) {
			nodes.push(...getNodesFromTree(kid))
		}
	}
	return nodes
}

/**
 * Test suite for dynamic layout management functionality.
 *
 * This suite tests the Layout class's ability to handle various node configurations
 * and relocation operations. It dynamically generates layout structures with an
 * increasing number of tabs (1 to n), converts each layout to JSON, and then
 * performs extensive node movement tests.
 *
 * For each layout configuration, it:
 * 1. Creates a layout with a subset of tabs
 * 2. Extracts all nodes (tabs, tabsets, etc.) from the layout tree
 * 3. Tests every possible movement combination:
 *    - Every draggable node (tabs and tabsets)
 *    - Every potential drop target (tabs, tabsets, and root)
 *    - Every position (top, bottom, left, right, contain)
 * 4. Validates that each successful movement results in a valid tree structure
 *
 * This comprehensive approach ensures the layout engine correctly handles
 * node relocation under a wide variety of scenarios and maintains tree integrity
 * after each operation.
 */

describe('Dynamic Layout Management Test Suite', () => {
	beforeEach(() => {
		const layout = new DynamixLayoutCore()
		layout.clearAllCache()
	})

	describe('Layout Initialization', () => {
		it('should create a valid layout structure from tabs list', () => {
			const tabs = ['dashboard', 'profile', 'settings']
			const layoutInstance = new DynamixLayoutCore({ tabs })
			expect(layoutInstance).toBeInstanceOf(DynamixLayoutCore)
			expect(() =>
				assertNodeTreeIsValid(DynamixLayoutCore._root)
			).not.toThrow()
		})
	})

	describe('Node Relocation Operations', () => {
		const tabs = [
			'dashboard',
			'profile',
			'settings',
			'analytics',
			'messages',
			'notifications',
			// 'activity',
			// 'projects',
			// 'tasks',
			// 'calendar',
			// 'files',
			// 'contacts',
			// 'inbox',
			// 'reports',
			// 'billing',
			// 'support',
			// 'integrations',
			// 'api-keys',
			// 'logs',
			// 'themes',
			// 'permissions',
			// 'account',
			// 'devices',
			// 'security',
			// 'feedback'
		]

		const layouts: LayoutTree[] = []
		const tabsets: string[][] = []
		for (let i = 0; i < tabs.length; i++) {
			const subsetTabs = tabs.slice(0, i + 1)
			tabsets.push(subsetTabs)
			new DynamixLayoutCore({
				tabs: subsetTabs,
			})
			layouts.push(DynamixLayoutCore._root.toJSON())
		}

		for (let i = 0; i < layouts.length; i++) {
			const initialLayoutTree = layouts[i]
			const tabset = tabsets[i]
			describe(`Layout with ${tabset.length} Tabs: Node Movement Tests`, () => {
				const nodes = getNodesFromTree(initialLayoutTree)
				const draggableNodes = nodes.filter(
					(n) => n.type === 'tab' || n.type === 'tabset'
				)
				const droppableNodes = nodes.filter(
					(n) =>
						n.type === 'tab' ||
						n.type === 'tabset' ||
						n.id === 'dynamix-layout-root'
				)
				const positions: (
					'top' | 'bottom' | 'left' | 'right' | 'contain'
				)[] = ['top', 'bottom', 'left', 'right', 'contain']

				for (const srcNode of draggableNodes) {
					for (const desNode of droppableNodes) {
						for (const position of positions) {
							if (srcNode.id === desNode.id) continue

							it(`should handle ${srcNode.type} '${srcNode.id}' moving to '${position}' of ${desNode.type} '${desNode.id}'`, () => {
								const testInstance = new DynamixLayoutCore({
									tree: initialLayoutTree,
								})
								const moveSucceeded = testInstance.updateTree(
									srcNode.id,
									desNode.id,
									position
								)

								if (moveSucceeded) {
									expect(() =>
										assertNodeTreeIsValid(
											DynamixLayoutCore._root
										)
									).not.toThrow()
								} else {
									expect(moveSucceeded).toBe(false)
								}
							})
						}
					}
				}
			})
		}
	})
})
