import { describe, it, expect } from 'vitest'
import { createIdGenerator } from '../../src/ids'
import { buildDefaultTree } from '../../src/tree/build'
import {
	collectTabIds,
	collectTabsets,
	findTabsetOfTab,
} from '../../src/tree/find'
import { moveNode, canMove } from '../../src/tree/move'
import { normalizeTree } from '../../src/tree/normalize'
import { removeTab } from '../../src/tree/remove'
import { reconcileTabs } from '../../src/tree/reconcile-tabs'
import {
	fold,
	maximize,
	normalizeViewState,
	restore,
	unfold,
} from '../../src/tree/view-state'
import type {
	LayoutModel,
	RowChild,
	RowNode,
	TabsetNode,
} from '../../src/model/types'

const ids = () => createIdGenerator().createId

/** Compact shape: `[direction, ...children]` rows and `'a,b'` tabsets (`*` marks active, `~` folded). */
type Shape = string | [string, ...Shape[]]
const shape = (node: RowChild): Shape =>
	node.type === 'row'
		? [node.direction[0], ...node.children.map(shape)]
		: (node.isFolded ? '~' : '') +
			node.children
				.map((t) => (t.id === node.activeTabId ? `*${t.id}` : t.id))
				.join(',')

const model = (root: RowNode): LayoutModel => ({
	root,
	maximizedTabsetId: null,
	lastActiveTabsetId: null,
	foldOrder: [],
})

const tabset = (
	tabIds: string[],
	weight = 100,
	extra: Partial<TabsetNode> = {}
): TabsetNode => ({
	type: 'tabset',
	id: `ts-${tabIds[0]}`,
	weight,
	activeTabId: tabIds[0],
	isFolded: false,
	children: tabIds.map((id) => ({ type: 'tab', id })),
	...extra,
})
const row = (
	direction: 'horizontal' | 'vertical',
	children: RowChild[],
	weight = 100,
	id = `row-${Math.random()}`
): RowNode => ({
	type: 'row',
	id,
	weight,
	direction,
	children,
})

describe('buildDefaultTree', () => {
	it('matches the v1 default layout', () => {
		expect(buildDefaultTree([], ids()).children).toEqual([])
		expect(shape(buildDefaultTree(['a'], ids()))).toEqual(['h', '*a'])
		expect(shape(buildDefaultTree(['a', 'b'], ids()))).toEqual([
			'h',
			'*a',
			'*b',
		])
		expect(shape(buildDefaultTree(['a', 'b', 'c', 'd'], ids()))).toEqual([
			'h',
			'*a',
			['v', '*b', ['h', '*c', '*d']],
		])
	})

	it('creates deterministic ids derived from tab ids', () => {
		const first = buildDefaultTree(['a', 'b', 'c'], ids())
		const second = buildDefaultTree(['a', 'b', 'c'], ids())
		expect(first).toEqual(second)
		expect(collectTabsets(first).map((t) => t.id)).toEqual([
			'ts-a',
			'ts-b',
			'ts-c',
		])
	})
})

describe('normalizeTree', () => {
	it('dissolves single-child rows, keeping the child weight', () => {
		const root = row('horizontal', [
			tabset(['a'], 70),
			row('vertical', [tabset(['b'], 30)], 200),
		])
		const result = normalizeTree(root)
		expect(shape(result)).toEqual(['h', '*a', '*b'])
		expect(result.children.map((c) => c.weight)).toEqual([70, 30])
	})

	it('splices same-direction rows and drops empty nodes', () => {
		const root = row('horizontal', [
			tabset(['a']),
			row('horizontal', [tabset(['b']), tabset(['c'])]),
			tabset([]),
			row('vertical', []),
		])
		expect(shape(normalizeTree(root))).toEqual(['h', '*a', '*b', '*c'])
	})

	it('lets the root take over a single child row, including its weight', () => {
		const inner = row('vertical', [tabset(['a']), tabset(['b'])], 42)
		const result = normalizeTree(row('horizontal', [inner], 100, 'root'))
		expect(result.id).toBe('root')
		expect(result.direction).toBe('vertical')
		expect(result.weight).toBe(42)
	})

	it('fixes invalid active tabs and weights', () => {
		const result = normalizeTree(
			row('horizontal', [
				tabset(['a', 'b'], -1, { activeTabId: 'zz' }),
				tabset(['c'], NaN),
			])
		)
		const [first, second] = result.children as TabsetNode[]
		expect(first.activeTabId).toBe('a')
		expect(first.weight).toBe(100)
		expect(second.weight).toBe(100)
	})

	it('returns the same object when nothing changes', () => {
		const root = buildDefaultTree(['a', 'b', 'c'], ids())
		expect(normalizeTree(root)).toBe(root)
	})
})

