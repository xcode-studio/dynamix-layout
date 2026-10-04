import { fireEvent, render, screen } from '@solidjs/testing-library'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LayoutJSON } from '@dynamix-layout/core'
import type { JSX } from 'solid-js'
import { DynamixLayout } from '..'

const tabs = (): [string, JSX.Element][] => [
	['editor', <p>editor body</p>],
	['terminal', <p>terminal body</p>],
]

beforeEach(() => {
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1010)
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600)
})
afterEach(() => vi.restoreAllMocks())

describe('Solid adapter on the v2 core', () => {
	it('positions tab bodies relative to the root and reports v2 JSON on mount', () => {
		const updates: LayoutJSON[] = []
		render(() => (
			<DynamixLayout
				tabs={tabs()}
				updateJSON={(json) => updates.push(json)}
			/>
		))
		const body = screen.getByText('editor body').parentElement!
		expect(body.style.left).toBe('0px')
		expect(body.style.width).toBe('500px')
		expect(body.style.top).toBe('40px')
		expect(updates[0].version).toBe(2)
		expect(updates[0].root.children.map((c) => c.id)).toEqual([
			'ts-editor',
			'ts-terminal',
		])
	})

	it('selects tabs and folds through the engine', () => {
		const updates: LayoutJSON[] = []
		const saved: LayoutJSON = {
			version: 2,
			root: {
				type: 'row',
				id: 'root',
				weight: 100,
				direction: 'horizontal',
				children: [
					{
						type: 'tabset',
						id: 'one',
						weight: 100,
						activeTabId: 'editor',
						children: [
							{ type: 'tab', id: 'editor' },
							{ type: 'tab', id: 'terminal' },
						],
					},
				],
			},
		}
		render(() => (
			<DynamixLayout
				tabs={tabs()}
				layoutTree={saved}
				updateJSON={(json) => updates.push(json)}
			/>
		))
		expect(screen.getByText('terminal body').parentElement).toHaveAttribute(
			'data-dx-hidden'
		)
		fireEvent.click(screen.getByText('terminal'))
		expect(
			screen.getByText('terminal body').parentElement
		).not.toHaveAttribute('data-dx-hidden')
		expect(updates.at(-1)!.root.children[0]).toMatchObject({
			activeTabId: 'terminal',
		})
	})

	it('migrates a v1 layoutTree', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const v1 = {
			typNode: 'row',
			nodName: 'r',
			uidNode: 'r',
			nodPart: 100,
			nodKids: [
				{
					typNode: 'tabset',
					nodName: '',
					uidNode: 'a',
					nodPart: 300,
					nodOpen: 'editor',
					nodKids: [
						{
							typNode: 'tab',
							nodName: 'editor',
							uidNode: 'x',
							nodPart: 100,
						},
					],
				},
				{
					typNode: 'tabset',
					nodName: '',
					uidNode: 'b',
					nodPart: 100,
					nodOpen: 'terminal',
					nodKids: [
						{
							typNode: 'tab',
							nodName: 'terminal',
							uidNode: 'y',
							nodPart: 100,
						},
					],
				},
			],
		} as const
		render(() => <DynamixLayout tabs={tabs()} layoutTree={v1} />)
		expect(screen.getByText('editor body').parentElement!.style.width).toBe(
			'730px'
		)
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('v1 layout'))
	})
})
