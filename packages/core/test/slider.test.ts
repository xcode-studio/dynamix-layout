import { describe, it, expect, beforeEach } from 'vitest'
import { DynamixLayoutCore, Node, Bond } from '../src'

describe('Slider updates', () => {
	beforeEach(() => {
		const layout = new DynamixLayoutCore()
		layout.clearAllCache()
	})

	it('keeps tabsets, bonds and tabs outside the dragged subtree', () => {
		const tabs = ['a', 'b', 'c', 'd', 'e']
		const layout = new DynamixLayoutCore({ tabs })
		layout.updateDimension({ w: 1200, h: 800, x: 0, y: 0 }, true)

		const tabsetIds = [...Node.cache.nodOpts.get().keys()]
		const bondIds = [...Node.cache.bndOpts.get().keys()]
		const tabIds = [...Node.cache.tabOpts.get().keys()]

		const nestedBondId = bondIds.find((id) => {
			const bond = Node.cache.mapElem.get(id)
			return bond instanceof Bond && bond.host !== DynamixLayoutCore._root
		})
		expect(nestedBondId).toBeDefined()

		const bond = Node.cache.mapElem.get(nestedBondId!) as Bond
		layout.updateSliderDimension(nestedBondId!, {
			x: bond.dims.x + 20,
			y: bond.dims.y + 20,
		})

		expect([...Node.cache.nodOpts.get().keys()].sort()).toEqual(
			tabsetIds.sort()
		)
		expect([...Node.cache.bndOpts.get().keys()].sort()).toEqual(
			bondIds.sort()
		)
		expect([...Node.cache.tabOpts.get().keys()].sort()).toEqual(
			tabIds.sort()
		)
	})

	it('notifies listeners once per update and stops after unsubscribe', () => {
		const layout = new DynamixLayoutCore({ tabs: ['a', 'b', 'c'] })
		layout.updateDimension({ w: 900, h: 600, x: 0, y: 0 }, true)

		let calls = 0
		const off = Node.cache.bndOpts.onChange(() => calls++)

		const bondId = [...Node.cache.bndOpts.get().keys()][0]
		const bond = Node.cache.mapElem.get(bondId) as Bond
		layout.updateSliderDimension(bondId, {
			x: bond.dims.x + 30,
			y: bond.dims.y + 30,
		})
		expect(calls).toBe(1)

		off()
		layout.updateSliderDimension(bondId, {
			x: bond.dims.x + 30,
			y: bond.dims.y + 30,
		})
		expect(calls).toBe(1)
	})
})
