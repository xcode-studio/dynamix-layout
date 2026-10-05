import { Title } from '@solidjs/meta'
import { clientOnly } from '@solidjs/start'

// The showcase reads its saved layout from localStorage, so it renders on the
// client only. The server sends the page shell and the fallback.
const Showcase = clientOnly(() => import('../components/Showcase'))

export default function ShowcasePage() {
	return (
		<main
			style={{
				display: 'grid',
				'grid-template-rows': 'auto 1fr',
				height: '100%',
			}}
		>
			<Title>SolidStart - Showcase</Title>
			<nav style={{ padding: '6px 8px', 'font-size': '13px' }}>
				<a href="/">← Basic SSR example</a>
			</nav>
			<Showcase
				fallback={<div style={{ padding: '8px' }}>Loading layout…</div>}
			/>
		</main>
	)
}
