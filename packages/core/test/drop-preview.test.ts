import { describe, it, expect, vi, afterEach } from 'vitest'
import {
	createFrameScheduler,
	getNavbarDropPreview,
	getRootSplitPreview,
	getTabBodyRect,
	getTabsetDropPreview,
	isSameDropPreview,
} from '../src'

const rect = (left: number, top: number, width: number, height: number) => ({
	left,
	top,
	width,
	height,
	right: left + width,
	bottom: top + height,
})

describe('getTabsetDropPreview', () => {
	const tabset = rect(100, 50, 300, 600)

	it.each([
		['left', 120, 300, { left: 100, top: 50, width: 150, height: 600 }],
		['right', 380, 300, { left: 250, top: 50, width: 150, height: 600 }],
		['top', 250, 100, { left: 100, top: 50, width: 300, height: 300 }],
		['bottom', 250, 600, { left: 100, top: 350, width: 300, height: 300 }],
		['contain', 250, 350, { left: 130, top: 110, width: 240, height: 480 }],
	])('previews the %s zone', (area, x, y, box) => {
		expect(getTabsetDropPreview(tabset, x, y)).toEqual({ area, ...box })
	})
})

describe('getRootSplitPreview', () => {
	const container = { x: 0, y: 0, w: 1000, h: 800 }

	it.each([
		['left', { left: 0, top: 0, width: 500, height: 800 }],
		['right', { left: 500, top: 0, width: 500, height: 800 }],
		['top', { left: 0, top: 0, width: 1000, height: 400 }],
		['bottom', { left: 0, top: 400, width: 1000, height: 400 }],
	] as const)('previews the %s half', (side, box) => {
		expect(getRootSplitPreview(container, side)).toEqual({
			area: side,
			...box,
		})
	})
})

describe('getNavbarDropPreview', () => {
	const navbar = rect(0, 0, 500, 40)
	// Three tabs, 60px wide, 10px apart.
	const tabs = [rect(8, 5, 60, 30), rect(78, 5, 60, 30), rect(148, 5, 60, 30)]

	it('returns null outside the bar vertically or without tabs', () => {
		expect(getNavbarDropPreview(navbar, tabs, 100, 60)).toBeNull()
		expect(getNavbarDropPreview(navbar, [], 100, 20)).toBeNull()
	})

	it('marks after the last tab past its right edge', () => {
		expect(getNavbarDropPreview(navbar, tabs, 300, 20)).toEqual({
			index: 2,
			area: 'right',
			left: 209,
			top: 5,
			width: 4,
			height: 30,
		})
	})

	it('marks before the first tab left of it', () => {
		expect(getNavbarDropPreview(navbar, tabs, 2, 20)).toEqual({
			index: 0,
			area: 'left',
			left: 3,
			top: 5,
			width: 4,
			height: 30,
		})
	})

	it('uses the measured gap between neighbouring tabs', () => {
		expect(getNavbarDropPreview(navbar, tabs, 100, 20)).toEqual({
			index: 1,
			area: 'left',
			left: 69,
			top: 5,
			width: 8,
			height: 30,
		})
	})
})

describe('isSameDropPreview', () => {
	it('compares area and box', () => {
		const a = {
			area: 'left' as const,
			left: 1,
			top: 2,
			width: 3,
			height: 4,
		}
		expect(isSameDropPreview(a, { ...a })).toBe(true)
		expect(isSameDropPreview(a, { ...a, width: 5 })).toBe(false)
		expect(isSameDropPreview({}, a)).toBe(false)
	})
})

describe('getTabBodyRect', () => {
	it('sits below the tab bar and never goes negative', () => {
		expect(getTabBodyRect({ x: 10, y: 20, w: 300, h: 200 }, 40)).toEqual({
			x: 10,
			y: 60,
			w: 300,
			h: 160,
		})
		expect(getTabBodyRect({ x: 0, y: 0, w: 100, h: 20 }, 40).h).toBe(0)
	})
})

describe('createFrameScheduler', () => {
	afterEach(() => vi.unstubAllGlobals())

	const stubFrames = () => {
		const callbacks = new Map<number, () => void>()
		let next = 1
		vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
			callbacks.set(next, cb)
			return next++
		})
		vi.stubGlobal('cancelAnimationFrame', (id: number) =>
			callbacks.delete(id)
		)
		return () => {
			const pending = [...callbacks.values()]
			callbacks.clear()
			pending.forEach((cb) => cb())
		}
	}

	it('runs once per frame with the latest value', () => {
		const runFrame = stubFrames()
		const onFlush = vi.fn()
		const scheduler = createFrameScheduler<number>(onFlush)

		scheduler.schedule(1)
		scheduler.schedule(2)
		scheduler.schedule(3)
		runFrame()

		expect(onFlush).toHaveBeenCalledTimes(1)
		expect(onFlush).toHaveBeenCalledWith(3)
	})

	it('flushes immediately and cancels pending work', () => {
		const runFrame = stubFrames()
		const onFlush = vi.fn()
		const scheduler = createFrameScheduler<number>(onFlush)

		scheduler.schedule(1)
		scheduler.flush()
		expect(onFlush).toHaveBeenCalledWith(1)

		scheduler.schedule(2)
		scheduler.cancel()
		runFrame()
		expect(onFlush).toHaveBeenCalledTimes(1)
	})
})
