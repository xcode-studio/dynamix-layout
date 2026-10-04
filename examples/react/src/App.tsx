import { lazy, Suspense, useEffect, useState } from 'react'

const EXAMPLES = {
	custom: {
		label: 'Custom components',
		Component: lazy(() => import('./examples/CustomComponentsExample')),
	},
	basic: {
		label: 'Basic',
		Component: lazy(() => import('./examples/BasicExample')),
	},
	headless: {
		label: 'Headless hooks',
		Component: lazy(() => import('./examples/HeadlessExample')),
	},
	controlled: {
		label: 'Controlled + localStorage',
		Component: lazy(() => import('./examples/ControlledExample')),
	},
} as const
type ExampleKey = keyof typeof EXAMPLES

const fromHash = (): ExampleKey => {
	const key = window.location.hash.slice(1)
	return key in EXAMPLES ? (key as ExampleKey) : 'custom'
}

/** One page per API level, picked by the URL hash (#basic, #headless, …). */
export default function App() {
	const [current, setCurrent] = useState(fromHash)
	useEffect(() => {
		const onHashChange = () => setCurrent(fromHash())
		window.addEventListener('hashchange', onHashChange)
		return () => window.removeEventListener('hashchange', onHashChange)
	}, [])
	const { Component } = EXAMPLES[current]

	return (
		<div
			style={{
				display: 'grid',
				gridTemplateRows: 'auto 1fr',
				height: '100vh',
				width: '100vw',
			}}
		>
			<nav
				style={{
					display: 'flex',
					gap: 12,
					padding: '6px 12px',
					fontSize: 14,
					borderBottom: '1px solid #e5e5e5',
				}}
			>
				{(Object.keys(EXAMPLES) as ExampleKey[]).map((key) => (
					<a
						key={key}
						href={`#${key}`}
						style={{ fontWeight: key === current ? 700 : 400 }}
					>
						{EXAMPLES[key].label}
					</a>
				))}
			</nav>
			<main style={{ minHeight: 0 }}>
				<Suspense fallback={null}>
					<Component />
				</Suspense>
			</main>
		</div>
	)
}
