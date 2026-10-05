import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import fs from 'fs'
import { visualizer } from 'rollup-plugin-visualizer'
import stripComments from 'vite-plugin-strip-comments'

const license = fs.readFileSync(resolve(__dirname, '../../LICENSE'), 'utf-8')

export default defineConfig({
	define: {
		__LICENSE__: JSON.stringify(license),
	},
	build: {
		sourcemap: 'hidden',
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'dynamix.layout.core',
			// `.cjs` so Node loads the CommonJS build as CommonJS in this `"type": "module"` package.
			fileName: (format) => (format === 'cjs' ? 'core.cjs' : `core.${format}.js`),
			formats: ['cjs', 'es', 'iife', 'umd'],
		},
	},
	plugins: [
		dts({
			outDir: 'dist/types',
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
			exclude: ['node_modules/**', 'src/test/**'],
		}),
		visualizer({
			filename: 'core.html',
			gzipSize: true,
			brotliSize: true,
			template: 'treemap',
		}),
		stripComments({ type: 'none' }),
	],
})
