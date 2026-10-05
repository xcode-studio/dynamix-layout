import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEFAULT_GEOMETRY } from '../../src/geometry/config'
import { computeLayoutRects } from '../../src/geometry/compute-rects'
import { getDropIndicatorRect } from '../../src/drop/drop-indicator'
import {
	getDropTarget,
	getRootDropZoneRect,
	getTabsetDropPosition,
	type DropMeasurements,
} from '../../src/drop/drop-target'
import { listDropTargets } from '../../src/drop/drop-targets'
import { createIdGenerator } from '../../src/ids'
import { buildDefaultTree } from '../../src/tree/build'
import { fold, maximize } from '../../src/tree/view-state'
import type { LayoutModel, Rect } from '../../src/model/types'

const model = (tabs: string[]): LayoutModel => ({
	root: buildDefaultTree(tabs, createIdGenerator().createId),
	maximizedTabsetId: null,
	lastActiveTabsetId: null,
	foldOrder: [],
})
const box: Rect = { x: 0, y: 0, width: 1210, height: 800 }
type Preview = {
	area: string
	left: number
	top: number
	width: number
	height: number
}
const fromPreview = (p: {
	left: number
	top: number
	width: number
	height: number
}): Rect => ({ x: p.left, y: p.top, width: p.width, height: p.height })

describe('matches v1 drop previews', () => {
	// Recorded from the v1 preview helpers before they were removed.
	const recorded = JSON.parse(
		readFileSync(
			resolve(__dirname, '../fixtures/v1/drop-previews.json'),
			'utf8'
		)
	) as {
		tabset: { point: { x: number; y: number }; preview: Preview }[]
		root: { side: 'left' | 'right' | 'top' | 'bottom'; preview: Preview }[]
		navbar: { x: number; index: number; area: 'left' | 'right' }[]
	}

	it('tabset thirds and indicator rects', () => {
		const m = model(['a', 'b'])
		const rects = computeLayoutRects(m.root, box, DEFAULT_GEOMETRY, null)
		const rect = rects.tabsets.get('ts-b')!
		for (const { point, preview } of recorded.tabset) {
			const position = getTabsetDropPosition(rect, point)
			expect(position).toBe(
				preview.area === 'contain' ? 'center' : preview.area
			)
			const target = {
				type: 'tabset',
				tabsetId: 'ts-b',
				position,
			} as const
			expect(getDropIndicatorRect(m, rects, target)).toEqual(
				fromPreview(preview)
			)
		}
	})

	it('root halves', () => {
		const m = model(['a', 'b'])
		const rects = computeLayoutRects(m.root, box, DEFAULT_GEOMETRY, null)
		for (const { side, preview } of recorded.root) {
			expect(
				getDropIndicatorRect(m, rects, { type: 'root', position: side })
			).toEqual(fromPreview(preview))
		}
	})

	it('tab bar insertion side', () => {
		const tabsetOf = (id: string, tabIds: string[]) => ({
			type: 'tabset' as const,
			id,
			weight: 100,
			activeTabId: tabIds[0],
			isFolded: false,
			children: tabIds.map((tabId) => ({
				type: 'tab' as const,
				id: tabId,
			})),
		})
		const base = model(['a', 'b'])
		const m: LayoutModel = {
			...base,
			root: {
				...base.root,
				children: [
					tabsetOf('ts-a', ['a', 'x', 'y']),
					tabsetOf('ts-b', ['b']),
				],
			},
		}
		const rects = computeLayoutRects(m.root, box, DEFAULT_GEOMETRY, null)
		const tabs = ['a', 'x', 'y'].map((id, i) => ({
			id,
			rect: { x: 8 + i * 70, y: 4, width: 64, height: 32 },
		}))
		const measurements: DropMeasurements = {
			tabBars: new Map([
				[
					'ts-a',
					{ rect: { x: 0, y: 0, width: 600, height: 40 }, tabs },
				],
			]),
		}
		for (const { x, index, area } of recorded.navbar) {
			const target = getDropTarget(
				m,
				rects,
				{ x, y: 20 },
				{ type: 'tab', tabId: 'b' },
				measurements
			)
			expect(target).toEqual({
				type: 'tab',
				tabId: tabs[index].id,
				position: area === 'left' ? 'before' : 'after',
			})
		}
	})
})

describe('getDropTarget', () => {
	const m = model(['a', 'b', 'c'])
	const rects = computeLayoutRects(m.root, box, DEFAULT_GEOMETRY, null)

	it('prefers root zones over tabsets', () => {
		const zone = getRootDropZoneRect(rects.container, 'left')
		expect(zone).toEqual({ x: 0, y: 300, width: 8, height: 200 })
		expect(
			getDropTarget(
				m,
				rects,
				{ x: 2, y: 400 },
				{ type: 'tab', tabId: 'c' }
			)
		).toEqual({ type: 'root', position: 'left' })
		expect(
			getDropTarget(
				m,
				rects,
				{ x: 2, y: 100 },
				{ type: 'tab', tabId: 'c' }
			)
		).toEqual({ type: 'tabset', tabsetId: 'ts-a', position: 'left' })
	})

	it('returns null for invalid targets and splitters', () => {
		const single = model(['a'])
		const singleRects = computeLayoutRects(
			single.root,
			box,
			DEFAULT_GEOMETRY,
			null
		)
		expect(
			getDropTarget(
				single,
				singleRects,
				{ x: 600, y: 400 },
				{ type: 'tab', tabId: 'a' }
			)
		).toBeNull()
		const splitter = rects.splitters.get('ts-a~row-1')!
		expect(
			getDropTarget(
				m,
				rects,
				{ x: splitter.x + 5, y: 100 },
				{ type: 'tab', tabId: 'c' }
			)
		).toBeNull()
	})

	it('folded tabsets and rotated bars always mean center', () => {
		const folded = fold(m, 'ts-a')!
		const foldedRects = computeLayoutRects(
			folded.root,
			box,
			DEFAULT_GEOMETRY,
			null
		)
		expect(
			getDropTarget(
				folded,
				foldedRects,
				{ x: 5, y: 100 },
				{ type: 'tab', tabId: 'c' }
			)
		).toEqual({ type: 'tabset', tabsetId: 'ts-a', position: 'center' })
		expect(
			getDropIndicatorRect(folded, foldedRects, {
				type: 'tabset',
				tabsetId: 'ts-a',
				position: 'center',
			})
		).toEqual(foldedRects.tabsets.get('ts-a'))
	})

	it('only the maximized tabset is a target while maximized', () => {
		const maxed = maximize(m, 'ts-c')!
		const maxRects = computeLayoutRects(
			maxed.root,
			box,
			DEFAULT_GEOMETRY,
			'ts-c'
		)
		expect(
			getDropTarget(
				maxed,
				maxRects,
				{ x: 600, y: 400 },
				{ type: 'tab', tabId: 'a' }
			)
		).toEqual({ type: 'tabset', tabsetId: 'ts-c', position: 'center' })
	})

	it('lists valid targets in reading order', () => {
		const targets = listDropTargets(m, { type: 'tab', tabId: 'a' })
		expect(targets[0]).toEqual({
			type: 'tabset',
			tabsetId: 'ts-b',
			position: 'center',
		})
		expect(
			targets.some((t) => t.type === 'tabset' && t.tabsetId === 'ts-a')
		).toBe(false)
		expect(targets.slice(-4).map((t) => t.position)).toEqual([
			'left',
			'right',
			'top',
			'bottom',
		])
	})
})
