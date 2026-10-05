/**
 * Encodes any tab or tabset id into characters that are safe in an HTML id
 * and in CSS selectors. Injective: different ids never collide.
 */
export function encodeId(id: string): string {
	return id.replace(
		/[^A-Za-z0-9-]/g,
		(char) => `_${char.codePointAt(0)!.toString(36)}_`
	)
}

/** DOM ids for ARIA relationships, scoped to one layout via React's `useId`. */
export function createDomIds(base: string) {
	const prefix = `dx${encodeId(base)}`
	return {
		tab: (tabId: string) => `${prefix}-tab-${encodeId(tabId)}`,
		tabContent: (tabId: string) => `${prefix}-content-${encodeId(tabId)}`,
		panel: (tabsetId: string) => `${prefix}-panel-${encodeId(tabsetId)}`,
		live: `${prefix}-live`,
	}
}

export type DomIds = ReturnType<typeof createDomIds>
