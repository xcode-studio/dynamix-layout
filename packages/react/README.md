# @dynamix-layout/react

Dockable, resizable tab layouts for React 18 and 19. Drag tabs to rearrange or split panels, resize them with splitters, maximize or fold a panel, and save the layout as JSON.

![Dragging tabs between panels and resizing them](https://raw.githubusercontent.com/xcode-studio/dynamix-layout/main/assets/demo1.gif)

## Install

```bash
npm install @dynamix-layout/react
```

## Quick start

```tsx
import { DynamixLayout } from '@dynamix-layout/react'
import '@dynamix-layout/react/styles.css'

const tabs = [
	{ id: 'editor', title: 'Editor', content: <Editor /> },
	{ id: 'terminal', title: 'Terminal', content: <Terminal /> },
	{ id: 'preview', title: 'Preview', content: <Preview />, closable: true },
]

export function App() {
	const [saved] = useState(() => JSON.parse(localStorage.getItem('layout') ?? 'null') ?? undefined)
	return (
		<div style={{ height: '100vh' }}>
			<DynamixLayout
				tabs={tabs}
				defaultLayout={saved}
				onLayoutChange={(layout) => localStorage.setItem('layout', JSON.stringify(layout))}
			/>
		</div>
	)
}
```

The layout fills its parent, so give the parent a size.

## Three levels of API

- **`<DynamixLayout>`**: one component. Customize it with `components`, `classNames`, `styles` and CSS variables.
- **Headless hooks**: `useDynamixLayout`, `useTabset`, `useTab` and `useSplitter` return prop getters for a fully custom UI.
- **State and actions anywhere**: `useLayoutState(selector)` and `useLayoutActions()`.

## Documentation

- [Getting started](https://github.com/xcode-studio/dynamix-layout/blob/main/docs/getting-started.md)
- [API reference](https://github.com/xcode-studio/dynamix-layout/blob/main/docs/api/README.md)
- [Guides](https://github.com/xcode-studio/dynamix-layout/blob/main/README.md#documentation)
- [Migrating from v1](https://github.com/xcode-studio/dynamix-layout/blob/main/docs/migration-v1-to-v2.md)

MIT © [Akash Aman](https://linktr.ee/akash_aman)
