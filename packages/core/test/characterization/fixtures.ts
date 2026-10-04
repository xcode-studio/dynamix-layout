import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Observation, Scenario } from './scenario'

const FIXTURE_DIR = resolve(__dirname, '../fixtures/v1')

/** All stored v1 scenarios. */
export function loadScenarios(): Scenario[] {
	return Array.from({ length: 16 }, (_, i) => {
		const file = `scenario-${String(i + 1).padStart(2, '0')}.json`
		return JSON.parse(
			readFileSync(resolve(FIXTURE_DIR, file), 'utf8')
		) as Scenario
	})
}

/** Each saved v1 layout with the container size and v1's observation at that moment. */
export function savedStates(scenario: Scenario) {
	const states: {
		saved: unknown
		container: { width: number; height: number }
		observation: Observation
		label: string
	}[] = [
		{
			saved: scenario.initialSavedV1,
			container: scenario.container,
			observation: scenario.initial,
			label: 'initial',
		},
	]
	let container = scenario.container
	scenario.steps.forEach((step, i) => {
		if (step.operation.op === 'resize')
			container = {
				width: step.operation.width,
				height: step.operation.height,
			}
		if (step.savedV1)
			states.push({
				saved: step.savedV1,
				container,
				observation: step.observation,
				label: `step ${i + 1}`,
			})
	})
	return states
}

/**
 * v1 never shrinks the root back after it outgrew a too-small container until
 * the next window resize (audit B29), so its rects in that state depend on
 * history that isn't saved. Those states are compared by structure only.
 */
export function overflows(
	observation: Observation,
	container: { width: number; height: number }
) {
	return Object.values(observation.tabsets).some(
		([x, y, width, height]) =>
			x + width > container.width || y + height > container.height
	)
}

/**
 * v1 kept the fold flag when a folded tabset turned into a row (a tab dropped
 * beside it), leaving that row stuck at its minimum size (audit B27). v2
 * doesn't reproduce the bug, so these states are compared by structure only.
 */
export function hasFoldedRow(saved: unknown): boolean {
	const visit = (node: {
		typNode?: string
		nodFold?: boolean
		nodKids?: unknown[]
	}): boolean =>
		(node.typNode === 'row' && node.nodFold === true) ||
		(node.nodKids ?? []).some((kid) => visit(kid as typeof node))
	return visit(saved as Parameters<typeof visit>[0])
}

/**
 * When every unfolded child of a row has weight 0, v1 skips the row and its
 * children keep stale positions, sometimes outside the row (audit B28). v2
 * shares the space equally, so these states are compared by structure only.
 */
export function hasZeroWeightRow(saved: unknown): boolean {
	type V1 = {
		typNode?: string
		nodPart?: number
		nodFold?: boolean
		nodKids?: V1[]
	}
	const visit = (node: V1): boolean => {
		const kids = node.typNode === 'row' ? (node.nodKids ?? []) : []
		const open = kids.filter(
			(kid) => !(kid.typNode === 'tabset' && kid.nodFold)
		)
		if (open.length > 0 && open.every((kid) => kid.nodPart === 0))
			return true
		return kids.some(visit)
	}
	return visit(saved as V1)
}
