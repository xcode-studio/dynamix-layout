import { DynamixLayout, type TabItem } from '@dynamix-layout/react'
import '@dynamix-layout/react/styles.css'

const box = (background: string, text: string) => (
	<div style={{ background, height: '100%', padding: 16 }}>{text}</div>
)

const tabs: TabItem[] = [
	{ id: 'editor', title: 'Editor', content: box('#fffde7', 'Editor') },
	{ id: 'terminal', title: 'Terminal', content: box('#e8f5e9', 'Terminal') },
	{ id: 'preview', title: 'Preview', content: box('#e3f2fd', 'Preview') },
	{
		id: 'notes',
		title: 'Notes',
		content: box('#fce4ec', 'Drag me'),
		closable: false,
	},
]

/** Level 1: the component with default styles. Drag tabs, splitters, double-click a tab bar. */
export default function BasicExample() {
	return <DynamixLayout tabs={tabs} />
}
