import type { Plugin } from 'vite'

const DIRECTIVE = /^(['"])use client\1;?/

/**
 * Starts every chunk with `/*! <name> | MIT License *\/`. Rollup's
 * `output.banner` is added before Vite minifies, and the minifier drops it, so
 * this runs in `generateBundle`, after minification. The comment goes on the
 * first line (after a `'use client'` directive) so source maps stay aligned.
 */
export function licenseBanner(name: string): Plugin {
	const banner = `/*! ${name} | MIT License */ `
	return {
		name: 'dynamix-license-banner',
		apply: 'build',
		generateBundle(_, bundle) {
			for (const chunk of Object.values(bundle)) {
				if (chunk.type !== 'chunk') continue
				const directive = chunk.code.match(DIRECTIVE)?.[0] ?? ''
				chunk.code = `${directive}${banner}${chunk.code.slice(directive.length)}`
			}
		},
	}
}
