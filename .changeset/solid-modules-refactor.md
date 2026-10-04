---
'@dynamix-layout/core': minor
'@dynamix-layout/react': patch
'@dynamix-layout/solid': patch
---

Internal refactor for maintainability (no breaking changes):

- Core engine split into focused modules (tree builder, geometry, slider, tree mutations, node, shared state); `DynamixLayoutCore` keeps its public API as a facade.
- New core exports shared by the React and Solid wrappers: `getTabsetDropPreview`, `getNavbarDropPreview`, `getRootSplitPreview`, `isSameDropPreview`, `setElementRect`, `getTabBodyRect`, `createFrameScheduler`.
- `DynamixLayoutCore` accepts optional `createId` and `timer` options (defaults: `crypto.randomUUID`, `setTimeout`) for deterministic tests.
- Solid: the drag hover state is now actually reset after a drag ends.
- The hooks' internal state setters (`setIsUpdating`, `setDragging`, `setTabsets`, `setSliders`, `setLayoutJSON`) are deprecated and will be removed in v2.
