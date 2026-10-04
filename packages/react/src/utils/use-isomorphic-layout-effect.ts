import { useEffect, useLayoutEffect } from 'react'

/**
 * `useLayoutEffect` in the browser (runs before paint, so measurements and
 * DOM writes never flash) and `useEffect` on the server, where layout effects
 * warn and never run anyway.
 */
export const useIsomorphicLayoutEffect =
	typeof window === 'undefined' ? useEffect : useLayoutEffect
