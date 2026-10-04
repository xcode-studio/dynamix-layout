///<reference types="vitest" />
import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import { visualizer } from 'rollup-plugin-visualizer'
import stripComments from 'vite-plugin-strip-comments'
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
		globals: true,
		environment: 'jsdom',
		setupFiles: './src/test/setup.ts',
		server: {
			deps: {
				inline: ['@dynamix-layout/core'],
			},
		},
	},
	plugins: [
		dts({
			outDir: 'dist/types',
			// Types-only modules never reach the bundle graph; list sources explicitly.
			include: ['src'],
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
			name: 'dynamix.layout.react',
			fileName: (format) => `index.${format}.js`,
			formats: ['cjs', 'es', 'iife', 'umd'],
		},
		cssCodeSplit: true,
		rollupOptions: {
			external: ['react', 'react-dom', '@dynamix-layout/core'],
			output: {
				globals: {
					react: 'React',
					'react-dom': 'ReactDOM',
					'@dynamix-layout/core': 'DynamixLayoutCore',
				},
				preserveModules: false,
			},
		},
	},
	resolve: {
		preserveSymlinks: true,
		alias: [
			{ find: '@', replacement: resolve(__dirname, './src') },
			{
				find: '@dynamix-layout/core',
				replacement: resolve(__dirname, '../core/src'),
			},
		],
	},
	css: {
		modules: {
			localsConvention: 'camelCaseOnly',
		},
	},
})
