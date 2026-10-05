import type { LayoutController as Core } from './controller'

/** ARIA values as percentages of the two neighbours' combined size. */
export function splitterAria(core: Core, splitterId: string) {
	const bounds = core.engine.getSplitterBounds(splitterId)
	const snapshot = core.engine.getSnapshot()
	const splitter = snapshot.splitters.get(splitterId)
	const after =
		splitter &&
		(snapshot.rects.tabsets.get(splitter.afterId) ??
			snapshot.rects.rows.get(splitter.afterId))
	if (!bounds || !splitter || !after) return { bounds, percent: null }
	const afterSize =
		splitter.direction === 'horizontal' ? after.width : after.height
	const total = bounds.value + afterSize || 1
	const percent = (value: number) => Math.round((value / total) * 100)
	return {
		bounds,
		percent: {
			now: percent(bounds.value),
			min: percent(bounds.min),
			max: percent(bounds.max),
		},
	}
}
