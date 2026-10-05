# API reference

## `@dynamix-layout/react`

| Export | What it is |
|---|---|
| [`DynamixLayout`](./dynamix-layout.md) | The component. Most apps only need this. |
| [`useDynamixLayout`](./use-dynamix-layout.md) and `DynamixLayoutProvider` | Headless layout: state and prop getters for a custom UI |
| [`useTabset`](./use-tabset.md) | One tabset: its panel and tab bar |
| [`useTab`](./use-tab.md) | One tab: its button and its content |
| [`useSplitter`](./use-splitter.md) | One splitter |
| [`useLayoutState`](./use-layout-state.md) | Subscribe to part of the layout state |
| [`useLayoutActions`](./use-layout-actions.md) | Stable actions (move, select, maximize, fold, …) |
| [`useDragState`](./use-drag-state.md) | The drag in progress |
| `Panel`, `TabBar`, `Tab`, `TabContent`, `Splitter`, `DropIndicator`, `RootDropZone`, `TabsetToolbar` | The default slot components, for composing your own ([guide](../guides/custom-components.md)) |

The React package also re-exports from core: `migrateLayoutFromV1`, `isLayoutV1`, `DynamixLayoutError` and the layout types.

## `@dynamix-layout/core`

| Export | What it is |
|---|---|
| [`createLayout`](./create-layout.md) | Creates a layout instance (engine) |
| [`LayoutJSON`](./layout-json.md) | The saved-layout format, `LAYOUT_VERSION` |
| [`migrateLayoutFromV1`](./migrate-layout-from-v1.md) and `isLayoutV1` | Convert layouts saved by v1 |
| `DynamixLayoutError` | Thrown for invalid input ([codes](./create-layout.md#errors-and-warnings)) |
| `getTabBarPlacement`, `getTabContentRect`, `getRootDropZoneRect`, `applyRect`, `createFrameScheduler` | Helpers for writing adapters ([guide](../guides/core-without-react.md)) |
| `version` | The package version |
