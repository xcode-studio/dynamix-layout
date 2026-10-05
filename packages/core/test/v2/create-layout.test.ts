import { describe, it, expect, vi } from 'vitest'
import { createLayout } from '../../src/create-layout'
import { DynamixLayoutError } from '../../src/errors'
import type { LayoutOptions } from '../../src/layout-types'

const BOX = { x: 0, y: 0, width: 1210, height: 800 }
const tabs = (...ids: string[]) => ids.map((id) => ({ id }))
const create = (options: Partial<LayoutOptions> = {}) => {
	const layout = createLayout({
		tabs: tabs('a', 'b', 'c'),
		onWarning: () => {},
		...options,
	})
	layout.setContainerRect(BOX)
	return layout
}

describe('instances', () => {
	it('are independent of each other', () => {
		const first = create()
		const second = create({ tabs: tabs('x', 'y') })
		first.moveTab('a', { type: 'root', position: 'bottom' })
		expect(second.toJSON().root.children.map((c) => c.id)).toEqual([
			'ts-x',
			'ts-y',
		])
		expect([...second.getSnapshot().tabs.keys()]).toEqual(['x', 'y'])
		expect(first.getSnapshot().tabs.has('x')).toBe(false)
	})

	it('produce identical output for identical input (SSR-safe ids)', () => {
		expect(JSON.stringify(create().toJSON())).toBe(
			JSON.stringify(create().toJSON())
		)
		expect(create().toJSON().root.children[0].id).toBe('ts-a')
	})

	it('throws on duplicate tab ids in development', () => {
		expect(() => createLayout({ tabs: tabs('a', 'a') })).toThrow(
			DynamixLayoutError
		)
	})

	it('restores a saved layout, v2 or v1, and fills in missing tabs', () => {
		const saved = create()
		saved.moveTab('c', { type: 'root', position: 'top' })
		const restored = create({
			initialLayout: saved.toJSON(),
			tabs: tabs('a', 'b', 'c', 'd'),
		})
		expect(restored.getSnapshot().tabs.get('d')!.tabsetId).toBe(
			restored.getSnapshot().tabs.get('c')!.tabsetId
		)
		expect(restored.getSnapshot().tabs.get('d')!.isActive).toBe(false)
		const v1 = {
			typNode: 'row',
			nodName: 'r',
			uidNode: 'r',
			nodPart: 100,
			nodKids: [
				{
					typNode: 'tabset',
					nodName: '',
					uidNode: 't',
					nodPart: 100,
					nodOpen: 'a',
					nodKids: [
						{
							typNode: 'tab',
							nodName: 'a',
							uidNode: 'u',
							nodPart: 100,
						},
					],
				},
			],
		} as const
		const fromV1 = create({ initialLayout: v1, tabs: tabs('a') })
		expect(fromV1.toJSON().root.children[0]).toMatchObject({
			id: 't',
			activeTabId: 'a',
		})
	})
})

describe('snapshots', () => {
	it('share unchanged parts by reference', () => {
		const layout = create()
		const before = layout.getSnapshot()
		layout.setContainerRect({ ...BOX, width: 1300 })
		const resized = layout.getSnapshot()
		expect(resized).not.toBe(before)
		expect(resized.tabsets).toBe(before.tabsets)
		expect(resized.root).toBe(before.root)
		expect(resized.rects).not.toBe(before.rects)

		layout.selectTab('b')
		const selected = layout.getSnapshot()
		expect(selected.tabsets.get('ts-a')).toBe(resized.tabsets.get('ts-a'))
		layout.setContainerRect({ ...BOX, width: 1300 })
		expect(layout.getSnapshot()).toBe(selected)
	})

	it('are frozen in development', () => {
		const snapshot = create().getSnapshot()
		expect(Object.isFrozen(snapshot)).toBe(true)
		expect(Object.isFrozen(snapshot.tabsets.get('ts-a'))).toBe(true)
	})

	it('notify subscribers until they unsubscribe', () => {
		const layout = create()
		const listener = vi.fn()
		const unsubscribe = layout.subscribe(listener)
		layout.fold('ts-a')
		expect(listener).toHaveBeenCalledWith(layout.getSnapshot())
		unsubscribe()
		layout.unfold('ts-a')
		expect(listener).toHaveBeenCalledTimes(1)
	})
})

describe('onLayoutChange', () => {
	it('reports committed changes with a reason and v2 JSON', () => {
		const onLayoutChange = vi.fn()
		const layout = create({ onLayoutChange })
		expect(onLayoutChange).not.toHaveBeenCalled()
		layout.selectTab('b')
		layout.moveTab('a', {
			type: 'tabset',
			tabsetId: 'ts-b',
			position: 'center',
		})
		layout.moveSplitterBy([...layout.getSnapshot().splitters.keys()][0], 30)
		layout.toggleMaximize('ts-b')
		layout.fold('ts-c')
		layout.addTab({ id: 'd' })
		expect(onLayoutChange.mock.calls.map(([, reason]) => reason)).toEqual([
			'select',
			'move',
			'resize',
			'maximize',
			'fold',
			'tabs',
		])
		expect(onLayoutChange.mock.calls[0][0].version).toBe(2)
	})

	it('is not called for resizes, refused actions or load', () => {
		const onLayoutChange = vi.fn()
		const layout = create({ onLayoutChange })
		layout.setContainerRect({ ...BOX, width: 900 })
		expect(
			layout.moveTab('a', { type: 'tab', tabId: 'a', position: 'after' })
		).toBe(false)
		layout.load(create().toJSON())
		expect(onLayoutChange).not.toHaveBeenCalled()
	})

	it('keeps returning the same JSON object until the layout changes', () => {
		const layout = create()
		const json = layout.toJSON()
		layout.setContainerRect({ ...BOX, width: 900 })
		expect(layout.toJSON()).toBe(json)
		layout.selectTab('b')
		expect(layout.toJSON()).not.toBe(json)
	})
})

