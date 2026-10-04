import { act, fireEvent, render, screen } from '@testing-library/react'
import { createRef, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	DynamixLayout,
	type DynamixLayoutHandle,
	type LayoutJSON,
	type TabItem,
} from '..'
import { flushFrames, installDom } from './dom'

const tabs: TabItem[] = ['a', 'b', 'c'].map((id) => ({
	id,
	title: id.toUpperCase(),
	content: <p>{`body ${id}`}</p>,
}))
const pointer = { button: 0, pointerId: 1 }

beforeEach(() => installDom())
afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

const move = (x: number, y: number) => {
	fireEvent.pointerMove(window, { ...pointer, clientX: x, clientY: y })
	flushFrames()
}

describe('pointer tab drag', () => {
	it('a click without movement selects; a drag moves the tab where the indicator shows', () => {
		const ref = createRef<DynamixLayoutHandle>()
		const onLayoutChange = vi.fn()
		const { container } = render(
			<DynamixLayout
				tabs={tabs}
				ref={ref}
				onLayoutChange={onLayoutChange}
			/>
		)
		const c = screen.getByRole('tab', { name: 'C' })

		fireEvent.pointerDown(c, { ...pointer, clientX: 700, clientY: 420 })
		move(702, 421)
		expect(ref.current!.getSnapshot().drag).toBeNull()
		fireEvent.pointerUp(window, { ...pointer, clientX: 702, clientY: 421 })

		fireEvent.pointerDown(c, { ...pointer, clientX: 700, clientY: 420 })
		move(100, 400)
		expect(container.querySelector('.dx-root')).toHaveAttribute(
			'data-dx-dragging'
		)
		expect(container.querySelectorAll('.dx-root-drop-zone')).toHaveLength(4)
		const indicator =
			container.querySelector<HTMLElement>('.dx-drop-indicator')!
		expect(indicator.style.width).toBe('300px')
		fireEvent.pointerUp(window, { ...pointer, clientX: 100, clientY: 400 })
		fireEvent.click(c)

		expect(container.querySelector('.dx-root')).not.toHaveAttribute(
			'data-dx-dragging'
		)
		expect(container.querySelector('.dx-drop-indicator')).toBeNull()
		expect(onLayoutChange).toHaveBeenCalledTimes(1)
		expect(onLayoutChange.mock.calls[0][1]).toEqual({ reason: 'move' })
		const json = ref.current!.toJSON()
		expect(json.root.children.map((child) => child.type)).toEqual([
			'tabset',
			'tabset',
			'tabset',
		])
		expect(json.root.children[0]).toMatchObject({ children: [{ id: 'c' }] })
	})

	it('Escape cancels a drag', () => {
		const ref = createRef<DynamixLayoutHandle>()
		render(<DynamixLayout tabs={tabs} ref={ref} />)
		const before = ref.current!.toJSON()
		fireEvent.pointerDown(screen.getByRole('tab', { name: 'C' }), {
			...pointer,
			clientX: 700,
			clientY: 420,
		})
		move(100, 400)
		fireEvent.keyDown(window, { key: 'Escape' })
		expect(ref.current!.getSnapshot().drag).toBeNull()
		fireEvent.pointerUp(window, { ...pointer, clientX: 100, clientY: 400 })
		expect(ref.current!.toJSON()).toBe(before)
	})

	it('inserts between tabs when dropped on a tab bar', () => {
		const ref = createRef<DynamixLayoutHandle>()
		render(<DynamixLayout tabs={tabs} ref={ref} />)
		// Tab bar of "a" spans x 0–600, y 0–40; tab "A" sits at x 8–72.
		fireEvent.pointerDown(screen.getByRole('tab', { name: 'C' }), {
			...pointer,
			clientX: 700,
			clientY: 420,
		})
		move(20, 20)
		expect(ref.current!.getSnapshot().drag!.target).toEqual({
			type: 'tab',
			tabId: 'a',
			position: 'before',
		})
		fireEvent.pointerUp(window, { ...pointer, clientX: 20, clientY: 20 })
		expect(ref.current!.getSnapshot().tabsets.get('ts-a')!.tabIds).toEqual([
			'c',
			'a',
		])
	})

	it('drags a whole tabset from its tab bar background', () => {
		const ref = createRef<DynamixLayoutHandle>()
		render(<DynamixLayout tabs={tabs} ref={ref} />)
		const bar = screen.getAllByRole('tablist')[2]
		fireEvent.pointerDown(bar, { ...pointer, clientX: 1100, clientY: 425 })
		move(300, 400)
		expect(ref.current!.getSnapshot().drag!.source).toEqual({
			type: 'tabset',
			tabsetId: 'ts-c',
		})
		fireEvent.pointerUp(window, { ...pointer, clientX: 300, clientY: 400 })
		expect(ref.current!.getSnapshot().tabs.get('c')!.tabsetId).toBe('ts-a')
	})

	it('leaves maximized mode when a drag starts', () => {
		const ref = createRef<DynamixLayoutHandle>()
		render(<DynamixLayout tabs={tabs} ref={ref} />)
		act(() => {
			ref.current!.maximize('ts-c')
		})
		fireEvent.pointerDown(screen.getByRole('tab', { name: 'C' }), {
			...pointer,
			clientX: 20,
			clientY: 20,
		})
		move(300, 300)
		expect(ref.current!.getSnapshot().maximizedTabsetId).toBeNull()
		fireEvent.pointerUp(window, { ...pointer, clientX: 300, clientY: 300 })
	})
})

