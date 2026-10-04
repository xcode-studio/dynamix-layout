/** Codes of errors thrown by the layout. */
export type DynamixLayoutErrorCode =
	'INVALID_LAYOUT' | 'UNSUPPORTED_VERSION' | 'DUPLICATE_TAB_ID'

/**
 * Thrown for invalid input: malformed saved layouts, unsupported versions,
 * and duplicate tab ids in development. Actions never throw.
 */
export class DynamixLayoutError extends Error {
	readonly code: DynamixLayoutErrorCode
	/** Where in the input the problem is, e.g. `root.children[1].weight`. */
	readonly path?: string

	constructor(code: DynamixLayoutErrorCode, message: string, path?: string) {
		super(path ? `${message} (at ${path})` : message)
		this.name = 'DynamixLayoutError'
		this.code = code
		this.path = path
	}
}

/** Codes of non-fatal problems reported through `onWarning`. */
export type LayoutWarningCode =
	| 'MIGRATED_FROM_V1'
	| 'DUPLICATE_TAB_ID'
	| 'INVALID_ACTIVE_TAB'
	| 'INVALID_WEIGHT'
	| 'UNKNOWN_ID'
	| 'DESTROYED'

/** A non-fatal problem, such as a repaired saved layout. */
export interface LayoutWarning {
	readonly code: LayoutWarningCode
	readonly message: string
	readonly path?: string
}

/** Receives warnings. */
export type WarningHandler = (warning: LayoutWarning) => void
