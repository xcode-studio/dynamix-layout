import { config } from '@repo/eslint-config/react-internal'

/** @type {import("eslint").Linter.Config} */
export default [
	...config,
	{
		rules: {
			// Slot components destructure state props so they don't reach the DOM.
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ ignoreRestSiblings: true },
			],
		},
	},
]
