/** Sizes the geometry depends on. */
export interface GeometryConfig {
	/** Smallest width and height of a tabset. */
	readonly minPanelSize: { readonly width: number; readonly height: number }
	/** Thickness of the splitters between siblings. */
	readonly splitterSize: number
	/** Size of a folded tabset along its row (usually the tab bar height). */
	readonly foldedSize: number
}

/** Default sizes, the same as v1. */
export const DEFAULT_GEOMETRY: GeometryConfig = {
	minPanelSize: { width: 40, height: 40 },
	splitterSize: 10,
	foldedSize: 40,
}
