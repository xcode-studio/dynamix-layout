import type { CSSProperties, Ref } from 'react'
import { mergeRefs } from './merge-refs'

type AnyProps = Record<string, unknown> & {
	className?: string
	style?: CSSProperties
	ref?: Ref<unknown>
}

const isHandler = (key: string, value: unknown) =>
	/^on[A-Z]/.test(key) && typeof value === 'function'

/**
 * Merges user props with the library's props for prop getters:
 * - `className`s are joined;
 * - `style`s are merged, library positioning last so it always applies;
 * - `ref`s are combined;
 * - handlers run the user's first; if it calls `event.preventDefault()`, the
 *   library's handler is skipped;
 * - any other library prop wins (ARIA and data attributes must be correct).
 */
export function mergeProps<User extends object, Own extends object>(
	user: User | undefined,
	own: Own
): User & Own {
	const result: AnyProps = { ...(user as AnyProps) }
	const userProps = (user ?? {}) as AnyProps
	for (const [key, value] of Object.entries(own as AnyProps)) {
		const userValue = userProps[key]
		if (key === 'className') {
			result.className =
				[value, userValue].filter(Boolean).join(' ') || undefined
		} else if (key === 'style') {
			result.style = {
				...(userValue as CSSProperties),
				...(value as CSSProperties),
			}
		} else if (key === 'ref') {
			result.ref = userValue
				? mergeRefs(userValue as Ref<unknown>, value as Ref<unknown>)
				: (value as Ref<unknown>)
		} else if (isHandler(key, value) && typeof userValue === 'function') {
			result[key] = (
				event: { defaultPrevented?: boolean },
				...rest: unknown[]
			) => {
				;(userValue as (...args: unknown[]) => void)(event, ...rest)
				if (!event?.defaultPrevented)
					(value as (...args: unknown[]) => void)(event, ...rest)
			}
		} else {
			result[key] = value
		}
	}
	return result as User & Own
}
