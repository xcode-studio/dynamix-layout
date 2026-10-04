---
'@dynamix-layout/react': major
---

**v2: a small component API, headless hooks, accessibility and SSR.** See the migration guide for every rename.

- **`<DynamixLayout>`**:
  - `tabs` is a list of objects (`{ id, title, content, closable, target }`);
  - `defaultLayout` (uncontrolled) or `layout` (controlled) takes v1 or v2 JSON, and `onLayoutChange(layout, { reason })` reports changes;
  - `components`, `classNames` and `styles` replace the wrapper and styling props;
  - `ref` gives an imperative handle.
- **The engine is created once and never rebuilt by prop changes.** An inline `tabs` array with unchanged ids does no engine work and remounts nothing, and moving a tab never remounts its content.
- **Headless API:** `useDynamixLayout` + `DynamixLayoutProvider`, `useTabset`, `useTab`, `useSplitter`, `useLayoutState` (re-renders only for the selected value), `useLayoutActions` and `useDragState`. Prop getters merge your refs, classes, styles and handlers.
- **Pointer-event dragging** for tabs, tabsets and splitters: touch long-press, Escape cancels, and it works over iframes. Drags and resizes never re-render React.
- **ResizeObserver** follows the container, so sidebars and flex parents resize the layout.
- **Accessibility:** WAI-ARIA tabs and window splitter patterns, keyboard resizing, keyboard move mode (Mod+Shift+M), and a live region.
- **SSR-safe and deterministic**, with a `'use client'` entry for the Next.js App Router. Works with React 18 and 19; the bundle no longer inlines React 19's JSX runtime.
- **Fixed:** callback refs are honoured, `layoutTree` changes are no longer ignored, and duplicate DOM ids are gone.

**Breaking:**
- Removed:
  - the v1 props and wrapper components (`WrapTab*`, `SliderElement`, `HoverElement`, `RootSplitterHoverEl`);
  - `getTabOutput`;
  - the v1 `useDynamixLayout` return shape.
- `updateJSON` becomes `onLayoutChange`, which receives v2 JSON and is not called on mount.
- `ref` returns a `DynamixLayoutHandle` (`handle.element` is the root).
- Keyboard shortcuts only act when focus is inside the layout.
- Default classes are `.dx-*`, and data attributes are `data-dx-*`.
- The stylesheet is `@dynamix-layout/react/styles.css` (`style.css` still works).
- React 17 is no longer supported.
