import type { NodeOptions } from '../type'

export function areNodeOptionsMapEqual(
	mapA: Map<string, NodeOptions>,
	mapB: Map<string, NodeOptions>
): boolean {
	if (mapA.size !== mapB.size) return false

	for (const [key, valA] of mapA.entries()) {
		const valB = mapB.get(key)
		if (!valB) return false

		if (!areNodeOptionsEqual(valA, valB)) {
			return false
		}
	}

	return true
}

export function areNodeOptionsEqual(a: NodeOptions, b: NodeOptions): boolean {
	if (a.typNode !== b.typNode) return false
	if (a.nodName !== b.nodName) return false
	if (a.uidNode !== b.uidNode) return false
	if (a.nodPart !== b.nodPart) return false
	if (a.nodFold !== b.nodFold) return false
	if (a.nodMaxd !== b.nodMaxd) return false
	if (a.nodHidden !== b.nodHidden) return false
	if (a.nodLocked !== b.nodLocked) return false

	const dimA = a.nodDims
	const dimB = b.nodDims

	return (
		dimA.x === dimB.x &&
		dimA.y === dimB.y &&
		dimA.w === dimB.w &&
		dimA.h === dimB.h
	)
}
