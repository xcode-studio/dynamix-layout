import { defineConfig } from 'vitest/config'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const { version } = JSON.parse(
	readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
)

export default defineConfig({
	define: { __VERSION__: JSON.stringify(version) },
	test: {
		name: 'core',
		environment: 'node',
		globals: true,
	},
})
