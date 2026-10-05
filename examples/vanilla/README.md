# Plain JavaScript example

Dynamix Layout with no framework: [`src/dom-layout.ts`](./src/dom-layout.ts) renders `@dynamix-layout/core` snapshots with plain DOM, and [`src/main.ts`](./src/main.ts) is the same all-features showcase as the React and Solid examples.

```bash
pnpm --filter @repo/vanilla-example dev   # http://localhost:3012
```

What it shows:

- **Drag** a tab onto another tab bar, onto a panel's side to split it, or onto a layout edge; drag a tab bar to move the whole panel. Escape cancels.
- **Resize** with splitters (pointer, or arrow keys when focused).
- **Close** closable tabs with × or Delete; **add** tabs, optionally at a target (`{ type: 'root', position: 'bottom' }`).
- **Fold** (collapse) and **maximize/restore** from the tab bar toolbar, by double-clicking a tab bar, with <kbd>Alt</kbd>+<kbd>-</kbd> / <kbd>Alt</kbd>+<kbd>=</kbd>, or from code.
- **Select** and **move** tabs from code, **persist** the layout to localStorage, **reset** it.
- Tab content is created once and never re-parented, so form state (try the Editor's textarea) survives every move.

`createDomLayout(root, options)` returns `{ engine, setTabs, destroy }`; `engine` is the core [`Layout`](../../docs/api/create-layout.md), so every action is one call.