describe('drags', () => {
	it('moves a tab on endDrag with one change, showing the target meanwhile', () => {
		const onLayoutChange = vi.fn()
		const layout = create({ onLayoutChange })
		layout.startDrag({ type: 'tab', tabId: 'c' })
		layout.updateDrag({ x: 100, y: 400 })
		const drag = layout.getSnapshot().drag!
		expect(drag.target).toEqual({
			type: 'tabset',
			tabsetId: 'ts-a',
			position: 'left',
		})
		expect(drag.indicator).toEqual({ x: 0, y: 0, width: 300, height: 800 })
		layout.updateDrag({ x: 101, y: 401 })
		expect(layout.getSnapshot().drag).toBe(drag)
		expect(layout.endDrag()).toBe(true)
		expect(layout.getSnapshot().drag).toBeNull()
		expect(onLayoutChange).toHaveBeenCalledTimes(1)
		expect(layout.getSnapshot().tabs.get('c')!.tabsetId).not.toBe('ts-c')
	})

	it('leaves maximized mode when a tab drag starts', () => {
		const layout = create()
		layout.maximize('ts-b')
		layout.startDrag({ type: 'tab', tabId: 'a' })
		expect(layout.getSnapshot().maximizedTabsetId).toBeNull()
		layout.cancelDrag()
	})

	it('drags a splitter transiently, commits once, and can cancel', () => {
		const onLayoutChange = vi.fn()
		const layout = create({ onLayoutChange })
		const [id] = layout.getSnapshot().splitters.keys()
		const start = layout.getSnapshot().rects.tabsets.get('ts-a')!
		layout.startDrag({ type: 'splitter', splitterId: id })
		layout.updateDrag({ x: 400, y: 0 })
		layout.updateDrag({ x: 500, y: 0 })
		expect(layout.getSnapshot().rects.tabsets.get('ts-a')!.width).toBe(495)
		expect(onLayoutChange).not.toHaveBeenCalled()
		layout.cancelDrag()
		expect(layout.getSnapshot().rects.tabsets.get('ts-a')).toEqual(start)

		layout.startDrag({ type: 'splitter', splitterId: id })
		layout.updateDrag({ x: 300, y: 0 })
		expect(layout.endDrag()).toBe(true)
		expect(onLayoutChange).toHaveBeenCalledTimes(1)
		expect(onLayoutChange.mock.calls[0][1]).toBe('resize')
	})

	it('refuses to drag locked splitters', () => {
		const layout = create()
		layout.fold('ts-a')
		const [id] = layout.getSnapshot().splitters.keys()
		expect(layout.getSnapshot().splitters.get(id)!.isLocked).toBe(true)
		expect(layout.startDrag({ type: 'splitter', splitterId: id })).toBe(
			false
		)
	})

	it('reports splitter bounds for ARIA', () => {
		const layout = create()
		const [id] = layout.getSnapshot().splitters.keys()
		expect(layout.getSplitterBounds(id)).toEqual({
			value: 600,
			min: 40,
			max: 1160,
		})
	})
})

describe('tabs, reset and destroy', () => {
	it('setTabs adds, activates and removes tabs', () => {
		const layout = create()
		layout.selectTab('b')
		layout.setTabs(tabs('a', 'b', 'd'))
		const snapshot = layout.getSnapshot()
		expect(snapshot.tabs.has('c')).toBe(false)
		expect(snapshot.tabs.get('d')).toMatchObject({
			tabsetId: 'ts-b',
			isActive: true,
		})
	})

	it('reset returns to the initial layout', () => {
		const layout = create()
		const initial = layout.toJSON()
		layout.moveTab('a', { type: 'root', position: 'bottom' })
		layout.reset()
		expect(layout.toJSON()).toEqual(initial)
	})

	it('ignores everything after destroy', () => {
		const warnings: string[] = []
		const layout = create({ onWarning: (w) => warnings.push(w.code) })
		const listener = vi.fn()
		layout.subscribe(listener)
		layout.destroy()
		expect(layout.moveTab('a', { type: 'root', position: 'bottom' })).toBe(
			false
		)
		expect(listener).not.toHaveBeenCalled()
		expect(warnings).toContain('DESTROYED')
	})

	it('warns about unknown ids instead of throwing', () => {
		const warnings: string[] = []
		const layout = create({ onWarning: (w) => warnings.push(w.code) })
		expect(layout.selectTab('nope')).toBe(false)
		expect(layout.toggleFold('nope')).toBe(false)
		expect(warnings).toEqual(['UNKNOWN_ID', 'UNKNOWN_ID'])
	})
})
