/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import { visualizer } from 'rollup-plugin-visualizer'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'
import fs from 'fs'

export default defineConfig({
	server: { port: 5174, open: false },
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: './src/test/setup.ts',
		testTransformMode: { web: ['/[jt]sx?$/'] },
		deps: { inline: [/@solidjs\/start/, /solid-js/] },
	},
	plugins: [
		solidPlugin(),
		dts({
			outDir: 'dist',
			tsconfigPath: './tsconfig.build.json',
			// Types-only modules never reach the bundle graph; list sources explicitly.
			include: ['src'],
			exclude: ['node_modules/**', 'src/test/**'],
			// Keep `@dynamix-layout/core` as a package import in the .d.ts files.
			aliasesExclude: [/^@dynamix-layout\/core/],
			pathsToAliases: false,
			// One self-contained declaration file, copied to index.d.cts for `require`.
			rollupTypes: true,
			afterBuild: () => fs.copyFileSync(resolve(__dirname, 'dist/index.d.ts'), resolve(__dirname, 'dist/index.d.cts')),
		}),
		visualizer({ filename: 'solid.html', gzipSize: true, brotliSize: true, template: 'treemap' }),
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
			external: [/^solid-js($|\/)/, /^@dynamix-layout\/core($|\/)/],
		},
	},
	resolve: {
		alias: [
			{ find: '@', replacement: resolve(__dirname, './src') },
			{ find: '@dynamix-layout/core', replacement: resolve(__dirname, '../core/src') },
		],
		conditions: ['development', 'browser'],
	},
})
