/**
 * @dynamix-layout/core: a framework-agnostic docking layout engine.
 *
 * Importing this module has no side effects. Everything here is public API;
 * the tree, geometry and store modules are internal.
 */
export * from './public-api'
export {
	createFrameScheduler,
	type FrameScheduler,
} from './dom/frame-scheduler'

declare const __VERSION__: string

/**
 * The version of this package, for debugging (replaces v1's console banner).
 * @example
 * console.info('dynamix-layout', version)
 */
export const version: string =
	typeof __VERSION__ === 'undefined' ? 'dev' : __VERSION__
