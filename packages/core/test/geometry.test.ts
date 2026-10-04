import { describe, it, expect, beforeEach } from 'vitest'
import { DynamixLayoutCore, Node } from '../src'
import type { LayoutTree } from '../src'

const BOND = 10

/** Every row's kids (plus bonds) must tile the row exactly along its axis and
 * span it fully across the other axis. Returns human readable problems. */
const geometryProblems = (root: Node): string[] => {
	const problems: string[] = []
	const walk = (n: Node, path: string) => {
		const kids = [...n.kids]
		if (n.type === 'row' && kids.length) {
			const dir = Node.cache.mapDirs.get(n.unId)
			const [pos, size, cpos, csize] = dir
				? (['x', 'w', 'y', 'h'] as const)
				: (['y', 'h', 'x', 'w'] as const)
			let cursor = n.dims[pos]
			kids.forEach((k, i) => {
				if (k.dims[pos] !== cursor)
					problems.push(
						`${path}/${i} ${pos}=${k.dims[pos]} want ${cursor}`
					)
				if (
					k.dims[cpos] !== n.dims[cpos] ||
					k.dims[csize] !== n.dims[csize]
				)
					problems.push(`${path}/${i} cross-axis mismatch`)
				if (k.dims[size] < 0)
					problems.push(`${path}/${i} negative ${size}`)
				cursor = k.dims[pos] + k.dims[size] + BOND
			})
			const end = cursor - BOND
			const parentEnd = n.dims[pos] + n.dims[size]
			if (end !== parentEnd)
				problems.push(
					`${path} kids end at ${end}, row ends at ${parentEnd}`
				)
		}
		kids.forEach((k, i) => walk(k, `${path}/${i}`))
	}
	walk(root, 'root')
	return problems
}

/** Tabs must survive every move and the tree/caches must stay consistent. */
const structureProblems = (root: Node, expectedTabs: string[]): string[] => {
	const problems: string[] = []
	const tabs: string[] = []
	let live = 0
	const walk = (n: Node) => {
		live++
		if (n.next) live++
		if (n.type === 'tab') tabs.push(n.name)
		if (n.type === 'tabset' && n.kids.size() === 0)
			problems.push('empty tabset')
		for (const k of n.kids) {
			if (k.host !== n) problems.push(`${k.type} has wrong host`)
			if (n.type === 'tabset' && k.type !== 'tab')
				problems.push(`tabset contains ${k.type}`)
			walk(k)
		}
	}
	walk(root)
	if (tabs.sort().join() !== [...expectedTabs].sort().join())
		problems.push(`tabs changed: ${tabs.sort().join()}`)
	if (Node.cache.mapDirs.size > live)
		problems.push(
			`mapDirs has ${Node.cache.mapDirs.size} entries for ${live} live nodes`
		)
	return problems
}

const depthOf = (n: Node): number =>
	n.kids.size() ? 1 + Math.max(...[...n.kids].map(depthOf)) : 0

