import { useRef, useState, type ReactNode } from 'react'
import {
	DynamixLayout,
	type DynamixLayoutHandle,
	type LayoutJSON,
	type TabItem,
} from '@dynamix-layout/react'
import type { RowJSON } from '@dynamix-layout/core'
import '@dynamix-layout/react/styles.css'

const STORAGE_KEY = 'dynamix-layout:showcase'

const loadSaved = (): LayoutJSON | undefined => {
	try {
		const json = localStorage.getItem(STORAGE_KEY)
		return json ? (JSON.parse(json) as LayoutJSON) : undefined
	} catch {
		return undefined
	}
}

const panel = (background: string, children: ReactNode) => (
	<div style={{ background, height: '100%', padding: 16, lineHeight: 1.6 }}>
		{children}
	</div>
)

const HELP = (
	<ul style={{ margin: 0, paddingLeft: 18 }}>
		<li>
			<b>Drag a tab</b> onto another tab bar, onto a panel's side to split
			it, or onto a layout edge.
		</li>
		<li>
			<b>Drag a tab bar</b> to move the whole panel.{' '}
			<b>Drag a splitter</b> to resize.
		</li>
		<li>
			<b>Fold</b> or <b>maximize</b> with the buttons at the end of a tab
			bar (hover it), or double-click a tab bar to maximize.
		</li>
		<li>
			Keyboard: arrows move between tabs, <kbd>Alt</kbd>+<kbd>=</kbd>{' '}
			maximizes, <kbd>Alt</kbd>+<kbd>-</kbd> folds, <kbd>Ctrl</kbd>/
			<kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> moves the focused tab.
		</li>
		<li>
			<b>Close</b> tabs with × (or <kbd>Delete</kbd>), <b>add</b> them
			with the buttons above. The layout is saved to localStorage: reload
			the page.
		</li>
	</ul>
)

const initialTabs: TabItem[] = [
	{ id: 'guide', title: 'Guide', content: panel('#fffde7', HELP) },
	{
		id: 'editor',
		title: 'Editor',
		content: panel('#e3f2fd', 'Editor: focus or click to select'),
	},
	{
		id: 'terminal',
		title: 'Terminal',
		content: panel(
			'#212121',
			<span style={{ color: '#9ccc65' }}>$ _</span>
		),
	},
	{
		id: 'preview',
		title: 'Preview',
		content: panel('#e8f5e9', 'Preview'),
		closable: true,
	},
	{
		id: 'notes',
		title: 'Notes',
		content: panel('#fce4ec', 'Notes (closable)'),
		closable: true,
	},
]

const newTab = (n: number, target?: TabItem['target']): TabItem => ({
	id: `new-${n}`,
	title: `New ${n}`,
	content: panel('#ede7f6', `Tab new-${n}`),
	closable: true,
	target,
})
const newTabNumber = (id: string) => Number(/^new-(\d+)$/.exec(id)?.[1] ?? 0)

/** Tab ids in a saved layout, so added and closed tabs survive a reload too. */
const tabIdsOf = (row: RowJSON): string[] =>
	row.children.flatMap((child) =>
		child.type === 'row'
			? tabIdsOf(child)
			: child.children.map((tab) => tab.id)
	)

/** The tabs a saved layout had open, or the initial ones. */
const restoreTabs = (saved: LayoutJSON | undefined): TabItem[] => {
	if (!saved) return initialTabs
	const known = new Map(initialTabs.map((tab) => [tab.id, tab]))
	return tabIdsOf(saved.root).flatMap((id) => {
		const tab =
			known.get(id) ??
			(newTabNumber(id) ? newTab(newTabNumber(id)) : null)
		return tab ? [tab] : []
	})
}

/** Every feature on one page: drag, split, resize, close, add, fold, maximize, restore, persist, reset. */
export default function ShowcaseExample() {
	const layout = useRef<DynamixLayoutHandle>(null)
	const [saved] = useState(loadSaved)
	const [tabs, setTabs] = useState(() => restoreTabs(saved))
	const [log, setLog] = useState<string[]>([])
	const counter = useRef(
		Math.max(0, ...tabs.map((tab) => newTabNumber(tab.id)))
	)

	const tabsetOf = (tabId: string) =>
		layout.current?.getSnapshot().tabs.get(tabId)?.tabsetId
	const act = (name: string, run: () => boolean | void) => {
		const result = run()
		if (result === false)
			setLog((current) =>
				[`${name}: not possible right now`, ...current].slice(0, 8)
			)
	}

	const addTab = (target?: TabItem['target']) => {
		const tab = newTab(++counter.current, target)
		setTabs((current) => [...current, tab])
	}

	const button = (label: string, onClick: () => void) => (
		<button key={label} onClick={onClick} style={{ padding: '4px 10px' }}>
			{label}
		</button>
	)

	return (
		<div
			style={{
				display: 'grid',
				gridTemplateRows: 'auto auto 1fr',
				height: '100%',
			}}
		>
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: 6,
					padding: 8,
					borderBottom: '1px solid #eee',
				}}
			>
				{button('Add tab', () => addTab())}
				{button('Add tab at the bottom', () =>
					addTab({ type: 'root', position: 'bottom' })
				)}
				{button('Maximize / restore Editor', () =>
					act('Maximize', () =>
						layout.current?.toggleMaximize(tabsetOf('editor') ?? '')
					)
				)}
				{button('Fold / unfold Terminal', () =>
					act('Fold', () =>
						layout.current?.toggleFold(tabsetOf('terminal') ?? '')
					)
				)}
				{button('Select Preview', () =>
					act('Select', () => layout.current?.selectTab('preview'))
				)}
				{button('Move Notes next to Editor', () =>
					act('Move', () =>
						layout.current?.moveTab('notes', {
							type: 'tab',
							tabId: 'editor',
							position: 'after',
						})
					)
				)}
				{button('Reset layout', () => {
					setTabs(initialTabs)
					layout.current?.reset()
				})}
				{button('Forget saved layout', () =>
					localStorage.removeItem(STORAGE_KEY)
				)}
			</div>
			<div
				style={{
					padding: '4px 8px',
					fontSize: 12,
					color: '#666',
					minHeight: 20,
				}}
			>
				{log.length
					? log.join(' · ')
					: 'Changes appear here (onLayoutChange reasons).'}
			</div>
			<DynamixLayout
				ref={layout}
				tabs={tabs}
				defaultLayout={saved}
				padding={6}
				splitterSize={6}
				tabBarHeight={36}
				minPanelSize={{ width: 120, height: 80 }}
				onLayoutChange={(json, { reason }) => {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(json))
					setLog((current) => [reason, ...current].slice(0, 8))
				}}
				onTabClose={(id) =>
					setTabs((current) => current.filter((tab) => tab.id !== id))
				}
			/>
		</div>
	)
}
