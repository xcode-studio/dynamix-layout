///<reference types="vitest" />
import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs'
import dts from 'vite-plugin-dts'
import { visualizer } from 'rollup-plugin-visualizer'
import { licenseBanner } from '../../scripts/build/license-banner'

export default defineConfig({
	server: { port: 5174, open: false },
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: './src/test/setup.ts',
		server: { deps: { inline: ['@dynamix-layout/core'] } },
	},
	plugins: [
		dts({
			outDir: 'dist',
			tsconfigPath: './tsconfig.build.json',
			// Types-only modules never reach the bundle graph; list sources explicitly.
			include: ['src'],
			exclude: ['node_modules/**', 'src/test/**'],
			// Keep `@dynamix-layout/core` as a package import in the .d.ts files; the
			// tsconfig path to its sources is only for developing in this repo.
			aliasesExclude: [/^@dynamix-layout\/core/],
			pathsToAliases: false,
			// One self-contained declaration file, copied to index.d.cts for `require`.
			rollupTypes: true,
			afterBuild: () => fs.copyFileSync(resolve(__dirname, 'dist/index.d.ts'), resolve(__dirname, 'dist/index.d.cts')),
		}),
		licenseBanner('@dynamix-layout/react'),
		visualizer({ filename: 'react.html', gzipSize: true, brotliSize: true, template: 'treemap' }),
	],
	build: {
		target: 'es2020',
		sourcemap: 'hidden',
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			// `.cjs` so Node loads the CommonJS build as CommonJS in this `"type": "module"` package.
			fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
			formats: ['es', 'cjs'],
			cssFileName: 'styles',
		},
		rollupOptions: {
			// Subpaths too: bundling `react/jsx-runtime` would tie the package to one React version.
			external: [/^react($|\/)/, /^react-dom($|\/)/, /^@dynamix-layout\/core($|\/)/],
			output: {
				// Next.js App Router: everything here uses hooks or the DOM.
				banner: "'use client';",
			},
		},
	},
	resolve: {
		alias: [
			{ find: '@', replacement: resolve(__dirname, './src') },
			{ find: '@dynamix-layout/core', replacement: resolve(__dirname, '../core/src') },
		],
	},
})
