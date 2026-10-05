import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import fs from 'fs'
import { visualizer } from 'rollup-plugin-visualizer'
import { licenseBanner } from '../../scripts/build/license-banner'

const { version } = JSON.parse(fs.readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
	define: {
		__VERSION__: JSON.stringify(version),
	},
	build: {
		sourcemap: 'hidden',
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'DynamixLayoutCore',
			// `.cjs` so Node loads the CommonJS build as CommonJS in this `"type": "module"` package.
			fileName: (format) => ({ es: 'index.js', cjs: 'index.cjs', umd: 'index.umd.js' })[format as 'es'],
			formats: ['es', 'cjs', 'umd'],
		},
	},
	plugins: [
		dts({
			outDir: 'dist',
			// Types-only modules never reach the bundle graph; list sources explicitly.
			include: ['src'],
			exclude: ['node_modules/**', 'test/**'],
			// One self-contained declaration file, copied to index.d.cts for `require`.
			rollupTypes: true,
			afterBuild: () => fs.copyFileSync(resolve(__dirname, 'dist/index.d.ts'), resolve(__dirname, 'dist/index.d.cts')),
		}),
		licenseBanner('@dynamix-layout/core'),
		visualizer({ filename: 'core.html', gzipSize: true, brotliSize: true, template: 'treemap' }),
	],
})
