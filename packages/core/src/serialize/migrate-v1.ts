import { DynamixLayoutError, type WarningHandler } from '../errors'
import type { Direction } from '../model/types'
import { layoutFromJSON } from './from-json'
import type { LayoutJSON, LayoutTreeV1, RowJSON, TabsetJSON } from './schema'
import { toLayoutJSON } from './to-json'

/** @returns `true` when `input` looks like a layout saved by v1. */
export function isLayoutV1(input: unknown): input is LayoutTreeV1 {
	return (
		typeof input === 'object' &&
		input !== null &&
		!('version' in input) &&
		typeof (input as { typNode?: unknown }).typNode === 'string'
	)
}

const isValidWeight = (part: unknown): part is number =>
	typeof part === 'number' && Number.isFinite(part) && part >= 0

/**
 * Converts a layout saved by v1 to the v2 format, losslessly:
 * - a tab's identity was its label (`nodName`), which becomes its `id`; v1
 *   tab `uidNode`s were per-session and are dropped;
 * - `nodPart` becomes `weight` (same meaning), so the layout renders
 *   pixel-identically;
 * - directions, implicit in v1 (the root is horizontal and every level flips),
 *   become explicit;
 * - `nodOpen`, `nodFold` and `nodMaxd` become `activeTabId`, `isFolded` and
 *   `maximizedTabsetId`.
 *
 * Damaged input is repaired where possible (see the migration guide):
 * duplicate tabs keep their first occurrence, unknown active tabs fall back to
 * the first tab, empty tabsets and rows are removed, stray tabs are wrapped in
 * a tabset, and the result is normalized.
 *
 * @param tree - The v1 layout (`DynamixLayoutCore._root.toJSON()`).
 * @returns The equivalent v2 layout.
 * @throws {DynamixLayoutError} `INVALID_LAYOUT` when `tree` is not a v1 layout.
 * @example
 * const saved = JSON.parse(localStorage.getItem('layout')!)
 * const layout = isLayoutV1(saved) ? migrateLayoutFromV1(saved) : saved
 */
export function migrateLayoutFromV1(
	tree: LayoutTreeV1,
	options: { onWarning?: WarningHandler } = {}
): LayoutJSON {
	const warn: WarningHandler = options.onWarning ?? (() => {})
	const weightOf = (node: LayoutTreeV1, path: string) => {
		if (isValidWeight(node.nodPart)) return node.nodPart
		warn({
			code: 'INVALID_WEIGHT',
			message: 'Invalid weight replaced by 100',
			path: `${path}.nodPart`,
		})
		return 100
	}
	if (!isLayoutV1(tree))
		throw new DynamixLayoutError('INVALID_LAYOUT', 'Not a v1 layout', '')

	const usedIds = new Set<string>()
	const collect = (node: LayoutTreeV1) => {
		if (typeof node.uidNode === 'string') usedIds.add(node.uidNode)
		node.nodKids?.forEach(collect)
	}
	collect(tree)
	const freshId = (base: string) => {
		let id = base
		for (let n = 1; usedIds.has(id); n++) id = `${base}-${n}`
		usedIds.add(id)
		return id
	}
	const nodeId = (node: LayoutTreeV1, fallback: string) =>
		typeof node.uidNode === 'string' && node.uidNode !== ''
			? node.uidNode
			: freshId(fallback)

	const seenTabs = new Set<string>()
	const readTabs = (kids: readonly LayoutTreeV1[], path: string) =>
		kids.flatMap((kid, i) => {
			if (kid?.typNode !== 'tab') return []
			const id = kid.nodName
			if (typeof id !== 'string' || id === '' || seenTabs.has(id)) {
				warn({
					code: 'DUPLICATE_TAB_ID',
					message: `Duplicate or unnamed tab "${String(id)}" dropped`,
					path: `${path}.nodKids[${i}]`,
				})
				return []
			}
			seenTabs.add(id)
			return [{ type: 'tab' as const, id }]
		})

	const toTabset = (node: LayoutTreeV1, path: string): TabsetJSON => {
		const children = readTabs(node.nodKids ?? [], path)
		const open = typeof node.nodOpen === 'string' ? node.nodOpen : ''
		const hasOpen = children.some((tab) => tab.id === open)
		if (open && !hasOpen && children.length > 0)
			warn({
				code: 'INVALID_ACTIVE_TAB',
				message: `Active tab "${open}" is not in the tabset`,
				path: `${path}.nodOpen`,
			})
		return {
			type: 'tabset',
			id: nodeId(node, 'ts'),
			weight: weightOf(node, path),
			...(children.length > 0
				? { activeTabId: hasOpen ? open : children[0].id }
				: {}),
			...(node.nodFold === true ? { isFolded: true } : {}),
			children,
		}
	}

	const toRow = (
		node: LayoutTreeV1,
		depth: number,
		path: string
	): RowJSON => {
		const direction: Direction = depth % 2 === 0 ? 'horizontal' : 'vertical'
		const children: RowJSON['children'] = []
		;(node.nodKids ?? []).forEach((kid, i) => {
			const kidPath = `${path}.nodKids[${i}]`
			if (kid?.typNode === 'row')
				children.push(toRow(kid, depth + 1, kidPath))
			else if (kid?.typNode === 'tabset')
				children.push(toTabset(kid, kidPath))
			else if (kid?.typNode === 'tab')
				children.push({
					...toTabset(
						{
							...kid,
							typNode: 'tabset',
							uidNode: freshId(`ts-${kid.nodName}`),
							nodKids: [kid],
							nodOpen: kid.nodName,
						},
						kidPath
					),
				})
		})
		return {
			type: 'row',
			id: nodeId(node, 'row'),
			weight: weightOf(node, path),
			direction,
			children,
		}
	}

	const root: RowJSON =
		tree.typNode === 'row'
			? toRow(tree, 0, 'root')
			: tree.typNode === 'tabset'
				? {
						type: 'row',
						id: freshId('root'),
						weight: 100,
						direction: 'horizontal',
						children: [toTabset(tree, 'root')],
					}
				: (() => {
						throw new DynamixLayoutError(
							'INVALID_LAYOUT',
							`A v1 layout root must be a row, not "${tree.typNode}"`,
							'root'
						)
					})()

	const json: LayoutJSON = {
		version: 2,
		root,
		...(typeof tree.nodMaxd === 'string'
			? { maximizedTabsetId: tree.nodMaxd }
			: {}),
	}
	return toLayoutJSON(layoutFromJSON(json, warn))
}
