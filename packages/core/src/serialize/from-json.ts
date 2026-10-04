import { DynamixLayoutError, type WarningHandler } from '../errors'
import type {
	Direction,
	LayoutModel,
	RowChild,
	RowNode,
	TabsetNode,
} from '../model/types'
import { normalizeTree } from '../tree/normalize'
import { normalizeViewState } from '../tree/view-state'
import type { LayoutJSON } from './schema'

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

const fail = (message: string, path: string): never => {
	throw new DynamixLayoutError('INVALID_LAYOUT', message, path)
}

const DIRECTIONS: readonly Direction[] = ['horizontal', 'vertical']

/**
 * Validates a v2 layout and turns it into a normalized model. Problems that
 * can be repaired (invalid weights or active tabs, duplicate tabs) are
 * repaired and reported; anything else throws.
 *
 * @throws {DynamixLayoutError} `INVALID_LAYOUT` with the path of the problem.
 */
export function layoutFromJSON(
	input: LayoutJSON,
	onWarning: WarningHandler
): Pick<LayoutModel, 'root' | 'maximizedTabsetId'> {
	const seenNodes = new Set<string>()
	const seenTabs = new Set<string>()

	const readId = (node: Json, path: string) => {
		if (typeof node.id !== 'string' || node.id === '')
			fail('Expected a non-empty string id', `${path}.id`)
		const id = node.id as string
		if (seenNodes.has(id)) fail(`Duplicate node id "${id}"`, `${path}.id`)
		seenNodes.add(id)
		return id
	}

	const readWeight = (node: Json, path: string) => {
		const weight = node.weight
		if (
			typeof weight === 'number' &&
			Number.isFinite(weight) &&
			weight >= 0
		)
			return weight
		onWarning({
			code: 'INVALID_WEIGHT',
			message: `Invalid weight replaced by 100`,
			path: `${path}.weight`,
		})
		return 100
	}

	const readTabset = (node: Json, path: string): TabsetNode => {
		const id = readId(node, path)
		if (!Array.isArray(node.children))
			fail('Expected a children array', `${path}.children`)
		const children = (node.children as unknown[]).flatMap((tab, i) => {
			const tabPath = `${path}.children[${i}]`
			if (
				!isObject(tab) ||
				tab.type !== 'tab' ||
				typeof tab.id !== 'string' ||
				tab.id === ''
			)
				fail('Expected { type: "tab", id: string }', tabPath)
			const tabId = (tab as Json).id as string
			if (seenTabs.has(tabId)) {
				onWarning({
					code: 'DUPLICATE_TAB_ID',
					message: `Duplicate tab "${tabId}" dropped`,
					path: tabPath,
				})
				return []
			}
			seenTabs.add(tabId)
			return [{ type: 'tab' as const, id: tabId }]
		})
		const active = node.activeTabId
		if (active !== undefined && !children.some((tab) => tab.id === active))
			onWarning({
				code: 'INVALID_ACTIVE_TAB',
				message: `Active tab "${String(active)}" is not in the tabset`,
				path: `${path}.activeTabId`,
			})
		return {
			type: 'tabset',
			id,
			weight: readWeight(node, path),
			activeTabId:
				typeof active === 'string' ? active : (children[0]?.id ?? ''),
			isFolded: node.isFolded === true,
			children,
		}
	}

	const readRow = (node: Json, path: string): RowNode => {
		const id = readId(node, path)
		if (!DIRECTIONS.includes(node.direction as Direction))
			fail(
				'Expected direction "horizontal" or "vertical"',
				`${path}.direction`
			)
		if (!Array.isArray(node.children))
			fail('Expected a children array', `${path}.children`)
		const children = (node.children as unknown[]).map(
			(child, i): RowChild => {
				const childPath = `${path}.children[${i}]`
				if (!isObject(child))
					return fail('Expected a row or tabset', childPath)
				if (child.type === 'row') return readRow(child, childPath)
				if (child.type === 'tabset') return readTabset(child, childPath)
				return fail(
					'Expected type "row" or "tabset"',
					`${childPath}.type`
				)
			}
		)
		return {
			type: 'row',
			id,
			weight: readWeight(node, path),
			direction: node.direction as Direction,
			children,
		}
	}

	if (!isObject(input.root) || input.root.type !== 'row')
		fail('Expected a root row', 'root')
	const root = normalizeTree(readRow(input.root as unknown as Json, 'root'))
	const maximized =
		typeof input.maximizedTabsetId === 'string'
			? input.maximizedTabsetId
			: null
	const model = normalizeViewState({
		root,
		maximizedTabsetId: maximized,
		lastActiveTabsetId: null,
		foldOrder: [],
	})
	return { root: model.root, maximizedTabsetId: model.maximizedTabsetId }
}
