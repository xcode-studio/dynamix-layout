import { describe, it, expect } from 'vitest'
import { DynamixLayoutError, type LayoutWarning } from '../../src/errors'
import { DEFAULT_GEOMETRY } from '../../src/geometry/config'
import { computeLayoutRects } from '../../src/geometry/compute-rects'
import { createIdGenerator } from '../../src/ids'
import { layoutFromJSON } from '../../src/serialize/from-json'
import { isLayoutV1, migrateLayoutFromV1 } from '../../src/serialize/migrate-v1'
import { parseLayout } from '../../src/serialize/parse'
import type { LayoutJSON, LayoutTreeV1 } from '../../src/serialize/schema'
import { toLayoutJSON } from '../../src/serialize/to-json'
import { buildDefaultTree } from '../../src/tree/build'
import { fold } from '../../src/tree/view-state'
import type { LayoutModel } from '../../src/model/types'
import {
	hasFoldedRow,
	hasZeroWeightRow,
	loadScenarios,
	overflows,
	savedStates,
} from '../characterization/fixtures'
import { observeV2 } from '../characterization/v2-observe'

const ignore = () => {}
const collect = () => {
	const warnings: LayoutWarning[] = []
	return { warnings, onWarning: (w: LayoutWarning) => warnings.push(w) }
}
const v1Tab = (name: string): LayoutTreeV1 => ({
	typNode: 'tab',
	nodName: name,
	uidNode: `u-${name}`,
	nodPart: 100,
})
const v1Tabset = (
	id: string,
	tabs: string[],
	extra: Partial<LayoutTreeV1> = {}
): LayoutTreeV1 => ({
	typNode: 'tabset',
	nodName: '',
	uidNode: id,
	nodPart: 100,
	nodOpen: tabs[0],
	nodKids: tabs.map(v1Tab),
	...extra,
})
const v1Row = (
	id: string,
	kids: LayoutTreeV1[],
	extra: Partial<LayoutTreeV1> = {}
): LayoutTreeV1 => ({
	typNode: 'row',
	nodName: '',
	uidNode: id,
	nodPart: 100,
	nodKids: kids,
	...extra,
})

describe('toLayoutJSON / layoutFromJSON', () => {
	it('round-trips a model, including fold and maximize', () => {
		const model: LayoutModel = {
			root: buildDefaultTree(
				['a', 'b', 'c'],
				createIdGenerator().createId
			),
			maximizedTabsetId: null,
			lastActiveTabsetId: null,
			foldOrder: [],
		}
		const folded = { ...fold(model, 'ts-a')!, maximizedTabsetId: 'ts-b' }
		const json = toLayoutJSON(folded)
		expect(json.version).toBe(2)
		expect(json.maximizedTabsetId).toBe('ts-b')
		expect(json.root.children[0]).toEqual({
			type: 'tabset',
			id: 'ts-a',
			weight: 100,
			activeTabId: 'a',
			isFolded: true,
			children: [{ type: 'tab', id: 'a' }],
		})
		const back = layoutFromJSON(json, ignore)
		expect(back.root).toEqual(folded.root)
		expect(back.maximizedTabsetId).toBe('ts-b')
	})

	it('throws with a path for malformed input', () => {
		const bad = {
			version: 2,
			root: {
				type: 'row',
				id: 'r',
				weight: 1,
				direction: 'horizontal',
				children: [
					{
						type: 'tabset',
						id: 't',
						weight: 1,
						children: [{ type: 'tab' }],
					},
				],
			},
		}
		expect(() => parseLayout(bad, ignore)).toThrowError(
			/at root\.children\[0\]\.children\[0\]/
		)
		try {
			parseLayout({ version: 3, root: {} }, ignore)
		} catch (error) {
			expect(error).toBeInstanceOf(DynamixLayoutError)
			expect((error as DynamixLayoutError).code).toBe(
				'UNSUPPORTED_VERSION'
			)
		}
		expect(() => parseLayout('nope', ignore)).toThrow(DynamixLayoutError)
		expect(() =>
			parseLayout(
				{
					version: 2,
					root: {
						type: 'row',
						id: 'r',
						weight: 1,
						direction: 'diagonal',
						children: [],
					},
				},
				ignore
			)
		).toThrowError(/root\.direction/)
	})

	it('repairs weights, active tabs and duplicate tabs with warnings', () => {
		const { warnings, onWarning } = collect()
		const json = {
			version: 2,
			root: {
				type: 'row',
				id: 'r',
				weight: 100,
				direction: 'horizontal',
				children: [
					{
						type: 'tabset',
						id: 't1',
						weight: -5,
						activeTabId: 'zz',
						children: [{ type: 'tab', id: 'a' }],
					},
					{
						type: 'tabset',
						id: 't2',
						weight: 100,
						children: [
							{ type: 'tab', id: 'a' },
							{ type: 'tab', id: 'b' },
						],
					},
				],
			},
		} as unknown as LayoutJSON
		const { root } = layoutFromJSON(json, onWarning)
		expect(warnings.map((w) => w.code).sort()).toEqual([
			'DUPLICATE_TAB_ID',
			'INVALID_ACTIVE_TAB',
			'INVALID_WEIGHT',
		])
		expect(
			toLayoutJSON({ root, maximizedTabsetId: null }).root.children
		).toEqual([
			{
				type: 'tabset',
				id: 't1',
				weight: 100,
				activeTabId: 'a',
				children: [{ type: 'tab', id: 'a' }],
			},
			{
				type: 'tabset',
				id: 't2',
				weight: 100,
				activeTabId: 'b',
				children: [{ type: 'tab', id: 'b' }],
			},
		])
	})
})

