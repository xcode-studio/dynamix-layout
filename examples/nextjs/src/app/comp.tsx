import type { TabItem } from '@dynamix-layout/react'

const panel = (background: string, label: string) => (
	<div style={{ background, height: '100%' }}>{label}</div>
)

export const tabs: TabItem[] = [
	{ id: 'editor', title: 'Editor', content: panel('#c0ca33', 'Editor') },
	{ id: 'preview', title: 'Preview', content: panel('#66bb6a', 'Preview') },
	{ id: 'terminal', title: 'Terminal', content: panel('#ffc400', 'Terminal') },
]