describe('Layout geometry', () => {
	beforeEach(() => {
		new DynamixLayoutCore().clearAllCache()
	})

	it.each([7, 11, 99, 1, 2, 3, 42, 777, 2024, 31337])(
		'keeps tabs and exact tiling after random moves (seed %i)',
		(initialSeed) => {
			const tabNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
			const layout = new DynamixLayoutCore({ tabs: tabNames, bond: BOND })
			layout.updateDimension({ w: 1440, h: 900, x: 0, y: 0 }, true)

			let seed = initialSeed
			const rnd = (n: number) => {
				seed = (seed * 16807) % 2147483647
				return seed % n
			}
			const areas = ['top', 'bottom', 'left', 'right', 'contain'] as const
			const failures: string[] = []
			let maxDepth = 0

			for (let i = 0; i < 400 && failures.length < 5; i++) {
				const nodes = [...Node.cache.mapElem.values()].filter(
					(n): n is Node => n instanceof Node
				)
				const srcs = nodes.filter(
					(n) => n.type === 'tab' || n.type === 'tabset'
				)
				const src = srcs[rnd(srcs.length)]
				// Drop targets the UI can produce: tabs, tabsets and the root.
				const targets = nodes.filter(
					(n) => n.type !== 'row' || n === DynamixLayoutCore._root
				)
				const des = targets[rnd(targets.length)]
				if (!src || !des) continue

				const area = areas[rnd(areas.length)]
				let ok: boolean
				try {
					ok = layout.updateTree(src.unId, des.unId, area)
				} catch (e) {
					failures.push(
						`move ${i} (${src.type} -> ${des.type} ${area}) threw: ${(e as Error).message}`
					)
					break
				}
				if (!ok) continue

				layout.updateDimension({ w: 1440, h: 900, x: 0, y: 0 }, true)
				maxDepth = Math.max(maxDepth, depthOf(DynamixLayoutCore._root))
				const p = [
					...structureProblems(DynamixLayoutCore._root, tabNames),
					...geometryProblems(DynamixLayoutCore._root),
				]
				if (p.length)
					failures.push(
						`move ${i} (${src.type} -> ${des.type} ${area}), depth ${depthOf(DynamixLayoutCore._root)}: ${p.slice(0, 3).join('; ')}`
					)
			}

			expect(maxDepth).toBeGreaterThan(3)
			expect(failures).toEqual([])
		}
	)

	it('moves every edge smoothly while the container resizes', () => {
		// Shape of the React demo: a three-column row (the last column split in
		// two) above a terminal, with uneven parts left behind by slider drags.
		const tabset = (name: string, part: number): LayoutTree => ({
			typNode: 'tabset',
			nodName: '',
			uidNode: `ts-${name}`,
			nodPart: part,
			nodOpen: name,
			nodKids: [
				{
					typNode: 'tab',
					nodName: name,
					uidNode: `tab-${name}`,
					nodPart: 100,
				},
			],
		})
		const row = (
			uid: string,
			part: number,
			kids: LayoutTree[]
		): LayoutTree => ({
			typNode: 'row',
			nodName: '',
			uidNode: uid,
			nodPart: part,
			nodKids: kids,
		})
		const layout = new DynamixLayoutCore({
			tree: row('dynamix-layout-root', 100, [
				row('main', 95.14, [
					row('columns', 253.64, [
						tabset('ts', 95.68),
						tabset('preview', 102.47),
						row('side', 101.85, [
							tabset('css', 100),
							tabset('html', 100),
						]),
					]),
					tabset('terminal', 97.76),
				]),
			]),
			bond: BOND,
		})

		let backward = 0
		let maxJump = 0
		let last: number[] | null = null

		for (let w = 600; w <= 2560; w++) {
			layout.updateDimension({ w, h: 900, x: 0, y: 0 }, true)
			const edges: number[] = []
			for (const [, o] of Node.cache.nodOpts.get())
				edges.push(o.nodDims.x, o.nodDims.x + o.nodDims.w)
			if (last)
				edges.forEach((e, i) => {
					const d = e - last![i]
					if (d < 0) backward++
					maxJump = Math.max(maxJump, Math.abs(d))
				})
			last = edges
		}

		expect(backward).toBe(0)
		expect(maxJump).toBeLessThanOrEqual(1)
	})

	it('does not move unrelated panels while dragging a splitter', () => {
		const layout = new DynamixLayoutCore({
			tree: {
				typNode: 'row',
				nodName: 'dynamix-layout-root',
				uidNode: 'dynamix-layout-root',
				nodPart: 100,
				nodKids: ['a', 'b', 'c'].map((name) => ({
					typNode: 'tabset' as const,
					nodName: '',
					uidNode: `ts-${name}`,
					nodPart: 100,
					nodOpen: name,
					nodKids: [
						{
							typNode: 'tab' as const,
							nodName: name,
							uidNode: `tab-${name}`,
							nodPart: 100,
						},
					],
				})),
			},
			bond: BOND,
		})
		layout.updateDimension({ w: 1440, h: 900, x: 0, y: 0 }, true)

		const first = Node.cache.mapElem.get('ts-a') as Node
		const third = Node.cache.mapElem.get('ts-c') as Node
		const bondId = first.next!.unId
		const before = { ...third.dims }

		// Real pointers report fractional coordinates on HiDPI screens.
		for (let i = 0; i < 400; i++) {
			const x = first.next!.dims.x + Math.sin(i / 7) * 150 + 0.37
			layout.updateSliderDimension(bondId, { x, y: 0 })
			expect(third.dims).toEqual(before)
		}
	})

	it('keeps all tabs when the only tabset is dropped on a root edge', () => {
		const tabNames = ['a', 'b', 'c']
		const layout = new DynamixLayoutCore({ tabs: tabNames, bond: BOND })
		layout.updateDimension({ w: 1200, h: 800, x: 0, y: 0 }, true)

		// Gather every tab into one tabset.
		const tabsets = () =>
			[...Node.cache.mapElem.values()].filter(
				(n): n is Node => n instanceof Node && n.type === 'tabset'
			)
		while (tabsets().length > 1) {
			const [target, source] = tabsets()
			const tab = source.kids.peek()!
			expect(layout.updateTree(tab.unId, target.unId, 'contain')).toBe(
				true
			)
		}

		const only = tabsets()[0]
		for (const area of ['top', 'bottom', 'left', 'right'] as const) {
			expect(
				layout.updateTree(only.unId, DynamixLayoutCore._root.unId, area)
			).toBe(false)
		}
		expect(structureProblems(DynamixLayoutCore._root, tabNames)).toEqual([])
	})

	it('does not reuse the tree of a previously created layout', () => {
		new DynamixLayoutCore({
			tree: {
				typNode: 'row',
				nodName: 'dynamix-layout-root',
				uidNode: 'dynamix-layout-root',
				nodPart: 100,
				nodKids: [
					{
						typNode: 'tabset',
						nodName: '',
						uidNode: 'ts-old',
						nodPart: 100,
						nodOpen: 'old',
						nodKids: [
							{
								typNode: 'tab',
								nodName: 'old',
								uidNode: 'tab-old',
								nodPart: 100,
							},
						],
					},
				],
			},
		})

		new DynamixLayoutCore({ tabs: ['x', 'y'] })

		expect(structureProblems(DynamixLayoutCore._root, ['x', 'y'])).toEqual(
			[]
		)
	})
})
