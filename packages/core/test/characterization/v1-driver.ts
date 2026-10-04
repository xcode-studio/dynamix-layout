import { DynamixLayoutCore, Node, Bond } from '../../src'
import type { LayoutTree, NodeOptions } from '../../src'
import {
	normalizeCanonical,
	tabsetKey,
	type CanonicalNode,
	type CanonicalRow,
	type Driver,
	type Observation,
	type Operation,
	type RectTuple,
} from './scenario'

/** Settings that match the React adapter's defaults. */
export const V1_SETTINGS = { bond: 10, minW: 40, minH: 40, collapsedSize: 40 }

const tuple = (d: {
	x: number
	y: number
	w: number
	h: number
}): RectTuple => [d.x, d.y, d.w, d.h]

const firstTabOf = (node: Node): string =>
	node.type === 'tab' ? node.name : firstTabOf([...node.kids][0])

/** Drives the v1 `DynamixLayoutCore` (global state, so one at a time). */
export function createV1Driver(): Driver {
	let engine: DynamixLayoutCore
	let container = { width: 0, height: 0 }

	const findTab = (name: string): Node => {
		for (const element of Node.cache.mapElem.values()) {
			if (
				element instanceof Node &&
				element.type === 'tab' &&
				element.name === name
			)
				return element
		}
		throw new Error(`v1 driver: tab ${name} not found`)
	}

	const findBond = (before: string, after: string): Bond | null => {
		for (const id of Node.cache.bndOpts.get().keys()) {
			const bond = Node.cache.mapElem.get(id)
			if (!(bond instanceof Bond) || !bond.prev || !bond.next) continue
			if (
				firstTabOf(bond.prev) === before &&
				firstTabOf(bond.next) === after
			)
				return bond
		}
		return null
	}

	const resize = () =>
		engine.updateDimension(
			{ x: 0, y: 0, w: container.width, h: container.height },
			true
		)

	return {
		create(tabs, size, saved) {
			new DynamixLayoutCore().clearAllCache()
			let counter = 0
			container = { ...size }
			engine = new DynamixLayoutCore({
				tabs,
				tree: (saved as LayoutTree | undefined) ?? null,
				...V1_SETTINGS,
				createId: () => `id-${++counter}`,
			})
			resize()
		},

		apply(operation: Operation) {
			switch (operation.op) {
				case 'resize':
					container = {
						width: operation.width,
						height: operation.height,
					}
					resize()
					return undefined
				case 'fold':
					return engine.toggleCollapse(
						findTab(operation.tabsetOf).host!.unId
					)
				case 'maximize':
					return engine.toggleMaximize(
						findTab(operation.tabsetOf).host!.unId
					)
				case 'splitter': {
					const bond = findBond(operation.before, operation.after)
					if (bond)
						engine.updateSliderDimension(bond.unId, operation.point)
					return undefined
				}
				case 'move': {
					const { source, target } = operation
					const src =
						'tab' in source
							? findTab(source.tab).unId
							: findTab(source.tabsetOf).host!.unId
					if ('root' in target)
						return engine.updateTree(
							src,
							DynamixLayoutCore._root.unId,
							target.root
						)
					if ('tab' in target)
						return engine.updateTree(
							src,
							findTab(target.tab).unId,
							target.position
						)
					return engine.updateTree(
						src,
						findTab(target.tabsetOf).host!.unId,
						target.area
					)
				}
			}
		},

		observe(): Observation {
			const toCanonical = (node: Node): CanonicalNode => {
				if (node.type === 'tabset') {
					const tabset = {
						tabs: [...node.kids].map((kid) => kid.name),
						active: node.open,
					}
					return node.collapsed ? { ...tabset, folded: true } : tabset
				}
				return {
					direction: Node.cache.mapDirs.get(node.unId)
						? 'horizontal'
						: 'vertical',
					children: [...node.kids].map(toCanonical),
				}
			}

			const tabsets: Record<string, RectTuple> = {}
			let maximized: string | null = null
			for (const option of Node.cache.nodOpts.get().values()) {
				const key = tabsetKey(
					(option.nodKids ?? []).map(
						(kid) => (kid as NodeOptions).nodName
					)
				)
				tabsets[key] = tuple(option.nodDims)
				if (option.nodMaxd) maximized = key
			}

			const splitters: Record<string, RectTuple> = {}
			for (const [id, option] of Node.cache.bndOpts.get()) {
				const bond = Node.cache.mapElem.get(id)
				if (!(bond instanceof Bond) || !bond.prev || !bond.next)
					continue
				splitters[`${firstTabOf(bond.prev)}>${firstTabOf(bond.next)}`] =
					tuple(option.nodDims)
			}

			return {
				tree: normalizeCanonical(
					toCanonical(DynamixLayoutCore._root) as CanonicalRow
				),
				tabsets,
				splitters,
				maximized,
			}
		},

		save() {
			return DynamixLayoutCore._root.toJSON()
		},
	}
}
