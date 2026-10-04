import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import fs from 'fs'
import { visualizer } from 'rollup-plugin-visualizer'
import stripComments from 'vite-plugin-strip-comments'

const { version } = JSON.parse(
	fs.readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
)

export default defineConfig({
	define: {
		__VERSION__: JSON.stringify(version),
	},
	build: {
		sourcemap: 'hidden',
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'dynamix.layout.core',
			fileName: (format) => `core.${format}.js`,
			formats: ['cjs', 'es', 'iife', 'umd'],
		},
	},
	plugins: [
		dts({
			outDir: 'dist/types',
			// Types-only modules never reach the bundle graph; list sources explicitly.
			include: ['src'],
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
