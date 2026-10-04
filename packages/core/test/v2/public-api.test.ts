import { afterEach, describe, it, expect, vi } from 'vitest'
import * as api from '../../src'
import { createLayout, applyRect, version } from '../../src'
import { isRow, isTab, isTabset } from '../../src/model/guards'
import { createIdGenerator } from '../../src/ids'

const BOX = { x: 0, y: 0, width: 1210, height: 800 }
const create = (extra: Partial<Parameters<typeof createLayout>[0]> = {}) => {
	const layout = createLayout({
		tabs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
		onWarning: () => {},
		...extra,
	})
	layout.setContainerRect(BOX)
	return layout
}

describe('public exports', () => {
	it('exposes the v2 API and nothing from v1', () => {
		for (const name of [
			'createLayout',
			'migrateLayoutFromV1',
			'isLayoutV1',
			'DynamixLayoutError',
			'LAYOUT_VERSION',
			'getTabBarPlacement',
			'getTabContentRect',
			'getRootDropZoneRect',
			'applyRect',
			'createFrameScheduler',
			'version',
		])
			expect(api).toHaveProperty(name)
		for (const name of [
			'DynamixLayoutCore',
			'Node',
			'Bond',
			'Queue',
			'createReactiveState',
			'getTabsetDropPreview',
		])
			expect(api).not.toHaveProperty(name)
		expect(typeof version).toBe('string')
	})

	it('has no import-time side effects on window', async () => {
		expect(
			(globalThis as { __DYNAMIX_LAYOUT__?: unknown }).__DYNAMIX_LAYOUT__
		).toBeUndefined()
	})

	it('applyRect positions an element', () => {
		const style: Record<string, string> = {}
		applyRect({ style } as unknown as HTMLElement, {
			x: 1,
			y: 2,
			width: 3,
			height: 4,
		})
		expect(style).toEqual({
			left: '1px',
			top: '2px',
			width: '3px',
			height: '4px',
		})
	})

	it('node guards', () => {
		const tab = { type: 'tab', id: 't' } as const
		expect([isTab(tab), isTabset(tab), isRow(tab)]).toEqual([
			true,
			false,
			false,
		])
	})
})

describe('createLayout options and less common actions', () => {
	afterEach(() => vi.unstubAllEnvs())

	it('uses a custom createId', () => {
		let n = 0
		const layout = create({ createId: (kind) => `${kind}#${++n}` })
		expect([...layout.getSnapshot().tabsets.keys()]).toEqual([
			'tabset#1',
			'tabset#3',
			'tabset#4',
		])
		const ids = createIdGenerator((kind, hint) => `${kind}:${hint ?? 'x'}`)
		expect(ids.createId('tabset', 'q')).toBe('tabset:q')
	})

	it('setOptions resizes without rebuilding', () => {
		const layout = create()
		const root = layout.getSnapshot().root
		layout.setOptions({
			splitterSize: 20,
			minPanelSize: { width: 100, height: 60 },
		})
		expect(layout.getSnapshot().root).toBe(root)
		expect(
			[...layout.getSnapshot().rects.splitters.values()][0].width
		).toBe(20)
	})

	it('moves tabsets, adds tabs at a target, and removes tabs', () => {
		const layout = create()
		expect(
			layout.moveTabset('ts-c', {
				type: 'tab',
				tabId: 'a',
				position: 'after',
			})
		).toBe(true)
		expect(layout.getSnapshot().tabsets.get('ts-a')!.tabIds).toEqual([
			'a',
			'c',
		])
		expect(
			layout.addTab({ id: 'd' }, { type: 'root', position: 'bottom' })
		).toBe(true)
		expect(layout.addTab({ id: 'd' })).toBe(false)
		expect(layout.getSnapshot().root.direction).toBe('vertical')
		expect(layout.removeTab('d')).toBe(true)
		expect(layout.removeTab('nope')).toBe(false)
	})

	it('drop helpers ignore splitter sources', () => {
		const layout = create()
		const [id] = layout.getSnapshot().splitters.keys()
		expect(
			layout.getDropTarget(
				{ x: 10, y: 10 },
				{ type: 'splitter', splitterId: id }
			)
		).toBeNull()
		expect(
			layout.listDropTargets({ type: 'splitter', splitterId: id })
		).toEqual([])
		const target = layout.getDropTarget(
			{ x: 100, y: 400 },
			{ type: 'tab', tabId: 'c' }
		)!
		expect(layout.getDropIndicatorRect(target)).toEqual({
			x: 0,
			y: 0,
			width: 300,
			height: 800,
		})
	})

	it('keeps the first duplicate tab in production and warns', () => {
		vi.stubEnv('NODE_ENV', 'production')
		const warnings: string[] = []
		const layout = createLayout({
			tabs: [{ id: 'a' }, { id: 'a' }],
			onWarning: (w) => warnings.push(w.code),
		})
		expect([...layout.getSnapshot().tabs.keys()]).toEqual(['a'])
		expect(warnings).toEqual(['DUPLICATE_TAB_ID'])
	})

	it('the default warning handler logs only in development', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		createLayout({ tabs: [{ id: 'a' }] }).selectTab('nope')
		expect(warn).toHaveBeenCalledWith('[dynamix-layout] Unknown tab "nope"')
		warn.mockClear()
		vi.stubEnv('NODE_ENV', 'production')
		createLayout({ tabs: [{ id: 'a' }] }).selectTab('nope')
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})
