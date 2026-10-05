import { describe, it, expect, beforeEach } from 'vitest'
import { DynamixLayoutCore, Node, Bond } from '../src'
import type { LayoutTree, NodeOptions } from '../src'

const BOND = 10
const STRIP = 36
const SIZE = { w: 1200, h: 800, x: 0, y: 0 }

const tabset = (name: string, part = 100): LayoutTree => ({
	typNode: 'tabset',
	nodName: '',
	uidNode: `ts-${name}`,
	nodPart: part,
	nodOpen: name,
	nodKids: [
		{ typNode: 'tab', nodName: name, uidNode: `tab-${name}`, nodPart: 100 },
	],
})

/** Root (side by side): a | b | column(c over d). */
const tree = (): LayoutTree => ({
	typNode: 'row',
	nodName: 'dynamix-layout-root',
	uidNode: 'dynamix-layout-root',
	nodPart: 100,
	nodKids: [
		tabset('a', 120),
		tabset('b', 80),
		{
			typNode: 'row',
			nodName: '',
			uidNode: 'col',
			nodPart: 100,
			nodKids: [tabset('c'), tabset('d')],
		},
	],
})

const create = (layoutTree: LayoutTree = tree()) => {
	const layout = new DynamixLayoutCore({
		tree: layoutTree,
		bond: BOND,
		minW: 40,
		minH: 40,
		collapsedSize: STRIP,
	})
	layout.updateDimension(SIZE, true)
	return layout
}

const opts = (id: string) => Node.cache.nodOpts.get().get(id) as NodeOptions
const dims = (id: string) => ({ ...opts(id).nodDims })
const node = (id: string) => Node.cache.mapElem.get(id) as Node

/** Kids (plus bonds) must tile every row exactly. */
const tilingProblems = (): string[] => {
	const problems: string[] = []
	const walk = (n: Node) => {
		const kids = [...n.kids]
		if (n.type === 'row' && kids.length) {
			const horizontal = Node.cache.mapDirs.get(n.unId)
			const [pos, size] = horizontal
				? (['x', 'w'] as const)
				: (['y', 'h'] as const)
			let cursor = n.dims[pos]
			for (const k of kids) {
				if (k.dims[pos] !== cursor)
					problems.push(`${k.unId} at ${k.dims[pos]}, want ${cursor}`)
				cursor = k.dims[pos] + k.dims[size] + BOND
			}
			if (cursor - BOND !== n.dims[pos] + n.dims[size])
				problems.push(`${n.unId} not filled`)
		}
		kids.forEach(walk)
	}
	walk(DynamixLayoutCore._root)
	return problems
}

describe('Maximize', () => {
	beforeEach(() => new DynamixLayoutCore().clearAllCache())

	it('shows one tabset over the whole layout and hides the rest', () => {
		const layout = create()
		expect(layout.maximize('ts-c')).toBe(true)

		expect(layout.maximizedId).toBe('ts-c')
		expect(opts('ts-c').nodMaxd).toBe(true)
		expect(dims('ts-c')).toEqual(SIZE)
		expect(Node.cache.tabOpts.get().get('tab-c')!.nodDims).toEqual(SIZE)

		for (const id of ['ts-a', 'ts-b', 'ts-d'])
			expect(opts(id).nodHidden).toBe(true)
		for (const bond of Node.cache.bndOpts.get().values())
			expect(bond.nodHidden).toBe(true)
	})

	it('restores the previous split exactly', () => {
		const layout = create()
		const before = ['ts-a', 'ts-b', 'ts-c', 'ts-d'].map(dims)

		layout.maximize('ts-b')
		layout.restore()

		expect(['ts-a', 'ts-b', 'ts-c', 'ts-d'].map(dims)).toEqual(before)
		expect(layout.maximizedId).toBeNull()
		for (const o of Node.cache.nodOpts.get().values())
			expect(o.nodHidden).toBe(false)
	})

	it('toggles and refuses a layout with a single tabset', () => {
		const layout = create()
		expect(layout.toggleMaximize('ts-a')).toBe(true)
		expect(layout.toggleMaximize('ts-a')).toBe(true)
		expect(layout.maximizedId).toBeNull()

		new DynamixLayoutCore().clearAllCache()
		const single = new DynamixLayoutCore({ tabs: ['only'] })
		single.updateDimension(SIZE, true)
		const [only] = Node.cache.nodOpts.get().keys()
		expect(opts(only).nodMaximizable).toBe(false)
		expect(single.maximize(only)).toBe(false)
	})
})