describe('removeTab', () => {
	it('activates the first remaining tab and removes emptied tabsets', () => {
		let root = normalizeTree(
			row('horizontal', [
				tabset(['a', 'b'], 100, { activeTabId: 'b' }),
				tabset(['c']),
			])
		)
		root = removeTab(root, 'b')
		expect(shape(root)).toEqual(['h', '*a', '*c'])
		root = removeTab(root, 'c')
		expect(shape(root)).toEqual(['h', '*a'])
	})

	it('lifts the remaining sibling into the grandparent', () => {
		const root = buildDefaultTree(['a', 'b', 'c', 'd'], ids())
		expect(shape(removeTab(root, 'c'))).toEqual([
			'h',
			'*a',
			['v', '*b', '*d'],
		])
		expect(shape(removeTab(root, 'b'))).toEqual(['h', '*a', '*c', '*d'])
	})

	it('removing the last tab leaves an empty root', () => {
		expect(removeTab(buildDefaultTree(['a'], ids()), 'a').children).toEqual(
			[]
		)
	})
})

describe('moveNode', () => {
	const start = () => model(buildDefaultTree(['a', 'b', 'c'], ids()))
	const move = (
		m: LayoutModel,
		source: Parameters<typeof moveNode>[1],
		target: Parameters<typeof moveNode>[2]
	) => moveNode(m, source, target, ids())

	it('moves a tab into another tabset, before or after a tab', () => {
		const m = move(
			start(),
			{ type: 'tab', tabId: 'a' },
			{ type: 'tab', tabId: 'c', position: 'before' }
		)!
		expect(shape(m.root)).toEqual(['v', '*b', '*a,c'])
		expect(m.lastActiveTabsetId).toBe(findTabsetOfTab(m.root, 'a')!.id)
	})

	it('appends on center drops (v1 inserted before the last tab)', () => {
		const m = move(
			start(),
			{ type: 'tab', tabId: 'a' },
			{ type: 'tabset', tabsetId: 'ts-c', position: 'center' }
		)!
		expect(shape(m.root)).toEqual(['v', '*b', 'c,*a'])
	})

	it('splits along and across rows', () => {
		const along = move(
			start(),
			{ type: 'tab', tabId: 'a' },
			{ type: 'tabset', tabsetId: 'ts-b', position: 'bottom' }
		)!
		expect(shape(along.root)).toEqual(['v', '*b', '*a', '*c'])
		const across = move(
			start(),
			{ type: 'tab', tabId: 'c' },
			{ type: 'tabset', tabsetId: 'ts-a', position: 'top' }
		)!
		expect(shape(across.root)).toEqual(['h', ['v', '*c', '*a'], '*b'])
	})

	it('docks at the root, wrapping content when crossing the root direction', () => {
		const left = move(
			start(),
			{ type: 'tab', tabId: 'c' },
			{ type: 'root', position: 'left' }
		)!
		expect(shape(left.root)).toEqual(['h', '*c', '*a', '*b'])
		const top = move(
			start(),
			{ type: 'tab', tabId: 'c' },
			{ type: 'root', position: 'top' }
		)!
		expect(shape(top.root)).toEqual(['v', '*c', ['h', '*a', '*b']])
	})

	it('moves whole tabsets and merges them into tabs', () => {
		const m = move(
			start(),
			{ type: 'tabset', tabsetId: 'ts-a' },
			{ type: 'tab', tabId: 'b', position: 'after' }
		)!
		expect(shape(m.root)).toEqual(['v', 'b,*a', '*c'])
	})

	it('refuses moves v1 refused', () => {
		const m = start()
		expect(
			canMove(
				m.root,
				{ type: 'tab', tabId: 'a' },
				{ type: 'tabset', tabsetId: 'ts-a', position: 'left' }
			)
		).toBe(false)
		expect(
			canMove(
				m.root,
				{ type: 'tab', tabId: 'a' },
				{ type: 'tab', tabId: 'a', position: 'after' }
			)
		).toBe(false)
		expect(
			canMove(
				m.root,
				{ type: 'tabset', tabsetId: 'ts-a' },
				{ type: 'tabset', tabsetId: 'ts-a', position: 'center' }
			)
		).toBe(false)
		const single = model(buildDefaultTree(['a'], ids()))
		expect(
			canMove(
				single.root,
				{ type: 'tab', tabId: 'a' },
				{ type: 'root', position: 'top' }
			)
		).toBe(false)
		expect(
			move(
				m,
				{ type: 'tab', tabId: 'zz' },
				{ type: 'root', position: 'top' }
			)
		).toBeNull()
	})

	it('allows splitting a tab out of its own tabset', () => {
		const m = model(
			normalizeTree(row('horizontal', [tabset(['a', 'b'])], 100, 'root'))
		)
		const result = move(
			m,
			{ type: 'tab', tabId: 'b' },
			{ type: 'tabset', tabsetId: 'ts-a', position: 'right' }
		)!
		expect(shape(result.root)).toEqual(['h', '*a', '*b'])
	})

	it('ends maximize and unfolds the receiving tabset', () => {
		let m = fold(start(), 'ts-c')!
		m = maximize(m, 'ts-a')!
		m = move(
			m,
			{ type: 'tab', tabId: 'a' },
			{ type: 'tabset', tabsetId: 'ts-c', position: 'center' }
		)!
		expect(m.maximizedTabsetId).toBeNull()
		expect(findTabsetOfTab(m.root, 'a')!.isFolded).toBe(false)
	})

	it('keeps every tab under random moves', () => {
		let m = model(buildDefaultTree(['a', 'b', 'c', 'd', 'e', 'f'], ids()))
		let seed = 7
		const random = (n: number) => (seed = (seed * 16807) % 2147483647) % n
		const createId = ids()
		const positions = ['top', 'bottom', 'left', 'right', 'center'] as const
		for (let i = 0; i < 500; i++) {
			const tabs = collectTabIds(m.root)
			const tabsets = collectTabsets(m.root)
			const source =
				random(3) === 0
					? {
							type: 'tabset' as const,
							tabsetId: tabsets[random(tabsets.length)].id,
						}
					: { type: 'tab' as const, tabId: tabs[random(tabs.length)] }
			const target =
				random(4) === 0
					? {
							type: 'root' as const,
							position: positions[random(4)] as 'top',
						}
					: {
							type: 'tabset' as const,
							tabsetId: tabsets[random(tabsets.length)].id,
							position: positions[random(5)],
						}
			m = moveNode(m, source, target, createId) ?? m
			expect([...collectTabIds(m.root)].sort()).toEqual([
				'a',
				'b',
				'c',
				'd',
				'e',
				'f',
			])
			expect(normalizeTree(m.root)).toBe(m.root)
		}
	})
})

