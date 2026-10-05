import { describe, it, expect } from 'vitest'
import { DEFAULT_GEOMETRY } from '../../src/geometry/config'
import { computeLayoutRects } from '../../src/geometry/compute-rects'
import {
	getSplitterBounds,
	resizeSplitterWeights,
} from '../../src/geometry/splitter'
import {
	getTabBarPlacement,
	getTabContentRect,
} from '../../src/geometry/tab-bar'
import { createIdGenerator } from '../../src/ids'
import { buildDefaultTree } from '../../src/tree/build'
import { fold } from '../../src/tree/view-state'
import type { LayoutModel, Rect } from '../../src/model/types'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Observation } from '../characterization/scenario'
import { observeV2 } from '../characterization/v2-observe'

const TABS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
const model = (n: number): LayoutModel => ({
	root: buildDefaultTree(TABS.slice(0, n), createIdGenerator().createId),
	maximizedTabsetId: null,
	lastActiveTabsetId: null,
	foldOrder: [],
})
const box = (width: number, height: number): Rect => ({
	x: 0,
	y: 0,
	width,
	height,
})
const observe = (m: LayoutModel, width: number, height: number) =>
	observeV2(
		m,
		computeLayoutRects(
			m.root,
			box(width, height),
			DEFAULT_GEOMETRY,
			m.maximizedTabsetId
		)
	)

describe('computeLayoutRects matches v1', () => {
	// Default layouts of 1–9 tabs at five sizes, recorded from the v1 engine.
	// Splitter drags, folds and maximize are covered by the scenario replay.
	const layouts = JSON.parse(
		readFileSync(
			resolve(__dirname, '../fixtures/v1/default-layouts.json'),
			'utf8'
		)
	) as {
		tabs: string[]
		container: { width: number; height: number }
		observation: Observation
	}[]

	it.each(
		layouts.map(
			(l) =>
				[
					l.tabs.length,
					l.container.width,
					l.container.height,
					l,
				] as const
		)
	)('%i tabs at %ix%i', (_, width, height, layout) => {
		expect(observe(model(layout.tabs.length), width, height)).toEqual(
			layout.observation
		)
	})
})

describe('geometry details', () => {
	it('reuses unchanged rect objects', () => {
		const m = model(3)
		const first = computeLayoutRects(
			m.root,
			box(1000, 600),
			DEFAULT_GEOMETRY,
			null
		)
		const same = computeLayoutRects(
			m.root,
			box(1000, 600),
			DEFAULT_GEOMETRY,
			null,
			first
		)
		expect(same.tabsets.get('ts-a')).toBe(first.tabsets.get('ts-a'))
		const taller = computeLayoutRects(
			m.root,
			box(1000, 700),
			DEFAULT_GEOMETRY,
			null,
			first
		)
		expect(taller.tabsets.get('ts-a')).not.toBe(first.tabsets.get('ts-a'))
	})

	it('offsets everything by the container origin (padding)', () => {
		const m = model(2)
		const rects = computeLayoutRects(
			m.root,
			{ x: 8, y: 12, width: 400, height: 300 },
			DEFAULT_GEOMETRY,
			null
		)
		expect(rects.tabsets.get('ts-a')).toEqual({
			x: 8,
			y: 12,
			width: 195,
			height: 300,
		})
	})

	it('reports splitter bounds and refuses locked splitters', () => {
		const m = model(2)
		const rects = computeLayoutRects(
			m.root,
			box(410, 300),
			DEFAULT_GEOMETRY,
			null
		)
		expect(
			getSplitterBounds(m.root, rects, DEFAULT_GEOMETRY, 'ts-a~ts-b')
		).toEqual({ value: 200, min: 40, max: 360 })
		const folded = fold(m, 'ts-a')!
		expect(
			resizeSplitterWeights(
				folded.root,
				rects,
				DEFAULT_GEOMETRY,
				'ts-a~ts-b',
				{ x: 100, y: 0 }
			)
		).toBeNull()
		expect(
			resizeSplitterWeights(m.root, rects, DEFAULT_GEOMETRY, 'nope', {
				x: 100,
				y: 0,
			})
		).toBeNull()
	})

	it('places tab bars, rotating folded strips in side-by-side rows', () => {
		const rect = { x: 10, y: 20, width: 40, height: 500 }
		expect(
			getTabBarPlacement(
				rect,
				{ isFolded: true, parentDirection: 'horizontal' },
				40
			)
		).toEqual({
			rect: { x: 50, y: 20, width: 500, height: 40 },
			isRotated: true,
		})
		expect(
			getTabBarPlacement(
				rect,
				{ isFolded: true, parentDirection: 'vertical' },
				40
			).isRotated
		).toBe(false)
		expect(
			getTabContentRect({ x: 0, y: 0, width: 100, height: 30 }, 40)
		).toEqual({ x: 0, y: 40, width: 100, height: 0 })
	})
})
