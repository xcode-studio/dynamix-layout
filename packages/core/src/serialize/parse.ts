import { DynamixLayoutError, type WarningHandler } from '../errors'
import type { LayoutModel } from '../model/types'
import { layoutFromJSON } from './from-json'
import { isLayoutV1, migrateLayoutFromV1 } from './migrate-v1'
import { LAYOUT_VERSION, type LayoutJSON } from './schema'

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Accepts a v2 layout or a v1 tree (migrated, with a `MIGRATED_FROM_V1`
 * warning) and returns a normalized model.
 *
 * @throws {DynamixLayoutError} `UNSUPPORTED_VERSION` for other versions,
 * `INVALID_LAYOUT` for anything malformed.
 */
export function parseLayout(
	input: unknown,
	onWarning: WarningHandler
): Pick<LayoutModel, 'root' | 'maximizedTabsetId'> {
	if (isLayoutV1(input)) {
		onWarning({
			code: 'MIGRATED_FROM_V1',
			message:
				'Loaded a v1 layout; save it again to store the v2 format.',
		})
		return layoutFromJSON(
			migrateLayoutFromV1(input, { onWarning }),
			onWarning
		)
	}
	if (!isObject(input))
		throw new DynamixLayoutError(
			'INVALID_LAYOUT',
			'Expected a layout object'
		)
	if (input.version !== LAYOUT_VERSION)
		throw new DynamixLayoutError(
			'UNSUPPORTED_VERSION',
			`Unsupported layout version ${String(input.version)}; expected ${LAYOUT_VERSION}`,
			'version'
		)
	return layoutFromJSON(input as unknown as LayoutJSON, onWarning)
}