describe('controlled and uncontrolled', () => {
	it('uncontrolled: starts from defaultLayout and ignores later changes to it', () => {
		const ref = createRef<DynamixLayoutHandle>()
		const first = {
			version: 2,
			root: {
				type: 'row',
				id: 'r',
				weight: 100,
				direction: 'vertical',
				children: [
					{
						type: 'tabset',
						id: 'top',
						weight: 100,
						activeTabId: 'a',
						children: [
							{ type: 'tab', id: 'a' },
							{ type: 'tab', id: 'b' },
							{ type: 'tab', id: 'c' },
						],
					},
				],
			},
		} as LayoutJSON
		const { rerender } = render(
			<DynamixLayout tabs={tabs} defaultLayout={first} ref={ref} />
		)
		expect(ref.current!.getSnapshot().tabsets.get('top')!.tabIds).toEqual([
			'a',
			'b',
			'c',
		])
		rerender(
			<DynamixLayout
				tabs={tabs}
				defaultLayout={{
					...first,
					root: { ...first.root, id: 'other' },
				}}
				ref={ref}
			/>
		)
		expect(ref.current!.toJSON().root.id).toBe('r')
	})

	it('controlled: follows the parent, and reverts changes the parent rejects', () => {
		const ref = createRef<DynamixLayoutHandle>()
		let accept = true
		const payloads: LayoutJSON[] = []
		function App() {
			const [layout, setLayout] = useState<LayoutJSON | undefined>(
				undefined
			)
			const [current, setCurrent] = useState<LayoutJSON | null>(null)
			return (
				<DynamixLayout
					tabs={tabs}
					ref={ref}
					layout={current ?? layout ?? undefined}
					defaultLayout={undefined}
					onLayoutChange={(next) => {
						payloads.push(next)
						if (accept) setCurrent(next)
						else setLayout((l) => l)
					}}
				/>
			)
		}
		render(<App />)
		act(() => {
			ref.current!.selectTab('b')
			ref.current!.moveTab('c', { type: 'root', position: 'bottom' })
		})
		expect(payloads.at(-1)!.version).toBe(2)
		expect(ref.current!.toJSON()).toBe(payloads.at(-1))
		const accepted = ref.current!.toJSON()

		accept = false
		act(() => {
			ref.current!.moveTab('a', { type: 'root', position: 'top' })
		})
		expect(ref.current!.toJSON()).toEqual(accepted)
	})

	it('controlled: loads a new layout from the parent (v1 or v2)', () => {
		const ref = createRef<DynamixLayoutHandle>()
		const v1 = {
			typNode: 'row',
			nodName: 'root',
			uidNode: 'root',
			nodPart: 100,
			nodKids: [
				{
					typNode: 'tabset',
					nodName: '',
					uidNode: 'x',
					nodPart: 100,
					nodOpen: 'b',
					nodKids: [
						{
							typNode: 'tab',
							nodName: 'a',
							uidNode: '1',
							nodPart: 100,
						},
						{
							typNode: 'tab',
							nodName: 'b',
							uidNode: '2',
							nodPart: 100,
						},
						{
							typNode: 'tab',
							nodName: 'c',
							uidNode: '3',
							nodPart: 100,
						},
					],
				},
			],
		} as const
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { rerender } = render(
			<DynamixLayout tabs={tabs} ref={ref} layout={undefined} />
		)
		rerender(<DynamixLayout tabs={tabs} ref={ref} layout={v1} />)
		expect(ref.current!.getSnapshot().tabsets.get('x')!.activeTabId).toBe(
			'b'
		)
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('v1 layout'))
	})
})
