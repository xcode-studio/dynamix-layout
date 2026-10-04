import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	DynamixLayout,
	type DynamixLayoutHandle,
	type TabItem,
	type TabProps,
} from '..'
import { createRef } from 'react'
import { installDom, styleRect } from './dom'

const tabs: TabItem[] = [
	{ id: 'editor', title: 'Editor', content: <p>editor body</p> },
	{ id: 'terminal', title: 'Terminal', content: <p>terminal body</p> },
	{
		id: 'preview',
		title: 'Preview',
		content: <p>preview body</p>,
		closable: true,
	},
]

beforeEach(() => installDom())
afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('<DynamixLayout> rendering', () => {
	it('renders tabs, contents and splitters at their positions', () => {
		const { container } = render(<DynamixLayout tabs={tabs} />)
		expect(screen.getAllByRole('tablist')).toHaveLength(3)
		expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
			'Editor',
			'Terminal',
			'Preview',
		])
		expect(screen.getByText('editor body')).toBeInTheDocument()
		expect(container.querySelectorAll('[role="separator"]')).toHaveLength(2)
		const editorPanel = screen.getByText('editor body').parentElement!
		expect(styleRect(editorPanel)).toEqual({
			x: 0,
			y: 40,
			width: 600,
			height: 760,
		})
		expect(container.querySelector('.dx-root')).not.toHaveAttribute(
			'data-dx-measuring'
		)
	})

	it('follows container resizes from a ResizeObserver', async () => {
		const { resizeTo } = await import('./dom')
		render(<DynamixLayout tabs={tabs} />)
		resizeTo(810, 600)
		expect(
			styleRect(screen.getByText('editor body').parentElement)
		).toEqual({ x: 0, y: 40, width: 400, height: 560 })
	})

	it('applies padding, classNames and styles', () => {
		const { container } = render(
			<DynamixLayout
				tabs={tabs}
				padding={{ left: 10, top: 5 }}
				className="app"
				classNames={{
					root: 'root-x',
					tab: 'tab-x',
					activeTab: 'active-x',
					splitter: 'split-x',
				}}
				styles={{ tabBar: { background: 'red' } }}
			/>
		)
		const root = container.querySelector('.dx-root')!
		expect(root).toHaveClass('app', 'root-x')
		expect(screen.getAllByRole('tab')[0]).toHaveClass(
			'dx-tab',
			'tab-x',
			'active-x'
		)
		expect(container.querySelector('.dx-splitter')).toHaveClass('split-x')
		const bar = screen.getAllByRole('tablist')[0]
		expect(bar.style.background).toBe('red')
		expect(styleRect(bar).x).toBe(10)
		expect(styleRect(bar).y).toBe(5)
	})

	it('accepts custom slot components', () => {
		render(
			<DynamixLayout
				tabs={tabs}
				components={{
					Tab: function CustomTab({
						tab,
						isActive,
						closeButtonProps,
						onClose,
						isDragging,
						...props
					}: TabProps) {
						return (
							<button
								{...(props as object)}
							>{`${tab.id}${isActive ? '*' : ''}`}</button>
						)
					},
				}}
			/>
		)
		expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
			'editor*',
			'terminal*',
			'preview*',
		])
	})

	it('gives a working imperative handle through ref', () => {
		const ref = createRef<DynamixLayoutHandle>()
		const callback = vi.fn()
		render(<DynamixLayout tabs={tabs} ref={ref} />)
		render(<DynamixLayout tabs={tabs} ref={callback} />)
		expect(callback).toHaveBeenCalledWith(
			expect.objectContaining({ moveTab: expect.any(Function) })
		)
		expect(ref.current!.element).toHaveClass('dx-root')
		act(() => {
			ref.current!.moveTab('preview', {
				type: 'root',
				position: 'bottom',
			})
		})
		expect(ref.current!.toJSON().root.direction).toBe('vertical')
	})
})

