import { act, fireEvent, render, screen } from '@testing-library/react'
import { memo, Profiler, useEffect, useState, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	DynamixLayout,
	DynamixLayoutProvider,
	useDynamixLayout,
	useLayoutActions,
	useLayoutState,
	useTab,
	type TabItem,
} from '..'
import { flushFrames, installDom, styleRect } from './dom'

beforeEach(() => installDom())
afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

/** Counts mounts and renders of a tab's content. */
function Probe({ id, log }: { id: string; log: string[] }) {
	log.push(`render ${id}`)
	useEffect(() => {
		log.push(`mount ${id}`)
		return () => void log.push(`unmount ${id}`)
	}, [id, log])
	return <span>{`body ${id}`}</span>
}

describe('re-renders', () => {
	it('an inline tabs array with the same ids does no engine work and remounts nothing', () => {
		const log: string[] = []
		const onLayoutChange = vi.fn()
		function App({ tick }: { tick: number }) {
			// A new array and new elements on every render, as most apps write it.
			const tabs: TabItem[] = ['a', 'b', 'c'].map((id) => ({
				id,
				title: `${id}${tick}`,
				content: <Probe id={id} log={log} />,
			}))
			return <DynamixLayout tabs={tabs} onLayoutChange={onLayoutChange} />
		}
		const { rerender } = render(<App tick={0} />)
		const before = screen.getAllByRole('tab').map((t) => t.id)
		log.length = 0
		rerender(<App tick={1} />)
		rerender(<App tick={2} />)
		expect(log.filter((entry) => !entry.startsWith('render'))).toEqual([])
		expect(screen.getAllByRole('tab').map((t) => t.id)).toEqual(before)
		expect(screen.getAllByRole('tab')[0].textContent).toBe('a2')
		expect(onLayoutChange).not.toHaveBeenCalled()
	})

	it('moving a tab keeps its content mounted (and in place in the DOM)', () => {
		const log: string[] = []
		const tabs: TabItem[] = ['a', 'b', 'c'].map((id) => ({
			id,
			content: <Probe id={id} log={log} />,
		}))
		render(<DynamixLayout tabs={tabs} />)
		const contentA = screen.getByText('body a').parentElement!
		log.length = 0
		act(() => {
			fireEvent.keyDown(screen.getByRole('tab', { name: 'a' }), {
				key: 'm',
				ctrlKey: true,
				shiftKey: true,
			})
			fireEvent.keyDown(screen.getByRole('tab', { name: 'a' }), {
				key: 'Enter',
			})
		})
		expect(
			log.filter(
				(entry) =>
					entry.startsWith('mount') || entry.startsWith('unmount')
			)
		).toEqual([])
		expect(screen.getByText('body a').parentElement).toBe(contentA)
	})

	it('selecting a tab re-renders only the components that read it', () => {
		const renders: Record<string, number> = {}
		const ActiveTab = memo(function ActiveTab({
			tabsetId,
		}: {
			tabsetId: string
		}) {
			const active = useLayoutState(
				(s) => s.tabsets.get(tabsetId)?.activeTabId
			)
			renders[tabsetId] = (renders[tabsetId] ?? 0) + 1
			return <span data-testid={tabsetId}>{active}</span>
		})
		let select: (id: string) => void = () => {}
		function Actions() {
			select = useLayoutActions().selectTab
			return null
		}
		function App() {
			const tabs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
			const layout = useDynamixLayout({ tabs, defaultLayout: twoTabsets })
			return (
				<DynamixLayoutProvider controller={layout.controller}>
					<div {...layout.getRootProps()}>
						<ActiveTab tabsetId="left" />
						<ActiveTab tabsetId="right" />
						<Actions />
					</div>
				</DynamixLayoutProvider>
			)
		}
		render(<App />)
		const start = { ...renders }
		act(() => select('c'))
		expect(screen.getByTestId('right').textContent).toBe('c')
		expect(renders.right).toBe(start.right + 1)
		expect(renders.left).toBe(start.left)
	})

	it('a splitter drag commits nothing to React; positions come from the fast path', () => {
		const commits: string[] = []
		const tabs: TabItem[] = ['a', 'b'].map((id) => ({
			id,
			content: <span>{`body ${id}`}</span>,
		}))
		const { container } = render(
			<Profiler id="layout" onRender={(_, phase) => commits.push(phase)}>
				<DynamixLayout tabs={tabs} />
			</Profiler>
		)
		const splitter =
			container.querySelector<HTMLElement>('[role="separator"]')!
		const pointer = { button: 0, pointerId: 1 }
		fireEvent.pointerDown(splitter, {
			...pointer,
			clientX: 600,
			clientY: 10,
		})
		const afterStart = commits.length
		for (const x of [550, 500, 450, 400]) {
			fireEvent.pointerMove(window, {
				...pointer,
				clientX: x,
				clientY: 10,
			})
			flushFrames()
		}
		expect(commits.length).toBe(afterStart)
		expect(styleRect(screen.getByText('body a').parentElement).width).toBe(
			395
		)
		expect(styleRect(splitter).x).toBe(395)
		expect(splitter.getAttribute('aria-valuenow')).toBe('33')
		fireEvent.pointerUp(window, { ...pointer, clientX: 400, clientY: 10 })
	})
})

