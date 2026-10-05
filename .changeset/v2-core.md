---
'@dynamix-layout/core': major
---

**v2: an instance-based, pure layout engine.** See the migration guide for every rename.

- **`createLayout(options)` replaces `new DynamixLayoutCore()`.** Each instance is independent: there is no module-level state, no static caches, no timers, and nothing touches the DOM. Two layouts on a page, or one per server request, no longer interfere.
- **Immutable snapshots** (`getSnapshot()` / `subscribe()`) share unchanged parts by reference: `tabsets`, `tabs`, `splitters`, `rects` and `drag`.
- **Typed actions** that return whether anything changed and never throw: `moveTab`, `moveTabset`, `selectTab`, `addTab`, `removeTab`, `setTabs`, `resizeSplitter`, `moveSplitterBy`, `maximize`/`restore`, `fold`/`unfold`, plus one drag model for tabs and splitters (`startDrag`, `updateDrag`, `endDrag`, `cancelDrag`) and hit testing (`getDropTarget`, `listDropTargets`).
- **`onLayoutChange(layout, reason)`** reports committed changes.
- **New saved format, `LayoutJSON`** (`version: 2`): readable names, explicit directions, and tab ids as the stable identity.
- **Old layouts:** v1 trees load automatically, or convert them with `migrateLayoutFromV1`. They render pixel-identically, as checked against layouts recorded from v1.
- **Deterministic ids**, safe for server rendering; no `crypto.randomUUID()`, which threw outside secure contexts.
- **Rects are relative to the layout root.** v1 misplaced layouts that weren't at the viewport's top-left.
- **No import-time side effects:** the console banner and `window.__DYNAMIX_LAYOUT__` are gone. Use `version` instead.
- **Fixed:**
  - nested rows left behind after some moves;
  - stale sizes when every open panel had weight 0;
  - a row stuck at its minimum next to a folded tabset;
  - the root staying oversized after the container shrank;
  - center drops inserting before the last tab (they now append).
- **Packaging:** the CommonJS build loads with `require()` (it was ESM under a `.cjs.js` name), exports maps give each condition its own types, and the package installs on Node 18 and later (it required Node 22).

**Breaking:**
- `DynamixLayoutCore`, `Node`, `Bond`, `Node.cache`, `Queue`, `createReactiveState`, the comparators, the drop-preview and DOM helpers, and the `LayoutTree`/`NodeOptions` types are removed.
- `updateTree(src, des, area)` becomes `moveTab`/`moveTabset(id, target)`, with `'contain'` renamed to `'center'`.
- `updateDimension` becomes `setContainerRect`, and the debounce arguments are gone; throttle in the adapter instead.
