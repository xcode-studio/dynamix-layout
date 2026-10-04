/**
 * Installs the packed @dynamix-layout/core and @dynamix-layout/react into a
 * project that only has React 18, then renders on the server and in jsdom.
 * Run by the `react-18` CI job (see .github/workflows/ci.yml).
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { JSDOM } from 'jsdom'
import { createElement as h, act, version } from 'react'
import { renderToString } from 'react-dom/server'

assert.match(version, /^18\./, `expected React 18, got ${version}`)
const tabs = ['editor', 'terminal', 'preview'].map((id) => ({ id, title: id.toUpperCase(), content: h('p', null, `${id} body`) }))
const { DynamixLayout } = await import('@dynamix-layout/react')

// Server render: no DOM, deterministic markup.
const html = renderToString(h(DynamixLayout, { tabs }))
assert.ok(html.includes('role="tablist"'), 'server markup has tab lists')
assert.equal(renderToString(h(DynamixLayout, { tabs })), html, 'server markup is deterministic')

// Client render in jsdom.
const dom = new JSDOM('<!doctype html><div id="root"></div>', { pretendToBeVisual: true })
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, IS_REACT_ACT_ENVIRONMENT: true })
const { createRoot } = await import('react-dom/client')
const reasons = []
const root = createRoot(document.getElementById('root'))
await act(async () => root.render(h(DynamixLayout, { tabs, onLayoutChange: (_, details) => reasons.push(details.reason) })))
const tabEls = [...document.querySelectorAll('[role=tab]')]
assert.deepEqual(tabEls.map((tab) => tab.textContent), ['EDITOR', 'TERMINAL', 'PREVIEW'])

const key = (init) => act(async () => tabEls[0].dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, ...init })))
await key({ key: 'm', ctrlKey: true, shiftKey: true })
await key({ key: 'Enter' })
assert.deepEqual(reasons, ['move'], 'keyboard move mode moved the tab')

await act(async () => root.unmount())
assert.equal(document.getElementById('root').innerHTML, '', 'unmounted cleanly')

// CommonJS consumers.
const require = createRequire(import.meta.url)
assert.equal(typeof require('@dynamix-layout/core').createLayout, 'function')
assert.equal(typeof require('@dynamix-layout/react').useTab, 'function')

console.log('React 18 smoke test passed')
