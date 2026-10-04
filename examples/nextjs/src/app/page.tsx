'use client'
import { DynamixLayout } from '@dynamix-layout/react'
import '@dynamix-layout/react/styles.css'
import { tabs } from './comp'

// Rendered on the server too: v2's first render is deterministic, so it hydrates cleanly.
export default function Home() {
	return (
		<DynamixLayout
			tabs={tabs}
			onLayoutChange={(layout) => console.log(layout)}
			style={{ height: '100vh', width: '100vw' }}
		/>
	)
}
