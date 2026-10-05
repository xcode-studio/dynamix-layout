<div align="center">

[![Patreon](https://img.shields.io/badge/Patreon-Support-F96854?style=for-the-badge&logo=patreon)](https://www.patreon.com/akashaman)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-FFDD00?style=for-the-badge&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/akashaman)
[![Hire Me](https://img.shields.io/badge/Hire%20Me-Email-blue?style=for-the-badge&logo=gmail)](mailto:sir.akashaman@gmail.com)


</div>

## 🚀 @dynamix-layout/solid

### The official SolidJS wrapper for `@dynamix-layout/core`

## Overview

**@dynamix-layout/solid** brings the power of the `@dynamix-layout/core` engine to **SolidJS** applications. It provides a flexible `<DynamixLayout />` component and an advanced `useDynamixLayout` hook to create fully dynamic, resizable, and draggable tab-based layouts with ease. Build complex UIs like VS Code or JSFiddle in minutes. 🔨

-----

### Made with ❤️ by [Akash Aman](https://linktr.ee/akash_aman)

-----

## 📦 Installation

```bash
npm install @dynamix-layout/solid @dynamix-layout/core
```

-----

## 🏁 Getting Started

The easiest way to get started is by using the `<DynamixLayout />` component. Provide it with an array of `[id, component]` tuples.

```jsx
import { DynamixLayout } from '@dynamix-layout/solid';
import '@dynamix-layout/solid/style.css'; // Don't forget to import the default style
import type { Component } from 'solid-js';

const App: Component = () => {
    // 1. Define your tabs as an array of [id, component] tuples
    const myTabs = [
        ['editor', <div>This is my editor!</div>],
        ['terminal', <div>This is the terminal.</div>],
        ['preview', <div>Live preview here.</div>],
    ];

    return (
        <div
            style={{
                width: '100vw',
                height: '100vh',
            }}
        >
            {/* 2. Render the DynamixLayout component with your tabs */}
            <DynamixLayout tabs={myTabs} />
        </div>
    );
};

export default App;
```

-----

## 🧩 `<DynamixLayout />` Component API

The `<DynamixLayout />` component is the primary way to use this package. It's highly configurable through its props.

### Core Functionality

| Prop | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| **`tabs`** (required) | `TabItem[]` | `[id, component, options?]` tuples. `options` is `{ title?, closable? }`. The array is reactive: add or remove entries and only those tabs mount or unmount. | |
| `onTabClose` | `(tabId: string) => void` | Called by the × button of a `closable` tab. Remove the tab from `tabs` to close it. | `undefined` |
| `onReady` | `(layout: Layout) => void` | Receives the core engine once mounted, for `toggleMaximize`, `toggleFold`, `selectTab`, `moveTab`, `reset` and the rest of the [core API](../../docs/api/create-layout.md). | `undefined` |
| `layoutTree` | `LayoutJSON \| LayoutTreeV1` | A saved layout to restore. Layouts saved by v1 are migrated automatically. | `undefined` |
| `tabNames` | `Map<string, string \| JSX.Element>` | Display names for your tabs, keyed by tab id. | `undefined` |
| `enableTabbar` | `boolean` | If `true`, renders the draggable tab bar on top of each tab panel. | `true` |
| `tabHeadHeight` | `number` | The height of the tab bar in pixels. | `40` |
| `pad` | `{ t, b, l, r }` | Padding for the root layout container in pixels. | `{ t: 0, b: 0, l: 0, r: 0 }` |
| `minTabWidth` | `number` | Minimum width of a tab panel in pixels. | `40` |
| `minTabHeight` | `number` | Minimum height of a tab panel in pixels. | `40` |
| `bondWidth` | `number` | The width/height of the draggable slider between panels in pixels. | `10` |
| `rootId` | `string` | The HTML `id` for the root `<div>` element of the layout. | `"dynamix-layout-root"` |
| `disableResizeTimeout` | `boolean` | Disables debounce on window resize for faster updates. Can impact performance. | `true` |
| `disableSliderTimeout` | `boolean` | No effect since 2.0: splitters update once per animation frame. | `true` |
| `windowResizeTimeout` | `number` | Debounce timeout in milliseconds for window resize events. | `2` |
| `sliderUpdateTimeout` | `number` | No effect since 2.0. | `2` |
| `...props` | `JSX.HTMLAttributes` | Standard HTML attributes like `style` and `class` are passed to the root `<div>`. | |

### 🎨 Customization with Wrapper Components

You can completely change the look and feel of the layout by providing your own **SolidJS components** for rendering different parts of the UI.

| Prop | Description |
| :--- | :--- |
| `WrapTabPanel` | A component to wrap the entire tab panel (tab bar + tab content area). |
| `WrapTabHead` | A component to wrap the tab bar that contains the tab labels. |
| `WrapTabLabel` | A component for an individual, clickable tab label in the tab bar. |
| `WrapTabBody` | A component to wrap the content of a single tab. |
| `SliderElement` | A component for the draggable slider used to resize panels. |
| `HoverElement` | A component that displays the visual drop zone indicator when dragging a tab. |

**Example: Custom Slider**

```jsx
import { DynamixLayout } from '@dynamix-layout/solid';
import type { Component, JSX } from 'solid-js';
import { MyCustomSlider } from './components';

function App() {
    // ... (myTabs definition from "Getting Started")
    return <DynamixLayout tabs={myTabs} SliderElement={MyCustomSlider} />;
}
```

### Styling Props

For finer-grained control, you can pass `style` objects or `class` strings to the default wrapper components without replacing them entirely.

| Prop | Type | Target Element |
| :--- | :--- | :--- |
| `tabPanelElementStyles` | `JSX.CSSProperties` | `WrapTabPanel` |
| `tabPanelElementClass` | `string` | `WrapTabPanel` |
| `tabHeadElementStyles` | `JSX.CSSProperties` | `WrapTabHead` |
| `tabHeadElementClass` | `string` | `WrapTabHead` |
| `tabLabelElementStyles` | `JSX.CSSProperties` | `WrapTabLabel` |
| `tabLabelElementClass` | `string` | `WrapTabLabel` |
| `tabBodyElementStyles` | `JSX.CSSProperties` | `WrapTabBody` |
| `tabBodyElementClass` | `string` | `WrapTabBody` |
| `sliderElementStyles` | `JSX.CSSProperties` | `SliderElement` |
| `sliderElementClass` | `string` | `SliderElement` |
| `hoverElementStyles` | `JSX.CSSProperties` | `HoverElement` |
| `hoverElementClass` | `string` | `HoverElement` |
| `RootSplitterHoverElStyles` | `JSX.CSSProperties` | Root edge drop zones |
| `RootSplitterHoverElClass` | `string` | Root edge drop zones |

-----

## ⚙️ The `useDynamixLayout` hook

The Solid `useDynamixLayout` binds a `@dynamix-layout/core` instance to Solid signals for `<DynamixLayout>`. Its shape changed in 2.0 and it is mainly an implementation detail of the component. For a custom renderer, build on [`createLayout`](https://github.com/xcode-studio/dynamix-layout/blob/main/docs/guides/core-without-react.md) directly. A headless Solid API, matching the React hooks, is planned.

-----

### Example: Saving a Layout

- `updateJSON` receives the layout as [`LayoutJSON`](https://github.com/xcode-studio/dynamix-layout/blob/main/docs/api/layout-json.md) (`version: 2`) once on mount and after every change (a drop, a splitter release, selecting a tab, maximize or fold). Its second argument says why: `'mount'` for the first call, then `'move'`, `'resize'`, `'select'`, `'fold'`, `'maximize'`, `'tabs'` or `'reset'`. Save it to localStorage, a database, or anywhere else, and pass it back as `layoutTree`.

```jsx
import { tabs } from './comp'
import { DynamixLayout } from '@dynamix-layout/solid'
import type { LayoutJSON } from '@dynamix-layout/solid'
import '@dynamix-layout/solid/style.css'

function App() {

	const UpdateJSON = (layout: LayoutJSON) => {
		localStorage.setItem('layout', JSON.stringify(layout));
	};

	return (
		<>
			<DynamixLayout
				updateJSON={UpdateJSON}
				tabs={tabs}
			/>
		</>
	)
}

export default App

```

----

<div align="center">

[![Patreon](https://img.shields.io/badge/Patreon-Support-F96854?style=for-the-badge&logo=patreon)](https://www.patreon.com/akashaman)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-FFDD00?style=for-the-badge&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/akashaman)
[![Hire Me](https://img.shields.io/badge/Hire%20Me-Email-blue?style=for-the-badge&logo=gmail)](mailto:sir.akashaman@gmail.com)


### Made with ❤️ by [Akash Aman](https://linktr.ee/akash_aman)

</div>