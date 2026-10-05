import type { DropTarget, LayoutJSON, RowJSON } from '@dynamix-layout/core'
import { createDomLayout, type TabDef } from './dom-layout'
import './style.css'

const STORAGE_KEY = 'dynamix-layout:vanilla-showcase'

const loadSaved = (): LayoutJSON | null => {
	try {
		const json = localStorage.getItem(STORAGE_KEY)
		return json ? (JSON.parse(json) as LayoutJSON) : null
	} catch {
		return null
	}
}

const panel = (background: string, html: string) => {
	const element = document.createElement('div')
	element.className = 'panel'
	element.style.background = background
	element.innerHTML = html
	return element
}

const HELP = `<ul>
	<li><b>Drag a tab</b> onto another tab bar, onto a panel's side to split it, or onto a layout edge.</li>
	<li><b>Drag a tab bar</b> to move the whole panel. <b>Drag a splitter</b> (or focus it and use the arrows) to resize.</li>
	<li><b>Fold</b> or <b>maximize</b> with the buttons at the end of a tab bar (hover it), or double-click a tab bar to maximize.</li>
	<li>Keyboard: arrows move between tabs, <kbd>Alt</kbd>+<kbd>=</kbd> maximizes, <kbd>Alt</kbd>+<kbd>-</kbd> folds, <kbd>Escape</kbd> cancels a drag.</li>
	<li><b>Close</b> tabs with × (or <kbd>Delete</kbd>), <b>add</b> them with the buttons above. The layout is saved to localStorage: reload the page.</li>
</ul>`

const initialTabs: TabDef[] = [
	{ id: 'guide', title: 'Guide', content: panel('#fffde7', HELP) },
	{
		id: 'editor',
		title: 'Editor',
		content: panel(
			'#e3f2fd',
			'Editor: type here, then move the tab. The text survives because content is never re-created.<br><textarea rows="4" cols="40"></textarea>'
		),
	},
	{
		id: 'terminal',
		title: 'Terminal',
		content: panel('#212121', '<span style="color:#9ccc65">$ _</span>'),
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

const newTab = (n: number, target?: DropTarget): TabDef => ({
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
const restoreTabs = (saved: LayoutJSON | null): TabDef[] => {
	if (!saved) return initialTabs
	const known = new Map(initialTabs.map((tab) => [tab.id, tab]))
	return tabIdsOf(saved.root).flatMap((id) => {
		const tab =
			known.get(id) ??
			(newTabNumber(id) ? newTab(newTabNumber(id)) : null)
		return tab ? [tab] : []
	})
}

const app = document.querySelector<HTMLElement>('#app')!
const controls = document.createElement('div')
controls.className = 'controls'
const log = document.createElement('div')
log.className = 'log'
log.textContent = 'Changes appear here (onLayoutChange reasons).'
const root = document.createElement('div')
app.append(controls, log, root)

const saved = loadSaved()
let tabs = restoreTabs(saved)
let counter = Math.max(0, ...tabs.map((tab) => newTabNumber(tab.id)))
const entries: string[] = []
const write = (entry: string) => {
	entries.unshift(entry)
	log.textContent = entries.slice(0, 8).join(' · ')
}

const layout = createDomLayout(root, {
	tabs,
	initialLayout: saved,
	padding: 6,
	splitterSize: 6,
	tabBarHeight: 36,
	minPanelSize: { width: 120, height: 80 },
	onLayoutChange: (json, reason) => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(json))
		write(reason)
	},
	onTabClose: (id) => setTabs(tabs.filter((tab) => tab.id !== id)),
})
const { engine } = layout

const setTabs = (next: TabDef[]) => {
	tabs = next
	layout.setTabs(tabs)
}

const tabsetOf = (tabId: string) =>
	engine.getSnapshot().tabs.get(tabId)?.tabsetId ?? ''

/** Runs an engine action and logs it when the engine refuses it. */
const act = (name: string, run: () => boolean) => {
	if (!run()) write(`${name}: not possible right now`)
}

const addTab = (target?: DropTarget) => {
	setTabs([...tabs, newTab(++counter, target)])
}

const button = (label: string, onClick: () => void) => {
	const element = document.createElement('button')
	element.type = 'button'
	element.textContent = label
	element.addEventListener('click', onClick)
	controls.append(element)
}

button('Add tab', () => addTab())
button('Add tab at the bottom', () =>
	addTab({ type: 'root', position: 'bottom' })
)
button('Maximize / restore Editor', () =>
	act('Maximize', () => engine.toggleMaximize(tabsetOf('editor')))
)
button('Fold / unfold Terminal', () =>
	act('Fold', () => engine.toggleFold(tabsetOf('terminal')))
)
button('Select Preview', () => act('Select', () => engine.selectTab('preview')))
button('Move Notes next to Editor', () =>
	act('Move', () =>
		engine.moveTab('notes', {
			type: 'tab',
			tabId: 'editor',
			position: 'after',
		})
	)
)
button('Reset layout', () => {
	setTabs(initialTabs)
	engine.reset()
})
button('Forget saved layout', () => localStorage.removeItem(STORAGE_KEY))

// Vite HMR: tear the old instance down before the module re-runs.
import.meta.hot?.dispose(() => {
	layout.destroy()
	app.replaceChildren()
})
