import type { WarningHandler } from './errors'

declare const process: { env: { NODE_ENV?: string } } | undefined

/**
 * Development unless the bundler set `process.env.NODE_ENV` to "production".
 * Written so bundlers can replace the expression; never evaluated at import.
 */
export function isDev(): boolean {
	return (
		typeof process === 'undefined' ||
		// Read at runtime by consumers' bundlers, not a build input of this repo.
		// eslint-disable-next-line turbo/no-undeclared-env-vars
		process.env.NODE_ENV !== 'production'
	)
}

/** Default warning handler: `console.warn` in development, silent in production. */
export const defaultWarningHandler: WarningHandler = (warning) => {
	if (isDev()) console.warn(`[dynamix-layout] ${warning.message}`)
}
