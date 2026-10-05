// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DynamixLayout, type TabItem } from '..'

const tabs: TabItem[] = [
	{ id: 'editor', title: 'Editor', content: <p>editor</p> },
	{ id: 'a tab/with "odd" id', title: 'Odd', content: <p>odd</p> },
]

describe('server rendering', () => {
	it('renders without a DOM', () => {
		expect(typeof window).toBe('undefined')
		const html = renderToString(<DynamixLayout tabs={tabs} />)
		expect(html).toContain('data-dx-measuring')
		expect(html).toContain('role="tablist"')
		expect(html).toContain('editor')
	})

	it('produces the same markup every time (hydrates without mismatches)', () => {
		const first = renderToString(<DynamixLayout tabs={tabs} />)
		const second = renderToString(<DynamixLayout tabs={tabs} />)
		expect(second).toBe(first)
	})

	it('encodes tab ids into valid DOM ids', () => {
		const html = renderToString(<DynamixLayout tabs={tabs} />)
		const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
		expect(ids.length).toBeGreaterThan(0)
		for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_\-«»:]+$/)
	})
})
