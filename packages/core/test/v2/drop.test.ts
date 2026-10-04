import { describe, it, expect } from 'vitest'
import {
	getNavbarDropPreview,
	getRootSplitPreview,
	getTabsetDropPreview,
} from '../../src'
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
const domRect = (r: Rect) => ({
	left: r.x,
	top: r.y,
	width: r.width,
	height: r.height,
	right: r.x + r.width,
	bottom: r.y + r.height,
})
const fromPreview = (p: {
	left: number
	top: number
	width: number
	height: number
}): Rect => ({ x: p.left, y: p.top, width: p.width, height: p.height })

describe('matches v1 drop previews', () => {
	it('tabset thirds and indicator rects', () => {
		const m = model(['a', 'b'])
		const rects = computeLayoutRects(m.root, box, DEFAULT_GEOMETRY, null)
		const rect = rects.tabsets.get('ts-b')!
		let seed = 3
		const random = (n: number) => (seed = (seed * 16807) % 2147483647) % n
		for (let i = 0; i < 300; i++) {
			const point = {
				x: rect.x + random(rect.width),
				y: rect.y + 10 + random(rect.height - 20),
			}
			const v1 = getTabsetDropPreview(domRect(rect), point.x, point.y)
			const position = getTabsetDropPosition(rect, point)
			expect(position).toBe(v1.area === 'contain' ? 'center' : v1.area)
			const target = {
				type: 'tabset',
				tabsetId: 'ts-b',
				position,
			} as const
			expect(getDropIndicatorRect(m, rects, target)).toEqual(
				fromPreview(v1)
			)
		}
	})

	it('root halves', () => {
		const m = model(['a', 'b'])
		const rects = computeLayoutRects(m.root, box, DEFAULT_GEOMETRY, null)
		for (const side of ['left', 'right', 'top', 'bottom'] as const) {
			const v1 = getRootSplitPreview(
				{ x: 0, y: 0, w: 1210, h: 800 },
				side
			)
			expect(
				getDropIndicatorRect(m, rects, { type: 'root', position: side })
			).toEqual(fromPreview(v1))
		}
	})

	it('tab bar insertion side', () => {
		const m: LayoutModel = {
			...model(['a', 'b']),
			root: {
				...model(['a', 'b']).root,
				children: [
					{
						type: 'tabset',
						id: 'ts-a',
						weight: 100,
						activeTabId: 'a',
						isFolded: false,
						children: ['a', 'x', 'y'].map((id) => ({
							type: 'tab' as const,
							id,
						})),
					},
					{
						type: 'tabset',
						id: 'ts-b',
						weight: 100,
						activeTabId: 'b',
						isFolded: false,
						children: [{ type: 'tab', id: 'b' }],
					},
				],
			},
		}
		const rects = computeLayoutRects(m.root, box, DEFAULT_GEOMETRY, null)
		const tabs = ['a', 'x', 'y'].map((id, i) => ({
			id,
			rect: { x: 8 + i * 70, y: 4, width: 64, height: 32 },
		}))
		const bar = {
			rect: { x: 0, y: 0, width: 600, height: 40 },
			tabs: tabs.map((t) => ({ ...t, id: t.id === 'a' ? 'a' : t.id })),
		}
		const measurements: DropMeasurements = {
			tabBars: new Map([['ts-a', bar]]),
		}
		for (let x = 0; x < 300; x += 7) {
			const v1 = getNavbarDropPreview(
				domRect(bar.rect),
				tabs.map((t) => domRect(t.rect)),
				x,
				20
			)!
			const target = getDropTarget(
				m,
				rects,
				{ x, y: 20 },
				{ type: 'tab', tabId: 'b' },
				measurements
			)
			expect(target).toEqual({
				type: 'tab',
				tabId: tabs[v1.index].id,
				position: v1.area === 'left' ? 'before' : 'after',
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
