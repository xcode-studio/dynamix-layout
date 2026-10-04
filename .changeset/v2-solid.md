---
'@dynamix-layout/solid': major
---

**Runs on the v2 core.** `<DynamixLayout>` keeps its props, default components and drag-and-drop, but each component now has its own engine instance. Two Solid layouts on a page no longer share state, and a layout away from the viewport's top-left is placed correctly.

**Breaking:**
- `layoutTree` accepts v2 JSON (v1 trees are migrated automatically), and `updateJSON` receives v2 `LayoutJSON`.
- `getTabOutput` and the `TabEntry`/`TabInput`/`TabOutput` types are removed, and tab ids are the tab labels.
- `useDynamixLayout` returns a new shape.
- The slider timeout options no longer apply; splitters update once per frame.
- `solid-js` is a peer dependency.
