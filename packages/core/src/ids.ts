import type { CreateId } from './model/types'

/** An id factory that also knows which ids are taken. */
export interface IdGenerator {
	readonly createId: CreateId
	/** Marks ids from a loaded layout as taken. */
	reserve(ids: Iterable<string>): void
	/** Forgets every id, so rebuilding a layout produces the same ids again. */
	reset(): void
}

const PREFIX = { row: 'row', tabset: 'ts' } as const

/**
 * Deterministic ids: the same calls produce the same ids on the server and
 * the client. A tabset is named after a tab when a hint is given (`ts-editor`);
 * otherwise a per-instance counter is used. Taken ids are always skipped.
 */
export function createIdGenerator(custom?: CreateId): IdGenerator {
	const taken = new Set<string>()
	let counter = 0

	const createId: CreateId = (kind, hint) => {
		if (custom) {
			const id = custom(kind, hint)
			taken.add(id)
			return id
		}
		let id = hint === undefined ? '' : `${PREFIX[kind]}-${hint}`
		while (id === '' || taken.has(id)) id = `${PREFIX[kind]}-${++counter}`
		taken.add(id)
		return id
	}

	return {
		createId,
		reserve(ids) {
			for (const id of ids) taken.add(id)
		},
		reset() {
			taken.clear()
			counter = 0
		},
	}
}
