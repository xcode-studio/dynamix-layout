import { useCallback, useRef } from 'react'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'

/**
 * A function with a stable identity that always calls the latest `callback`.
 * The ref is updated in a layout effect, never during render.
 */
export function useStableCallback<Args extends unknown[], Result>(
	callback: ((...args: Args) => Result) | undefined
): (...args: Args) => Result | undefined {
	const ref = useRef(callback)
	useIsomorphicLayoutEffect(() => {
		ref.current = callback
	})
	return useCallback((...args: Args) => ref.current?.(...args), [])
}
