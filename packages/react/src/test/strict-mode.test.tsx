import { fireEvent, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DynamixLayout, type TabItem } from '..'
import { FakeResizeObserver, installDom } from './dom'

const tabs: TabItem[] = [
	{ id: 'a', content: 'A' },
	{ id: 'b', content: 'B' },
]

beforeEach(() => installDom())
afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('StrictMode', () => {
	it('leaves no listeners or observers behind after unmount', () => {
		const added = vi.spyOn(window, 'addEventListener')
		const removed = vi.spyOn(window, 'removeEventListener')
		const { unmount, container } = render(
			<StrictMode>
				<DynamixLayout tabs={tabs} />
			</StrictMode>
		)
		expect(container.querySelectorAll('[role="tab"]')).toHaveLength(2)
		expect(
			FakeResizeObserver.instances.filter((o) => o.connected)
		).toHaveLength(1)
		// Unmount in the middle of a drag: its window listeners must go too.
		fireEvent.pointerDown(container.querySelector('[role="separator"]')!, {
			button: 0,
			isPrimary: true,
			pointerId: 1,
			clientX: 600,
			clientY: 10,
		})
		expect(added.mock.calls.map(([type]) => type)).toContain('pointermove')
		unmount()
		expect(FakeResizeObserver.instances.every((o) => !o.connected)).toBe(
			true
		)
		const count = (spy: typeof added) =>
			spy.mock.calls.reduce<Record<string, number>>(
				(acc, [type]) => ({ ...acc, [type]: (acc[type] ?? 0) + 1 }),
				{}
			)
		expect(count(removed)).toEqual(count(added))
	})

	it('creates the engine once per layout, even when React double-invokes', () => {
		const { container } = render(
			<StrictMode>
				<DynamixLayout tabs={tabs} />
			</StrictMode>
		)
		const ids = Array.from(container.querySelectorAll('[role="tab"]')).map(
			(tab) => tab.id
		)
		expect(new Set(ids).size).toBe(2)
	})
})
