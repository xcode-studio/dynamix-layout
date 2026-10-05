import { useState } from 'react'
import {
	DynamixLayout,
	type LayoutJSON,
	type TabItem,
} from '@dynamix-layout/react'
import '@dynamix-layout/react/styles.css'

const STORAGE_KEY = 'dynamix-layout:controlled-example'

const load = (): LayoutJSON | undefined => {
	try {
		const saved = localStorage.getItem(STORAGE_KEY)
		return saved ? (JSON.parse(saved) as LayoutJSON) : undefined
	} catch {
		return undefined
	}
}

/** Controlled mode: the layout lives in state and is persisted to localStorage. */
export default function ControlledExample() {
	const [layout, setLayout] = useState<LayoutJSON | undefined>(load)
	const [tabs, setTabs] = useState<TabItem[]>(() =>
		['a', 'b', 'c'].map((id) => ({
			id,
			title: `Tab ${id.toUpperCase()}`,
			content: <p style={{ padding: 16 }}>Tab {id}</p>,
			closable: true,
		}))
	)

	const onLayoutChange = (next: LayoutJSON) => {
		setLayout(next)
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
	}
	const addTab = () => {
		const id = `t${Date.now().toString(36)}`
		setTabs((current) => [
			...current,
			{
				id,
				title: `New ${current.length + 1}`,
				content: <p style={{ padding: 16 }}>{id}</p>,
				closable: true,
			},
		])
	}

	return (
		<div
			style={{
				display: 'grid',
				gridTemplateRows: 'auto 1fr',
				height: '100%',
			}}
		>
			<div style={{ display: 'flex', gap: 8, padding: 8 }}>
				<button onClick={addTab}>Add tab</button>
				<button
					onClick={() => {
						localStorage.removeItem(STORAGE_KEY)
						setLayout(undefined)
					}}
				>
					Forget saved layout
				</button>
				<span style={{ opacity: 0.6 }}>
					Reload the page: the layout is restored.
				</span>
			</div>
			<DynamixLayout
				tabs={tabs}
				layout={layout}
				onLayoutChange={onLayoutChange}
				onTabClose={(id) =>
					setTabs((current) => current.filter((tab) => tab.id !== id))
				}
			/>
		</div>
	)
}
