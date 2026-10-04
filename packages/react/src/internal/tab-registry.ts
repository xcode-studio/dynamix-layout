import { useCallback, useSyncExternalStore } from 'react'
import type { HeadlessTabItem } from '../types'

/**
 * The `tabs` prop as a store with one subscription per tab. Titles and
 * content live here, outside the engine, so changing them never touches the
 * layout, and a component reading one tab re-renders only when that tab's item
 * changes (an inline `tabs` array with unchanged items re-renders nothing).
 */
export interface TabRegistry {
	get(tabId: string): HeadlessTabItem | undefined
	subscribe(tabId: string, listener: () => void): () => void
	/** Applies a new `tabs` prop; notifies only tabs whose item changed. */
	update(items: readonly HeadlessTabItem[]): void
}

const sameItem = (a: HeadlessTabItem, b: HeadlessTabItem) =>
	a.title === b.title &&
	a.content === b.content &&
	a.closable === b.closable &&
	a.target === b.target

export function createTabRegistry(
	initial: readonly HeadlessTabItem[]
): TabRegistry {
	let items = new Map(initial.map((item) => [item.id, item]))
	const listeners = new Map<string, Set<() => void>>()

	return {
		get: (tabId) => items.get(tabId),
		subscribe(tabId, listener) {
			let set = listeners.get(tabId)
			if (!set) listeners.set(tabId, (set = new Set()))
			set.add(listener)
			return () => set!.delete(listener)
		},
		update(next) {
			const previous = items
			const changed: string[] = []
			items = new Map(
				next.map((item) => {
					const old = previous.get(item.id)
					if (old && sameItem(old, item)) return [item.id, old]
					changed.push(item.id)
					return [item.id, item]
				})
			)
			for (const id of previous.keys())
				if (!items.has(id)) changed.push(id)
			for (const id of changed)
				listeners.get(id)?.forEach((listener) => listener())
		},
	}
}

/** Subscribes to one tab's item. */
export function useTabItem(
	registry: TabRegistry,
	tabId: string
): HeadlessTabItem | undefined {
	const subscribe = useCallback(
		(listener: () => void) => registry.subscribe(tabId, listener),
		[registry, tabId]
	)
	const get = () => registry.get(tabId)
	return useSyncExternalStore(subscribe, get, get)
}