const twoTabsets = {
	version: 2 as const,
	root: {
		type: 'row' as const,
		id: 'root',
		weight: 100,
		direction: 'horizontal' as const,
		children: [
			{
				type: 'tabset' as const,
				id: 'left',
				weight: 100,
				activeTabId: 'a',
				children: [{ type: 'tab' as const, id: 'a' }],
			},
			{
				type: 'tabset' as const,
				id: 'right',
				weight: 100,
				activeTabId: 'b',
				children: [
					{ type: 'tab' as const, id: 'b' },
					{ type: 'tab' as const, id: 'c' },
				],
			},
		],
	},
}

describe('headless hooks', () => {
	it('throw a clear error outside a layout', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
		function Lonely() {
			useTab('a')
			return null
		}
		expect(() => render(<Lonely />)).toThrow(
			'`useTab` must be used inside <DynamixLayout> or <DynamixLayoutProvider>.'
		)
		spy.mockRestore()
	})

	it('build a custom layout with prop getters that merge user props', () => {
		const onClick = vi.fn()
		function Tab({ id }: { id: string }) {
			const { getTabProps, isActive } = useTab(id)
			return (
				<button
					{...getTabProps({ onClick, className: 'mine' })}
				>{`${id}${isActive ? '!' : ''}`}</button>
			)
		}
		function Content({ id }: { id: string }): ReactNode {
			const { getTabContentProps } = useTab(id)
			return <div {...getTabContentProps()}>{`content ${id}`}</div>
		}
		function App() {
			const [tabs] = useState([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
			const layout = useDynamixLayout({ tabs, defaultLayout: twoTabsets })
			return (
				<DynamixLayoutProvider controller={layout.controller}>
					<div {...layout.getRootProps()}>
						{layout.tabs.map((tab) => (
							<Tab key={tab.id} id={tab.id} />
						))}
						{layout.tabIds.map((id) => (
							<Content key={id} id={id} />
						))}
					</div>
				</DynamixLayoutProvider>
			)
		}
		render(<App />)
		const c = screen.getByRole('tab', { name: 'c' })
		expect(c).toHaveClass('dx-tab', 'mine')
		fireEvent.click(c)
		expect(onClick).toHaveBeenCalledTimes(1)
		expect(screen.getByRole('tab', { name: 'c!' })).toHaveAttribute(
			'aria-selected',
			'true'
		)
		expect(screen.getByText('content c')).not.toHaveAttribute(
			'data-dx-hidden'
		)
		expect(screen.getByText('content b')).toHaveAttribute('data-dx-hidden')
	})

	it('lets a user handler stop the library handler with preventDefault', () => {
		function Tab({ id }: { id: string }) {
			const { getTabProps } = useTab(id)
			return (
				<button
					{...getTabProps({ onClick: (e) => e.preventDefault() })}
				>
					{id}
				</button>
			)
		}
		function App() {
			const layout = useDynamixLayout({
				tabs: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
				defaultLayout: twoTabsets,
			})
			return (
				<DynamixLayoutProvider controller={layout.controller}>
					<div {...layout.getRootProps()}>
						{layout.tabs.map((tab) => (
							<Tab key={tab.id} id={tab.id} />
						))}
					</div>
				</DynamixLayoutProvider>
			)
		}
		render(<App />)
		fireEvent.click(screen.getByRole('tab', { name: 'c' }))
		expect(screen.getByRole('tab', { name: 'c' })).toHaveAttribute(
			'aria-selected',
			'false'
		)
	})
})
