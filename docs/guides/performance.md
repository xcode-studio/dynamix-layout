# Performance

## What re-renders

- **Pointer moves never re-render React.** During splitter drags, drop targeting and container resizes, the engine computes new rects, and an internal writer applies `left`/`top`/`width`/`height` directly to the elements. Components render the same positions from the current snapshot whenever React does render, so the two always agree.
- **Components re-render only for state they read.** Each tab, tabset and splitter part subscribes to its own entry of the snapshot. Entries keep their identity until they change, so selecting a tab re-renders that tabset's parts and nothing else.
- **The engine is created once per layout.** Changing `minPanelSize`, `splitterSize` or `tabBarHeight` updates it. Changing `tabs` updates it only when the set of ids changes.

## Your side

- **Inline `tabs` arrays are fine.** A new array with the same ids does no engine work, and a tab re-renders only if its own `title`, `content`, `closable` or `target` changed. Elements created inline (`content: <Editor />`) are new objects on every render, so that tab's content re-renders with its parent, as it would anywhere in React. Memoize heavy content, or keep the `tabs` array in state, if that matters.
- **Content is never remounted** when tabs move, and keeps its DOM position, so iframes don't reload. Changing a tab's `id` remounts it.
- **`useLayoutState` selectors should return stable values:** primitives, or objects from the snapshot. Derived arrays need an `isEqual`.
- **`resizeThrottleMs`** limits container updates during window resizes; the default `0` updates once per animation frame.
- **Hidden tab content stays mounted** (inactive tabs, panels hidden behind a maximized one). To pause expensive work in hidden content, read `useTab(id).isActive` or `useLayoutState((s) => s.tabs.get(id)?.isVisible)`.

## Sizes

Minified and gzipped, measured on the 2.0 build:

| Package | Size |
|---|---|
| `@dynamix-layout/core` | 9.5 kB |
| `@dynamix-layout/react` | 9.5 kB, plus core (React is a peer dependency) |
| `@dynamix-layout/solid` | 5.3 kB, plus core |
| `styles.css` (React) | 1.3 kB |
