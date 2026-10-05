import type { Metadata } from 'next'
import Showcase from './Showcase'

export const metadata: Metadata = { title: 'Dynamix Layout showcase' }

export default function ShowcasePage() {
	return <Showcase />
}
