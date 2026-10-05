# @dynamix-layout/core

The framework-agnostic engine behind Dynamix Layout. It handles the layout tree (rows, tabsets and tabs), geometry and minimum sizes, splitters, drag-and-drop targets, maximize and fold, and versioned serialization. It has no dependencies, no global state and no DOM access. Every `createLayout()` is an independent instance.

Use it directly to build an adapter for another framework, or through [`@dynamix-layout/react`](https://www.npmjs.com/package/@dynamix-layout/react) or [`@dynamix-layout/solid`](https://www.npmjs.com/package/@dynamix-layout/solid).

## Install

```bash
npm install @dynamix-layout/core
```

## Quick start

```ts
import { createLayout } from '@dynamix-layout/core'

const layout = createLayout({
	tabs: [{ id: 'editor' }, { id: 'terminal' }, { id: 'preview' }],
	onLayoutChange: (json) => localStorage.setItem('layout', JSON.stringify(json)),
})

layout.subscribe((snapshot) => {
	for (const [id, rect] of snapshot.rects.tabsets) draw(id, rect)
})
layout.setContainerRect({ x: 0, y: 0, width: 1200, height: 800 })
layout.moveTab('terminal', { type: 'root', position: 'bottom' })
```

## Documentation

- [Using the core without React](https://github.com/xcode-studio/dynamix-layout/blob/main/docs/guides/core-without-react.md)
- [`createLayout` API](https://github.com/xcode-studio/dynamix-layout/blob/main/docs/api/create-layout.md)
- [`LayoutJSON`](https://github.com/xcode-studio/dynamix-layout/blob/main/docs/api/layout-json.md)
- [`migrateLayoutFromV1`](https://github.com/xcode-studio/dynamix-layout/blob/main/docs/api/migrate-layout-from-v1.md)
- [Migrating from v1](https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md)

MIT © [Akash Aman](https://linktr.ee/akash_aman)
