<div align="center">

# 🧩 Dynamix Layout

**Create dynamic, dockable, and resizable layouts with ease, similar to editors like VS Code.**

</div>

<p align="center">
<a href="https://www.npmjs.com/package/@dynamix-layout/solid">
<img src="https://img.shields.io/npm/v/@dynamix-layout/solid?style=for-the-badge&label=Solid" alt="NPM">
</a>
<a href="https://www.npmjs.com/package/@dynamix-layout/react">
<img src="https://img.shields.io/npm/v/@dynamix-layout/react?style=for-the-badge&label=React" alt="NPM">
</a>
<a href="https://www.npmjs.com/package/@dynamix-layout/core">
<img src="https://img.shields.io/npm/v/@dynamix-layout/core?style=for-the-badge&label=Core" alt="NPM">
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

## Overview

Dynamix Layout is a powerful JavaScript library designed to help you build complex, multi-panel user interfaces. It provides a core engine for managing the layout logic and a dedicated React wrapper for seamless integration into your React applications. If you've ever wanted to create a user experience with draggable tabs and resizable panels, Dynamix Layout is the tool for you.

---

### Made with ❤️ by [Akash Aman](https://linktr.ee/akash_aman)

---

<p align="center">
	<a href="https://dx.xcode.cx" target="_blank" rel="noopener noreferrer" style="text-decoration: none;">
		<img src="https://img.shields.io/badge/🌐%20Live%20Demo-Visit%20Now-4CAF50?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo"/>
	</a>
</p>

---

![Demo](https://raw.githubusercontent.com/xcode-studio/dynamix-layout/main/assets/demo1.gif)

---

## ✨ Key Features

- **Draggable Tabs**: Easily drag and drop tabs to rearrange them or create new panel splits.
- **Resizable Panels**: Users can click and drag the space between panels to resize them.
- **Dynamic Splits**: Split any panel horizontally or vertically by dropping a tab onto its edge.
- **Save & Restore**: Serialize the entire layout state to JSON and restore it later.
- **Framework-Agnostic Core**: The core logic is written in pure TypeScript with zero dependencies.
- **Official React Wrapper**: A feature-rich React component (`<Layout />`) and hook (`useLayout`) for easy integration.

---

## 📚 Packages in this Monorepo

This repository contains the following packages:

### │ 📦 @dynamix-layout/core

The core, framework-agnostic layout engine. It handles all the complex logic of tree management, dimension calculation, and state updates. You can use this package to integrate Dynamix Layout with any framework (Vue, Svelte, Angular, etc.) or with vanilla JavaScript.

➡️ **[View the detailed `@dynamix-layout/core` README](./packages/core/README.md)**

### │ 🚀 @dynamix-layout/react

The official React component library for Dynamix Layout. It provides a simple-to-use `<DynamixLayout />` component and an advanced `useDynamixLayout` hook that handles all the rendering, state management, and event binding for you. This is the recommended package for all React developers.

➡️ **[View the detailed `@dynamix-layout/react` README](./packages/react/README.md)**

### │ 🚀 @dynamix-layout/solid

The official SolidJS wrapper for `@dynamix-layout/core`. It provides a flexible `<DynamixLayout />` component and an advanced `useDynamixLayout` hook to create fully dynamic, resizable, and draggable tab-based layouts with ease.

➡️ **[View the detailed `@dynamix-layout/solid` README](./packages/solid/README.md)**

---

## 📖 Examples

This repository contains the following examples:

| Example        | Source Link                | Live Demo Link                |
|----------------|---------------------------|-------------------------------|
| React          | [React](./examples/react)         | [dx.xcode.cx](https://dx.xcode.cx)                    |
| Next.js        | [Next.js](./examples/nextjs)      | [nextjs.dx.xcode.cx](https://nextjs.dx.xcode.cx)      |
| SolidJS          | [SolidJS](./examples/solid)         | [solidjs.dx.xcode.cx](https://solidjs.dx.xcode.cx)    |
| SolidStart     | [SolidStart](./examples/solidstart)| [solidstart.dx.xcode.cx](https://solidstart.dx.xcode.cx) |

---

## 📦 Installation

For React applications, you will need both the `react` and `core` packages.

```bash
npm install @dynamix-layout/react @dynamix-layout/core
```

For Solid applications, you will need both the `solid` and `core` packages.

```bash
npm install @dynamix-layout/solid @dynamix-layout/core
```

---

## 🏁 Basic Usage

Here's how easy it is to get started with the React component:

```jsx
import { DynamixLayout } from '@dynamix-layout/react'
import '@dynamix-layout/react/style.css'

function App() {

	const tabList = [
		['editor', <div style={{ background: '#c0ca33', height: '100%' }}>Editor</div>],
		['preview', <div style={{ background: '#66bb6a', height: '100%' }}>Preview</div>],
		['terminal', <div style={{ background: '#ffc400', height: '100%' }}>Terminal</div>],
	]

	return (
		<DynamixLayout tabs={tabList} style={{ height: '100vh', width: '100vw' }} />
	)
}

export default App
```

Here's how easy it is to get started with the SolidJS component:

```jsx
import { DynamixLayout } from '@dynamix-layout/solid'
import '@dynamix-layout/solid/style.css'

function App() {

	const tabList = [
		['editor', <div style={{ background: '#c0ca33', height: '100%' }}>Editor</div>],
		['preview', <div style={{ background: '#66bb6a', height: '100%' }}>Preview</div>],
		['terminal', <div style={{ background: '#ffc400', height: '100%' }}>Terminal</div>],
	];

	return (
		<DynamixLayout tabs={tabList} style={{ height: '100vh', width: '100vw' }} />
	)
}

export default App
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome\! Feel free to check the [issues page](https://github.com/xcode-studio/dynamix-layout/issues).

## 📝 License

This project is [MIT](./LICENSE) licensed.

---

<div align="center">

[![Patreon](https://img.shields.io/badge/Patreon-Support-F96854?style=for-the-badge&logo=patreon)](https://www.patreon.com/akashaman)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-FFDD00?style=for-the-badge&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/akashaman)
[![Hire Me](https://img.shields.io/badge/Hire%20Me-Email-blue?style=for-the-badge&logo=gmail)](mailto:sir.akashaman@gmail.com)

### Made with ❤️ by [Akash Aman](https://linktr.ee/akash_aman)

</div>
