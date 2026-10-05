<div align="center">

# 🧩 Dynamix Layout

**Dockable, resizable tab layouts like VS Code's, for React and Solid, built on a framework-agnostic core.**

</div>

<p align="center">
<a href="https://www.npmjs.com/package/@dynamix-layout/react">
<img src="https://img.shields.io/npm/v/@dynamix-layout/react?style=for-the-badge&label=React" alt="npm: @dynamix-layout/react">
</a>
<a href="https://www.npmjs.com/package/@dynamix-layout/solid">
<img src="https://img.shields.io/npm/v/@dynamix-layout/solid?style=for-the-badge&label=Solid" alt="npm: @dynamix-layout/solid">
</a>
<a href="https://www.npmjs.com/package/@dynamix-layout/core">
<img src="https://img.shields.io/npm/v/@dynamix-layout/core?style=for-the-badge&label=Core" alt="npm: @dynamix-layout/core">
</a>
<img src="https://img.shields.io/github/license/xcode-studio/dynamix-layout?style=for-the-badge" alt="License">
</p>

<p align="center">
<a href="https://www.patreon.com/akashaman">
<img src="https://img.shields.io/badge/Patreon-Support-F96854?style=for-the-badge&logo=patreon" alt="Patreon"/>
</a>
<a href="https://www.buymeacoffee.com/akashaman">
<img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-FFDD00?style=for-the-badge&logo=buy-me-a-coffee" alt="Buy Me A Coffee"/>
</a>
<a href="mailto:sir.akashaman@gmail.com">
<img src="https://img.shields.io/badge/Hire%20Me-Email-blue?style=for-the-badge&logo=gmail" alt="Hire Me"/>
</a>
</p>

<p align="center">
	<a href="https://dx.xcode.cx" target="_blank" rel="noopener noreferrer">
		<img src="https://img.shields.io/badge/🌐%20Live%20Demo-Visit%20Now-4CAF50?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo"/>
	</a>
</p>

![Dragging tabs between panels and resizing them](https://raw.githubusercontent.com/xcode-studio/dynamix-layout/main/assets/demo1.gif)

Your tabs live in **tabsets**, arranged in **rows** and separated by draggable **splitters**. Users drag tabs to rearrange or split panels, resize them, and maximize or fold a panel. The layout is plain JSON you can save and restore.

## Features

- **Drag tabs** onto another tab bar, onto a panel's side to split it, or onto a layout edge. Works with mouse, pen and touch.
- **Resize** with splitters that respect minimum sizes. Only the two neighbouring panels move.
- **Maximize** a panel, or **fold** it to a strip, and get back the exact previous size.
- **Tab content never remounts** when tabs move, so editors, terminals and iframes keep their state.
- **Save and restore** the layout as versioned JSON. Layouts saved by v1 load automatically.
- **Accessible**: WAI-ARIA tabs and window splitter patterns, keyboard resizing, and a keyboard move mode.
- **SSR-safe and fast**: deterministic server markup, and drags and resizes never re-render React.
- **Three levels of API**: one component, headless hooks, or the framework-agnostic core.

## Packages

| Package | |
|---|---|
| [`@dynamix-layout/react`](./packages/react) | `<DynamixLayout>` and headless hooks for React 18 and 19 |
| [`@dynamix-layout/solid`](./packages/solid) | `<DynamixLayout>` for SolidJS |
| [`@dynamix-layout/core`](./packages/core) | The engine: tree, geometry, drag-and-drop and serialization, with no framework |

## Quick start (React)

```bash
npm install @dynamix-layout/react
```

```tsx
import { DynamixLayout } from '@dynamix-layout/react'
import '@dynamix-layout/react/styles.css'

const tabs = [
	{ id: 'editor', title: 'Editor', content: <Editor /> },
	{ id: 'terminal', title: 'Terminal', content: <Terminal /> },
	{ id: 'preview', title: 'Preview', content: <Preview /> },
]

export function App() {
	return (
		<div style={{ height: '100vh' }}>
			<DynamixLayout tabs={tabs} />
		</div>
	)
}
```

To save the layout, store what `onLayoutChange` gives you and pass it back as `defaultLayout`; see [Persisting layouts](./docs/guides/persisting-layouts.md).

## Documentation

- [Getting started](./docs/getting-started.md): concepts, the first layout, and saving and restoring.
- [API reference](./docs/api/README.md): every component, hook and function.
- Guides:
  - [Custom tabs and splitters](./docs/guides/custom-components.md)
  - [Theming](./docs/guides/theming.md)
  - [Persisting layouts](./docs/guides/persisting-layouts.md)
  - [Next.js and SSR](./docs/guides/nextjs-and-ssr.md)
  - [Keyboard and accessibility](./docs/guides/accessibility.md)
  - [Multiple layouts](./docs/guides/multiple-layouts.md)
  - [Using the core without React](./docs/guides/core-without-react.md)
  - [Performance](./docs/guides/performance.md)
- [Migrating from v1](./docs/migration-v1-to-v2.md).
- [Examples](./examples): every one has an **all-features showcase** (drag, split, resize, close, add, fold, maximize, restore, persist, reset):
  - [React](./examples/react) (plus custom components, headless and controlled demos)
  - [Next.js](./examples/nextjs)
  - [Solid](./examples/solid)
  - [SolidStart](./examples/solidstart)
  - [Plain JavaScript](./examples/vanilla) on `@dynamix-layout/core`, no framework

## Contributing

Issues and pull requests are welcome; see [CONTRIBUTING.md](./CONTRIBUTING.md) and the [issue tracker](https://github.com/xcode-studio/dynamix-layout/issues).

---

### Made with ❤️ by [Akash Aman](https://linktr.ee/akash_aman)

[MIT License](./LICENSE)
