import { describe, it, expect } from 'vitest'
import { isDeepStrictEqual } from 'node:util'
import { loadScenarios } from './fixtures'
import type { Observation, Operation } from './scenario'
import { createV2Driver } from './v2-driver'

/**
 * Replays every v1 fixture through the v2 public API. Each step must match
 * v1 exactly (structure, every rect, accepted or refused), except where v1
 * hits one of its known bugs. There the engines' states legitimately differ,
 * so the replay checks the structure still matches and stops that scenario.
 */

const FOLDED_SIZE = 40

/** Why v1 diverges at this step, or `null` when it should match exactly. */
function knownV1Bug(
	operation: Operation,
	before: Observation,
	after: Observation,
	container: { width: number; height: number }
): string | null {
	const overflows = Object.values(after.tabsets).some(
		([x, y, w, h]) => x + w > container.width || y + h > container.height
	)
	if (overflows)
		return 'B29: v1 keeps a grown root after the container shrank'

	if (
		operation.op === 'move' &&
		'tabsetOf' in operation.target &&
		operation.target.area !== 'contain'
	) {
		const tab = operation.target.tabsetOf
		const folded = findTabset(before.tree, tab)?.folded
		if (folded)
			return 'B27: splitting beside a folded tabset leaves a row stuck at its minimum'
	}

	const stale = Object.entries(after.tabsets).some(([key, [, , w, h]]) => {
		const tabset = findTabset(after.tree, key.split('|')[0])
		return tabset?.folded && w !== FOLDED_SIZE && h !== FOLDED_SIZE
	})
	if (stale)
		return 'B28: a row whose open children all weigh 0 keeps stale sizes'
	return null
}

type Tree = Observation['tree']
function findTabset(
	node: Tree | Tree['children'][number],
	tab: string
): { folded?: true } | undefined {
	if ('tabs' in node) return node.tabs.includes(tab) ? node : undefined
	for (const child of node.children) {
		const found = findTabset(child, tab)
		if (found) return found
	}
	return undefined
}

describe('v2 replays the v1 fixtures', () => {
	const scenarios = loadScenarios()
	const stops: string[] = []
	let compared = 0

	it.each(scenarios.map((s) => [s.name, s] as const))('%s', (_, scenario) => {
		const driver = createV2Driver()
		driver.create(scenario.tabs, scenario.container)
		expect(driver.observe(), 'initial').toEqual(scenario.initial)

		let container = scenario.container
		let before = scenario.initial
		for (const [i, step] of scenario.steps.entries()) {
			const { operation } = step
			if (operation.op === 'resize')
				container = { width: operation.width, height: operation.height }
			const accepted = driver.apply(operation)
			const observed = driver.observe()
			const label = `step ${i + 1}: ${JSON.stringify(operation)}`
			if (step.accepted !== undefined)
				expect(accepted, label).toBe(step.accepted)

			if (!isDeepStrictEqual(observed, step.observation)) {
				const bug = knownV1Bug(
					operation,
					before,
					step.observation,
					container
				)
				if (!bug) expect(observed, label).toEqual(step.observation)
				expect(observed.tree, label).toEqual(step.observation.tree)
				stops.push(`${scenario.name} ${label} → ${bug}`)
				return
			}
			compared++
			before = step.observation
		}
	})

	it('compares most steps exactly', () => {
		expect(compared).toBeGreaterThan(400)
		expect(stops.length).toBeLessThanOrEqual(4)
	})
})
