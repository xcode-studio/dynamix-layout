import { batch, createSignal, For, type JSX } from 'solid-js'
import {
	DynamixLayout,
	type LayoutJSON,
	type TabItem,
} from '@dynamix-layout/solid'
import type { DropTarget, Layout } from '@dynamix-layout/core'
import '@dynamix-layout/solid/style.css'

// This module touches `localStorage` and the DOM, so the route loads it with
// `clientOnly`: it never runs during server rendering, and hydration has
// nothing to mismatch.

const STORAGE_KEY = 'dynamix-layout:solidstart-showcase'

const loadSaved = (): LayoutJSON | undefined => {
	try {
		const json = localStorage.getItem(STORAGE_KEY)
		return json ? (JSON.parse(json) as LayoutJSON) : undefined
	} catch {
		return undefined
	}
}

const panel = (background: string, children: JSX.Element) => (
	<div
		style={{
			background,
			height: '100%',
			padding: '16px',
			'line-height': 1.6,
		}}
	>
		{children}
	</div>
)

const guide = () => (
	<ul style={{ margin: 0, 'padding-left': '18px' }}>
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
			bar, or double-click a tab bar. Alt+= maximizes and Alt+- folds the
			panel you last clicked.
		</li>
		<li>
			<b>Close</b> tabs with ×, <b>add</b> them with the buttons above.
			The layout is saved to localStorage: reload the page.
		</li>
	</ul>
)

const initialTabs = (): TabItem[] => [
	['guide', panel('#fffde7', guide()), { title: 'Guide' }],
	['editor', panel('#e3f2fd', 'Editor'), { title: 'Editor' }],
	[
		'terminal',
		panel('#212121', <span style={{ color: '#9ccc65' }}>$ _</span>),
		{ title: 'Terminal' },
	],
	[
		'preview',
		panel('#e8f5e9', 'Preview'),
		{ title: 'Preview', closable: true },
	],
	[
		'notes',
		panel('#fce4ec', 'Notes (closable)'),
		{ title: 'Notes', closable: true },
	],
]

/** Every feature on one page: drag, split, resize, close, add, fold, maximize, restore, persist, reset. */
export default function Showcase() {
	let layout: Layout | undefined
	let counter = 0
	const [tabs, setTabs] = createSignal(initialTabs())
	const [log, setLog] = createSignal<string[]>([])
	const saved = loadSaved()

	const tabsetOf = (tabId: string) =>
		layout?.getSnapshot().tabs.get(tabId)?.tabsetId ?? ''
	const note = (entry: string) =>
		setLog((current) => [entry, ...current].slice(0, 8))
	const act = (name: string, done: boolean | undefined) => {
		if (done === false) note(`${name}: not possible right now`)
	}
	const addTab = (target?: DropTarget) => {
		const id = `new-${++counter}`
		const entry: TabItem = [
			id,
			panel('#ede7f6', `Tab ${id}`),
			{ title: `New ${counter}`, closable: true },
		]
		batch(() => {
			// The Solid adapter places tabs added through `tabs` by default;
			// to drop one at a target, add it to the engine first. The
			// reactive `tabs` sync then keeps it where it is.
			if (target) layout?.addTab({ id }, target)
			setTabs([...tabs(), entry])
		})
	}

	const actions: [string, () => void][] = [
		['Add tab', () => addTab()],
		[
			'Add tab at the bottom',
			() => addTab({ type: 'root', position: 'bottom' }),
		],
		[
			'Maximize / restore Editor',
			() => act('Maximize', layout?.toggleMaximize(tabsetOf('editor'))),
		],
		[
			'Fold / unfold Terminal',
			() => act('Fold', layout?.toggleFold(tabsetOf('terminal'))),
		],
		['Select Preview', () => act('Select', layout?.selectTab('preview'))],
		[
			'Move Notes next to Editor',
			() =>
				act(
					'Move',
					layout?.moveTab('notes', {
						type: 'tab',
						tabId: 'editor',
						position: 'after',
					})
				),
		],
		[
			'Reset layout',
			() => {
				setTabs(initialTabs())
				layout?.reset()
			},
		],
		[
			'Forget saved layout',
			() => {
				localStorage.removeItem(STORAGE_KEY)
				note('saved layout forgotten')
			},
		],
	]

	return (
		<div
			style={{
				display: 'grid',
				'grid-template-rows': 'auto auto 1fr',
				height: '100%',
				'min-height': 0,
			}}
		>
			<div
				style={{
					display: 'flex',
					'flex-wrap': 'wrap',
					gap: '6px',
					padding: '8px',
					'border-bottom': '1px solid #eee',
				}}
			>
				<For each={actions}>
					{([label, run]) => (
						<button onClick={run} style={{ padding: '4px 10px' }}>
							{label}
						</button>
					)}
				</For>
			</div>
			<div
				style={{
					padding: '4px 8px',
					'font-size': '12px',
					color: '#666',
					'min-height': '20px',
				}}
			>
				{log().length ? log().join(' · ') : 'Changes appear here.'}
			</div>
			<DynamixLayout
				tabs={tabs()}
				layoutTree={saved}
				onReady={(engine) => (layout = engine)}
				onTabClose={(id) =>
					setTabs(tabs().filter(([tabId]) => tabId !== id))
				}
				updateJSON={(json) => {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(json))
					note('saved')
				}}
				tabHeadHeight={36}
				bondWidth={6}
				minTabWidth={120}
				minTabHeight={80}
			/>
		</div>
	)
}