describe('accessibility', () => {
	it('follows the WAI-ARIA tabs pattern', () => {
		render(<DynamixLayout tabs={tabs} />)
		const [editor] = screen.getAllByRole('tab')
		const panel = document.getElementById(
			editor.getAttribute('aria-controls')!
		)!
		expect(panel).toHaveAttribute('role', 'tabpanel')
		expect(panel).toHaveAttribute('aria-labelledby', editor.id)
		expect(editor).toHaveAttribute('aria-selected', 'true')
		expect(editor).toHaveAttribute('tabindex', '0')
		expect(screen.getAllByRole('tablist')[0]).toHaveAttribute(
			'aria-orientation',
			'horizontal'
		)
	})

	it('moves focus and selection with arrow keys, Home and End', () => {
		const ref = createRef<DynamixLayoutHandle>()
		render(<DynamixLayout tabs={tabs} ref={ref} />)
		act(() => {
			ref.current!.moveTab('terminal', {
				type: 'tab',
				tabId: 'editor',
				position: 'after',
			})
		})
		const [editor, terminal] = screen.getAllByRole('tab')
		act(() => editor.focus())
		fireEvent.keyDown(editor, { key: 'ArrowRight' })
		expect(document.activeElement).toBe(terminal)
		expect(terminal).toHaveAttribute('aria-selected', 'true')
		expect(editor).toHaveAttribute('tabindex', '-1')
		fireEvent.keyDown(terminal, { key: 'Home' })
		expect(document.activeElement).toBe(screen.getAllByRole('tab')[0])
	})

	it('selects only on Enter with manual activation', () => {
		const ref = createRef<DynamixLayoutHandle>()
		render(<DynamixLayout tabs={tabs} tabActivation="manual" ref={ref} />)
		act(() => {
			ref.current!.moveTab('terminal', {
				type: 'tab',
				tabId: 'editor',
				position: 'after',
			})
			ref.current!.selectTab('editor')
		})
		const [editor, terminal] = screen.getAllByRole('tab')
		fireEvent.keyDown(editor, { key: 'ArrowRight' })
		expect(terminal).toHaveAttribute('aria-selected', 'false')
		fireEvent.keyDown(terminal, { key: 'Enter' })
		expect(terminal).toHaveAttribute('aria-selected', 'true')
	})

	it('follows the window splitter pattern and resizes from the keyboard', () => {
		const { container } = render(<DynamixLayout tabs={tabs} />)
		const splitter =
			container.querySelector<HTMLElement>('[role="separator"]')!
		expect(splitter).toHaveAttribute('aria-orientation', 'vertical')
		expect(splitter).toHaveAttribute('aria-valuenow', '50')
		expect(splitter).toHaveAttribute(
			'aria-label',
			'Resize Editor and Terminal'
		)
		expect(splitter).toHaveAttribute('tabindex', '0')
		const before = styleRect(
			screen.getByText('editor body').parentElement
		).width
		fireEvent.keyDown(splitter, { key: 'ArrowRight' })
		expect(
			styleRect(screen.getByText('editor body').parentElement).width
		).toBe(before + 10)
		fireEvent.keyDown(splitter, { key: 'ArrowLeft', shiftKey: true })
		expect(
			styleRect(screen.getByText('editor body').parentElement).width
		).toBe(before - 40)
		fireEvent.keyDown(splitter, { key: 'Home' })
		expect(
			styleRect(screen.getByText('editor body').parentElement).width
		).toBe(40)
		expect(splitter.getAttribute('aria-valuenow')).toBe('3')
	})

	it('closes closable tabs from the button and the Delete key', () => {
		const onTabClose = vi.fn()
		render(<DynamixLayout tabs={tabs} onTabClose={onTabClose} />)
		fireEvent.click(screen.getByRole('button', { name: 'Close Preview' }))
		fireEvent.keyDown(screen.getByRole('tab', { name: /Preview/ }), {
			key: 'Delete',
		})
		fireEvent.keyDown(screen.getByRole('tab', { name: 'Editor' }), {
			key: 'Delete',
		})
		expect(onTabClose.mock.calls).toEqual([['preview'], ['preview']])
	})

	it('maximizes and folds from the toolbar and shortcuts', () => {
		const ref = createRef<DynamixLayoutHandle>()
		const { container } = render(<DynamixLayout tabs={tabs} ref={ref} />)
		fireEvent.click(screen.getAllByRole('button', { name: 'Maximize' })[0])
		expect(ref.current!.getSnapshot().maximizedTabsetId).toBe('ts-editor')
		expect(
			container.querySelectorAll('.dx-tab-bar[data-dx-hidden]')
		).toHaveLength(2)
		const root = container.querySelector('.dx-root')!
		fireEvent.pointerDown(screen.getByRole('tab', { name: 'Editor' }))
		fireEvent.keyDown(root, { altKey: true, code: 'Equal' })
		expect(ref.current!.getSnapshot().maximizedTabsetId).toBeNull()
		fireEvent.keyDown(root, { altKey: true, code: 'Minus' })
		expect(
			ref.current!.getSnapshot().tabsets.get('ts-editor')!.isFolded
		).toBe(true)
		expect(screen.getAllByRole('tablist')[0]).toHaveAttribute(
			'aria-orientation',
			'vertical'
		)
	})

	it('moves a tab with the keyboard (move mode)', () => {
		const ref = createRef<DynamixLayoutHandle>()
		render(<DynamixLayout tabs={tabs} ref={ref} />)
		const editor = screen.getByRole('tab', { name: 'Editor' })
		fireEvent.keyDown(editor, { key: 'm', ctrlKey: true, shiftKey: true })
		expect(screen.getByRole('status').textContent).toMatch(
			/^Move Editor: into Terminal/
		)
		fireEvent.keyDown(editor, { key: 'Enter' })
		expect(ref.current!.getSnapshot().tabs.get('editor')!.tabsetId).toBe(
			'ts-terminal'
		)
		expect(screen.getByRole('status').textContent).toBe('Moved Editor.')
	})
})