describe('migrateLayoutFromV1', () => {
	it('detects v1 layouts', () => {
		expect(isLayoutV1(v1Row('root', []))).toBe(true)
		expect(isLayoutV1({ version: 2, root: {} })).toBe(false)
		expect(isLayoutV1(null)).toBe(false)
	})

	it('maps names, weights, directions and view state', () => {
		const tree = v1Row(
			'dynamix-layout-root',
			[
				v1Tabset('t1', ['editor', 'notes'], {
					nodPart: 63.5,
					nodOpen: 'notes',
					nodFold: true,
				}),
				v1Row(
					'r1',
					[v1Tabset('t2', ['terminal']), v1Tabset('t3', ['preview'])],
					{ nodPart: 136.5 }
				),
			],
			{ nodMaxd: 't3' }
		)
		expect(migrateLayoutFromV1(tree)).toEqual({
			version: 2,
			maximizedTabsetId: 't3',
			root: {
				type: 'row',
				id: 'dynamix-layout-root',
				weight: 100,
				direction: 'horizontal',
				children: [
					{
						type: 'tabset',
						id: 't1',
						weight: 63.5,
						activeTabId: 'notes',
						isFolded: true,
						children: [
							{ type: 'tab', id: 'editor' },
							{ type: 'tab', id: 'notes' },
						],
					},
					{
						type: 'row',
						id: 'r1',
						weight: 136.5,
						direction: 'vertical',
						children: [
							{
								type: 'tabset',
								id: 't2',
								weight: 100,
								activeTabId: 'terminal',
								children: [{ type: 'tab', id: 'terminal' }],
							},
							{
								type: 'tabset',
								id: 't3',
								weight: 100,
								activeTabId: 'preview',
								children: [{ type: 'tab', id: 'preview' }],
							},
						],
					},
				],
			},
		})
	})

	it('flattens a root with a single nested row (v1 B7) into a vertical root', () => {
		const tree = v1Row('root', [
			v1Row('r1', [v1Tabset('t1', ['a']), v1Tabset('t2', ['b'])], {
				nodPart: 77,
			}),
		])
		const json = migrateLayoutFromV1(tree)
		expect(json.root.direction).toBe('vertical')
		expect(json.root.weight).toBe(77)
		expect(json.root.children.map((c) => c.id)).toEqual(['t1', 't2'])
	})

	it('repairs damaged trees', () => {
		const { warnings, onWarning } = collect()
		const tree = v1Row(
			'root',
			[
				v1Tabset('t1', ['a', 'b'], {
					nodOpen: 'missing',
					nodPart: NaN,
				}),
				v1Tabset('t2', ['a']),
				v1Tabset('empty', []),
				v1Row('emptyRow', []),
				v1Tab('stray'),
				{ typNode: 'bond', nodName: '', uidNode: 'b', nodPart: 0 },
			],
			{ nodMaxd: 'gone' }
		)
		const json = migrateLayoutFromV1(tree, { onWarning })
		expect(json.maximizedTabsetId).toBeUndefined()
		expect(json.root.children).toEqual([
			{
				type: 'tabset',
				id: 't1',
				weight: 100,
				activeTabId: 'a',
				children: [
					{ type: 'tab', id: 'a' },
					{ type: 'tab', id: 'b' },
				],
			},
			{
				type: 'tabset',
				id: 'ts-stray',
				weight: 100,
				activeTabId: 'stray',
				children: [{ type: 'tab', id: 'stray' }],
			},
		])
		expect(warnings.map((w) => w.code)).toEqual([
			'INVALID_ACTIVE_TAB',
			'INVALID_WEIGHT',
			'DUPLICATE_TAB_ID',
		])
	})

	it('wraps a tabset root and rejects non-layouts', () => {
		expect(
			migrateLayoutFromV1(v1Tabset('t', ['a'])).root.children[0].id
		).toBe('t')
		expect(() =>
			migrateLayoutFromV1({
				typNode: 'tab',
				nodName: 'a',
				uidNode: 'x',
				nodPart: 1,
			})
		).toThrow(DynamixLayoutError)
		expect(() => migrateLayoutFromV1({} as LayoutTreeV1)).toThrow(
			DynamixLayoutError
		)
	})

	it('parseLayout migrates v1 with a warning', () => {
		const { warnings, onWarning } = collect()
		parseLayout(v1Row('root', [v1Tabset('t', ['a'])]), onWarning)
		expect(warnings[0].code).toBe('MIGRATED_FROM_V1')
	})
})

describe('every saved v1 layout in the fixtures', () => {
	const scenarios = loadScenarios()
	it.each(scenarios.map((s) => [s.name, s] as const))(
		'%s renders identically after migration',
		(_, scenario) => {
			let compared = 0
			for (const state of savedStates(scenario)) {
				const model = parseLayout(state.saved, ignore)
				const rects = computeLayoutRects(
					model.root,
					{ x: 0, y: 0, ...state.container },
					DEFAULT_GEOMETRY,
					model.maximizedTabsetId
				)
				const observed = observeV2(
					{ ...model, lastActiveTabsetId: null, foldOrder: [] },
					rects
				)
				if (
					overflows(state.observation, state.container) ||
					hasFoldedRow(state.saved) ||
					hasZeroWeightRow(state.saved)
				) {
					expect(observed.tree, state.label).toEqual(
						state.observation.tree
					)
				} else {
					expect(observed, state.label).toEqual(state.observation)
					compared++
				}
			}
			expect(compared).toBeGreaterThan(0)
		}
	)
})
