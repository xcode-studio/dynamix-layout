---
'@dynamix-layout/solid': major
---

**Runs on the v2 core.** `<DynamixLayout>` keeps its props, default components and drag-and-drop, but each component now has its own engine instance. Two Solid layouts on a page no longer share state, and a layout away from the viewport's top-left is placed correctly.

- **Installs on Node 18 and later** (1.x required Node 22).

**New:**
- `tabs` is reactive: add an entry to open a tab, remove it to close one. Existing tabs keep their content mounted.
- Closable tabs: a third tuple element `{ title, closable }` and an `onTabClose` prop.
- `onReady(layout)` gives the engine for actions from code (`maximize`, `fold`, `selectTab`, `moveTab`, `reset`, `toJSON`, …).
- `updateJSON(layout, reason)` also says why it was called: `'move'`, `'resize'`, `'select'`, `'fold'`, `'maximize'`, `'tabs'`, `'reset'`, or `'mount'` for the first call (type `LayoutUpdateReason`).

**Breaking:**
- `layoutTree` accepts v2 JSON (v1 trees are migrated automatically), and `updateJSON` receives v2 `LayoutJSON`.
- `getTabOutput` and the `TabEntry`/`TabInput`/`TabOutput` types are removed, and tab ids are the tab labels.
- `useDynamixLayout` returns a new shape.
- The slider timeout options no longer apply; splitters update once per frame.
- `solid-js` is a peer dependency.