describe('Fold', () => {
	beforeEach(() => new DynamixLayoutCore().clearAllCache())

	it('folds to a vertical strip in a horizontal row', () => {
		const layout = create()
		expect(layout.collapse('ts-a')).toBe(true)

		expect(opts('ts-a').nodFold).toBe(true)
		expect(dims('ts-a').w).toBe(STRIP)
		expect(dims('ts-a').h).toBe(SIZE.h)
		expect(tilingProblems()).toEqual([])
	})

	it('folds to a horizontal strip in a vertical row', () => {
		const layout = create()
		expect(layout.collapse('ts-c')).toBe(true)

		expect(dims('ts-c').h).toBe(STRIP)
		expect(dims('ts-d').h).toBe(SIZE.h - STRIP - BOND)
		expect(tilingProblems()).toEqual([])
	})

	it('unfolds back to the exact previous size', () => {
		const layout = create()
		const before = ['ts-a', 'ts-b', 'ts-c', 'ts-d'].map(dims)

		layout.collapse('ts-b')
		expect(dims('ts-b').w).toBe(STRIP)
		layout.expand('ts-b')

		expect(['ts-a', 'ts-b', 'ts-c', 'ts-d'].map(dims)).toEqual(before)
	})

	it('folding the last open child unfolds the most recently folded sibling', () => {
		const layout = create()
		layout.collapse('ts-c')
		expect(layout.collapse('ts-d')).toBe(true)

		expect(node('ts-d').collapsed).toBe(true)
		expect(node('ts-c').collapsed).toBe(false)
		expect(tilingProblems()).toEqual([])
	})

	it('cannot fold a tabset that is alone in its row', () => {
		const single = new DynamixLayoutCore({ tabs: ['only'] })
		single.updateDimension(SIZE, true)
		const [only] = Node.cache.nodOpts.get().keys()

		expect(opts(only).nodFoldable).toBe(false)
		expect(single.collapse(only)).toBe(false)
	})

	it('locks the bonds next to a folded tabset', () => {
		const layout = create()
		layout.collapse('ts-b')

		const bond = node('ts-b').prev as Bond
		expect(Node.cache.bndOpts.get().get(bond.unId)!.nodLocked).toBe(true)

		const before = dims('ts-a')
		layout.updateSliderDimension(bond.unId, { x: bond.dims.x + 100, y: 0 })
		expect(dims('ts-a')).toEqual(before)
	})

	it('keeps the strip size while the container resizes', () => {
		const layout = create()
		layout.collapse('ts-a')

		for (let w = 600; w <= 1600; w += 37) {
			layout.updateDimension({ ...SIZE, w }, true)
			expect(dims('ts-a').w).toBe(STRIP)
			expect(tilingProblems()).toEqual([])
		}
	})

	it('folding a maximized tabset leaves maximized mode', () => {
		const layout = create()
		layout.maximize('ts-a')
		layout.collapse('ts-a')

		expect(layout.maximizedId).toBeNull()
		expect(dims('ts-a').w).toBe(STRIP)
	})
})

describe('View state with saved layouts and drag and drop', () => {
	beforeEach(() => new DynamixLayoutCore().clearAllCache())

	it('round-trips fold and maximize through toJSON', () => {
		const layout = create()
		layout.collapse('ts-a')
		layout.maximize('ts-c')
		const saved = DynamixLayoutCore._root.toJSON()

		expect(saved.nodMaxd).toBe('ts-c')
		expect(saved.nodKids![0].nodFold).toBe(true)

		new DynamixLayoutCore().clearAllCache()
		const restored = create(saved)
		expect(restored.maximizedId).toBe('ts-c')
		expect(node('ts-a').collapsed).toBe(true)
	})

	it('ends maximize on any move', () => {
		const layout = create()
		layout.maximize('ts-a')
		expect(layout.updateTree('tab-b', 'tab-c', 'contain')).toBe(true)
		expect(layout.maximizedId).toBeNull()
	})

	it('unfolds a tabset that receives a dropped tab', () => {
		const layout = create()
		layout.collapse('ts-a')
		expect(layout.updateTree('tab-b', 'tab-a', 'contain')).toBe(true)
		expect(node('ts-a').collapsed).toBe(false)
	})

	it('unfolds a tabset that is dragged elsewhere', () => {
		const layout = create()
		layout.collapse('ts-c')
		expect(layout.updateTree('ts-c', 'ts-a', 'left')).toBe(true)
		expect(node('ts-c').collapsed).toBe(false)
	})

	it('stays consistent under random moves, folds and maximizes', () => {
		const tabs = ['a', 'b', 'c', 'd', 'e', 'f']
		const layout = new DynamixLayoutCore({
			tabs,
			bond: BOND,
			collapsedSize: STRIP,
		})
		layout.updateDimension(SIZE, true)

		let seed = 42
		const rnd = (n: number) => {
			seed = (seed * 16807) % 2147483647
			return seed % n
		}
		const areas = ['top', 'bottom', 'left', 'right', 'contain'] as const
		const problems: string[] = []

		for (let i = 0; i < 400 && problems.length < 5; i++) {
			const nodes = [...Node.cache.mapElem.values()].filter(
				(n): n is Node => n instanceof Node
			)
			const tabsets = nodes.filter((n) => n.type === 'tabset')
			const action = rnd(4)
			if (action === 0) {
				layout.toggleCollapse(tabsets[rnd(tabsets.length)].unId)
			} else if (action === 1) {
				layout.toggleMaximize(tabsets[rnd(tabsets.length)].unId)
			} else {
				const srcs = nodes.filter(
					(n) => n.type === 'tab' || n.type === 'tabset'
				)
				const targets = nodes.filter(
					(n) => n.type !== 'row' || n === DynamixLayoutCore._root
				)
				layout.updateTree(
					srcs[rnd(srcs.length)].unId,
					targets[rnd(targets.length)].unId,
					areas[rnd(areas.length)]
				)
			}
			layout.updateDimension(SIZE, true)

			const found: string[] = []
			const walk = (n: Node) => {
				if (n.type === 'tab') found.push(n.name)
				if (
					n.type !== 'tab' &&
					n.kids.size() &&
					[...n.kids].every((k) => k.collapsed)
				)
					problems.push(
						`move ${i}: every child of ${n.unId} is folded`
					)
				if (n.collapsed && n.host && n.host.kids.size() < 2)
					problems.push(`move ${i}: ${n.unId} folded alone`)
				for (const kid of n.kids) walk(kid)
			}
			walk(DynamixLayoutCore._root)
			if (found.sort().join() !== tabs.join())
				problems.push(`move ${i}: tabs changed`)
			problems.push(...tilingProblems().map((p) => `move ${i}: ${p}`))
		}

		expect(problems).toEqual([])
	})
})
