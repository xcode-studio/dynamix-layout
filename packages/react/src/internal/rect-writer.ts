import type { LayoutSnapshot } from '@dynamix-layout/core'
import type { LayoutController } from './controller'
import { splitterAria } from './splitter-aria'
import {
	applySlotGeometry,
	getSlotGeometry,
	type PositionedSlot,
	type SlotGeometry,
} from './slot-geometry'

/**
 * The DOM fast path. Pointer moves (splitter drags, drop targeting) and
 * container resizes change only rects, which React never subscribes to, so
 * React doesn't re-render; this writer moves the registered elements instead.
 *
 * Components render the same geometry from the current snapshot
 * (`getSlotGeometry`), so a later render and the writer always agree: React
 * diffs props against its previous props, never against the DOM.
 */

const SLOTS: readonly PositionedSlot[] = [
	'panel',
	'tabBar',
	'tabContent',
	'splitter',
	'dropIndicator',
	'rootDropZone',
]

const sameGeometry = (a: SlotGeometry | undefined, b: SlotGeometry) =>
	!!a &&
	a.isHidden === b.isHidden &&
	a.isRotated === b.isRotated &&
	a.rect.x === b.rect.x &&
	a.rect.y === b.rect.y &&
	a.rect.width === b.rect.width &&
	a.rect.height === b.rect.height

/** Splitter values change on every drag frame, so they're kept current here, not by renders. */
function writeSplitterAria(
	controller: LayoutController,
	element: HTMLElement,
	id: string
) {
	const { percent } = splitterAria(controller, id)
	if (!percent) return
	element.setAttribute('aria-valuenow', String(percent.now))
	element.setAttribute('aria-valuemin', String(percent.min))
	element.setAttribute('aria-valuemax', String(percent.max))
}

/** Starts writing positions on every snapshot. @returns A function that stops it. */
export function startRectWriter(controller: LayoutController): () => void {
	const written = new WeakMap<HTMLElement, SlotGeometry>()

	const write = (snapshot: LayoutSnapshot) => {
		controller.root?.toggleAttribute('data-dx-dragging', !!snapshot.drag)
		for (const slot of SLOTS) {
			controller.elements(slot).forEach((element, id) => {
				const geometry = getSlotGeometry(
					snapshot,
					controller.options,
					slot,
					id
				)
				if (!geometry || sameGeometry(written.get(element), geometry))
					return
				applySlotGeometry(element, geometry)
				written.set(element, geometry)
				if (slot === 'splitter')
					writeSplitterAria(controller, element, id)
			})
		}
	}

	write(controller.engine.getSnapshot())
	return controller.engine.subscribe(write)
}
