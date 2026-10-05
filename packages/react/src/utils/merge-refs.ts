import type { MutableRefObject, Ref, RefCallback } from 'react'

/** Assigns `value` to a callback or object ref. */
export function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
	if (typeof ref === 'function') ref(value)
	else if (ref) (ref as MutableRefObject<T | null>).current = value
}

/** One callback ref that forwards to every given ref. */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
	return (value) => refs.forEach((ref) => assignRef(ref, value))
}
