import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { recordScenario, type Scenario } from './scenario'
import { createV1Driver } from './v1-driver'

/**
 * Records v1 behaviour as fixtures, and checks the v1 engine still matches
 * them. Run with `UPDATE_V1_FIXTURES=1` to regenerate. Once v1 is removed the
 * fixtures are frozen and only the v2 replay (`v2.test.ts`) uses them.
 */

const FIXTURE_DIR = resolve(__dirname, '../fixtures/v1')
const TAB_NAMES = [
	'editor',
	'terminal',
	'preview',
	'console',
	'files',
	'search',
	'git',
	'output',
	'debug',
]
const SCENARIO_COUNT = 16
const STEPS = 30

export const scenarioFiles = Array.from(
	{ length: SCENARIO_COUNT },
	(_, i) => `scenario-${String(i + 1).padStart(2, '0')}.json`
)

const build = (index: number): Scenario => {
	const tabCount = (index % 9) + 1
	const container =
		index % 4 === 3
			? { width: 640, height: 420 }
			: { width: 1200, height: 800 }
	return recordScenario(
		createV1Driver(),
		`${tabCount} tabs, seed ${index + 1}`,
		TAB_NAMES.slice(0, tabCount),
		container,
		index + 1,
		STEPS
	)
}

describe('v1 characterization fixtures', () => {
	if (process.env.UPDATE_V1_FIXTURES) {
		it('writes fixtures', () => {
			if (!existsSync(FIXTURE_DIR))
				mkdirSync(FIXTURE_DIR, { recursive: true })
			scenarioFiles.forEach((file, i) => {
				writeFileSync(
					resolve(FIXTURE_DIR, file),
					JSON.stringify(build(i)) + '\n'
				)
			})
		})
		return
	}

	scenarioFiles.forEach((file, i) => {
		it(`v1 engine still matches ${file}`, () => {
			const stored = JSON.parse(
				readFileSync(resolve(FIXTURE_DIR, file), 'utf8')
			) as Scenario
			expect(build(i)).toEqual(stored)
		})
	})
})