describe('view state', () => {
	const start = () => model(buildDefaultTree(['a', 'b', 'c'], ids()))

	it('folds and unfolds, refusing a tabset alone in its row', () => {
		const m = fold(start(), 'ts-a')!
		expect(shape(m.root)).toEqual(['h', '~*a', ['v', '*b', '*c']])
		expect(unfold(m, 'ts-a')!.root).toEqual(start().root)
		expect(fold(model(buildDefaultTree(['a'], ids())), 'ts-a')).toBeNull()
		expect(fold(m, 'ts-a')).toBeNull()
	})

	it('folding the last open child unfolds the most recently folded sibling', () => {
		let m = fold(start(), 'ts-b')!
		m = fold(m, 'ts-c')!
		expect(shape(m.root)).toEqual(['h', '*a', ['v', '*b', '~*c']])
	})

	it('maximize needs two tabsets and restore clears it', () => {
		expect(
			maximize(model(buildDefaultTree(['a'], ids())), 'ts-a')
		).toBeNull()
		const m = maximize(start(), 'ts-b')!
		expect(m.maximizedTabsetId).toBe('ts-b')
		expect(maximize(m, 'ts-b')).toBeNull()
		expect(restore(m)!.maximizedTabsetId).toBeNull()
		expect(restore(start())).toBeNull()
	})

	it('normalizes stale view state', () => {
		const m = normalizeViewState({
			...model(
				normalizeTree(
					row(
						'horizontal',
						[tabset(['a'], 100, { isFolded: true })],
						100,
						'root'
					)
				)
			),
			maximizedTabsetId: 'gone',
			foldOrder: ['gone', 'ts-a'],
		})
		expect(shape(m.root)).toEqual(['h', '*a'])
		expect(m.maximizedTabsetId).toBeNull()
		expect(m.foldOrder).toEqual(['ts-a'])
	})
})

describe('reconcileTabs', () => {
	it('removes unlisted tabs and appends new ones to the last active tabset', () => {
		const createId = ids()
		let m = {
			...model(buildDefaultTree(['a', 'b', 'c'], createId)),
			lastActiveTabsetId: 'ts-b',
		}
		m = reconcileTabs(m, [{ id: 'a' }, { id: 'b' }, { id: 'd' }], createId)
		expect(shape(m.root)).toEqual(['h', '*a', 'b,*d'])
	})

	it('honours a target, and does not activate when asked not to', () => {
		const createId = ids()
		let m = model(buildDefaultTree(['a', 'b'], createId))
		m = reconcileTabs(
			m,
			[
				{ id: 'a' },
				{ id: 'b' },
				{ id: 'c', target: { type: 'root', position: 'bottom' } },
			],
			createId
		)
		expect(shape(m.root)).toEqual(['v', ['h', '*a', '*b'], '*c'])
		m = reconcileTabs(
			m,
			[
				{ id: 'a' },
				{ id: 'b' },
				{ id: 'c' },
				{
					id: 'd',
					target: { type: 'tab', tabId: 'a', position: 'after' },
				},
			],
			createId,
			false
		)
		expect(shape(m.root)).toEqual(['v', ['h', '*a,d', '*b'], '*c'])
	})

	it('builds a tabset when the layout is empty', () => {
		const createId = ids()
		const m = reconcileTabs(
			model(buildDefaultTree([], createId)),
			[{ id: 'x' }],
			createId
		)
		expect(shape(m.root)).toEqual(['h', '*x'])
	})
})
