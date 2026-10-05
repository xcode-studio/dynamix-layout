/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import stripComments from 'vite-plugin-strip-comments'
import { visualizer } from 'rollup-plugin-visualizer'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'
import fs from 'fs'

const license = fs.readFileSync(resolve(__dirname, '../../LICENSE'), 'utf-8')

export default defineConfig({
	define: {
		__LICENSE__: JSON.stringify(license),
	},
	server: {
		port: 5174,
		open: false,
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: './src/test/setup.ts',
		testTransformMode: { web: ['/[jt]sx?$/'] },
		deps: {
			inline: [/@solidjs\/start/, /solid-js/],
		},
	},
	plugins: [
		solidPlugin(),
		dts({
			outDir: 'dist/types',
			tsconfigPath: './tsconfig.build.json',
			// Types-only modules never reach the bundle graph; list sources explicitly.
			include: ['src'],
			// One self-contained declaration file (Node16 resolution can't follow
			// extensionless imports), copied to index.d.cts for `require`.
			rollupTypes: true,
			afterBuild: () =>
				fs.copyFileSync(
					resolve(__dirname, 'dist/types/index.d.ts'),
					resolve(__dirname, 'dist/types/index.d.cts')
				),
			// Keep `@dynamix-layout/core` as a package import in the .d.ts files.
			aliasesExclude: [/^@dynamix-layout\/core/],
			pathsToAliases: false,
			exclude: ['node_modules/**', 'src/test/**'],
			staticImport: true,
		}),
		visualizer({
			filename: 'react.html',
			gzipSize: true,
			brotliSize: true,
			template: 'treemap',
		}),
		stripComments({ type: 'none' }),
	],
	build: {
		target: 'esnext',
		sourcemap: 'hidden',
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'dynamix.layout.solid',
			// `.cjs` so Node loads the CommonJS build as CommonJS in this `"type": "module"` package.
			fileName: (format) => (format === 'cjs' ? 'index.cjs' : `index.${format}.js`),
			formats: ['es', 'cjs'],
		},
		cssCodeSplit: true,
		rollupOptions: {
			external: [/^solid-js($|\/)/, /^@dynamix-layout\/core($|\/)/],
			output: {
				globals: {
					'solid-js': 'solidJs',
					'solid-js/web': 'solidJsWeb',
					'@dynamix-layout/core': 'DynamixLayoutCore',
				},
				preserveModules: false,
			},
		},
	},
	resolve: {
		alias: [
			{ find: '@', replacement: resolve(__dirname, './src') },
			{
				find: '@dynamix-layout/core',
				replacement: resolve(__dirname, '../core/src'),
			},
		],
		conditions: ['development', 'browser'],
	},
	css: {
		modules: {
			localsConvention: 'camelCaseOnly',
		},
	},
})
