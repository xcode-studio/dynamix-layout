import { Node, Bond } from './node'
import { layoutState } from './state'
import type { DynamixLayoutCore as Layout } from './dynamix'

/** Moving a bond (slider) between two siblings. */

export function updateSlider(
	engine: Layout,
	id: string,
	dim: { x: number; y: number },
	disableTimeout: boolean = false,
	timeout: number = 2
) {
	if (disableTimeout) {
		engine.updateSliderDimension(id, dim)
		return
	}

	if (engine.cntdown) {
		layoutState.timer.clear(engine.cntdown)
		engine.cntdown = null
	}

	engine.cntdown = layoutState.timer.set(() => {
		engine.cntdown = null
		engine.updateSliderDimension(id, dim)
	}, timeout)
}

export function updateSliderDimension(
	engine: Layout,
	id: string,
	dim: { x: number; y: number }
) {
	const bnd = Node.cache.mapElem.get(id)

	if (!bnd || !(bnd instanceof Bond)) {
		console.warn(`Bond with id ${id} not found or is not a Bond instance`)
		return
	}

	const dir = Node.cache.mapDirs.get(bnd.host!.unId)

	const prev = bnd.prev
	const next = bnd.next
	const host = bnd.host

	if (!prev || !next || !host) {
		console.warn('Missing prev, next, or host node', prev, next, host)
		return
	}

	const prevMinDim = Node.cache.dimMins.get(prev.unId) || {
		minWidth: 0,
		minHeight: 0,
	}
	const nextMinDim = Node.cache.dimMins.get(next.unId) || {
		minWidth: 0,
		minHeight: 0,
	}
	const half = layoutState.bond / 2

	if (dir) {
		const endX = next.dims.x + next.dims.w

		const minX = prev.dims.x + prevMinDim.minWidth + half
		const maxX = endX - nextMinDim.minWidth - half

		const clampedX = Math.max(minX, Math.min(maxX, dim.x))

		bnd.dims.x = clampedX - half

		prev.dims.w = bnd.dims.x - prev.dims.x

		next.dims.x = clampedX + half
		next.dims.w = endX - next.dims.x

		const prevExtraSpace = Math.max(0, prev.dims.w - prevMinDim.minWidth)
		const nextExtraSpace = Math.max(0, next.dims.w - nextMinDim.minWidth)
		const totalExtraSpace = prevExtraSpace + nextExtraSpace
		const totalPart = prev.part + next.part

		if (totalExtraSpace > 0) {
			prev.part = (prevExtraSpace / totalExtraSpace) * totalPart
			next.part = (nextExtraSpace / totalExtraSpace) * totalPart
		} else {
			prev.part = totalPart / 2
			next.part = totalPart / 2
		}
	} else {
		const endY = next.dims.y + next.dims.h

		const minY = prev.dims.y + prevMinDim.minHeight + half
		const maxY = endY - nextMinDim.minHeight - half

		const clampedY = Math.max(minY, Math.min(maxY, dim.y))

		bnd.dims.y = clampedY - half

		prev.dims.h = bnd.dims.y - prev.dims.y

		next.dims.y = clampedY + half
		next.dims.h = endY - next.dims.y

		const prevExtraSpace = Math.max(0, prev.dims.h - prevMinDim.minHeight)
		const nextExtraSpace = Math.max(0, next.dims.h - nextMinDim.minHeight)
		const totalExtraSpace = prevExtraSpace + nextExtraSpace
		const totalPart = prev.part + next.part

		if (totalExtraSpace > 0) {
			prev.part = (prevExtraSpace / totalExtraSpace) * totalPart
			next.part = (nextExtraSpace / totalExtraSpace) * totalPart
		} else {
			prev.part = totalPart / 2
			next.part = totalPart / 2
		}
	}

	engine.calcDimensions(host)
}
