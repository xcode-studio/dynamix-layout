'use client'
import Link from 'next/link'
import { DynamixLayout } from '@dynamix-layout/react'
import '@dynamix-layout/react/styles.css'
import { tabs } from './comp'

// Rendered on the server too: v2's first render is deterministic, so it hydrates cleanly.
export default function Home() {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: '100vh',
			}}
		>
			<nav
				style={{ padding: '6px 10px', borderBottom: '1px solid #eee' }}
			>
				<Link href="/showcase" style={{ textDecoration: 'underline' }}>
					Open the full feature showcase →
				</Link>
			</nav>
			<DynamixLayout
				tabs={tabs}
				onLayoutChange={(layout) => console.log(layout)}
				style={{ flex: 1, minHeight: 0, width: '100vw' }}
			/>
		</div>
	)
}
