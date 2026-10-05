import { createSignal, onMount, lazy, Show, Suspense, JSX } from 'solid-js'
import { clientOnly } from '@solidjs/start'
import { tabs } from './comp'
import { LayoutProps } from '@dynamix-layout/solid'
import '@dynamix-layout/solid/style.css'

// 1. Use `clientOnly` to dynamically import the DynamixLayout component.
// This ensures that the component is only loaded on the client side, avoiding SSR issues.
// This is necessary because DynamixLayout relies on browser-specific APIs that are not available during server-side rendering.
// This will prevent the hydration mismatch error you encountered.
// Either use `clientOnly` or ensure that the component is only rendered on the client side using `onMount`.
const DynamixLayout = clientOnly(async () => {
	const { DynamixLayout } = await import('@dynamix-layout/solid')
	return {
		default: (props: LayoutProps) => (
			<DynamixLayout {...props} tabs={tabs} />
		),
	}
})

export default function Home() {
	// 2. Create a signal to track if we are on the client.
	// It defaults to `false` and will remain so during server-rendering.
	//----------------------------------
	//const [isClient, setIsClient] = createSignal(false)
	//----------------------------------

	// 3. `onMount` is a lifecycle function that ONLY runs in the browser,
	// after the initial page has been rendered.
	// We set our signal to `true` here.
	//----------------------------------
	// onMount(() => {
	// 	setIsClient(true)
	// })
	//----------------------------------

	return (
		<main
			style={{
				display: 'grid',
				'grid-template-rows': 'auto 1fr',
				height: '100%',
			}}
		>
			<nav style={{ padding: '6px 8px', 'font-size': '13px' }}>
				<a href="/showcase">Showcase: every feature →</a>
			</nav>
			{/* 4. Use a <Show> component.
				It will only render its children when the `when` condition is true.
				Since `isClient()` is false on the server, nothing inside the <Show>
				will be rendered on the server, avoiding the mismatch.
			*/}
			<DynamixLayout updateJSON={layoutTree => console.log(layoutTree)} tabs />
			{/* Suspense is required for lazy components to show a fallback while loading */}
			{/* 
				<Show when={isClient()}>
					<Suspense fallback={<div>Loading Dynamic Component...</div>}>
						<DynamixLayout tabs={myTabs} />
					</Suspense>
				</Show> 
			*/}
		</main>
	)
}
