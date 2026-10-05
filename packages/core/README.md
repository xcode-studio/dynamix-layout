<div align="center">

[![Patreon](https://img.shields.io/badge/Patreon-Support-F96854?style=for-the-badge&logo=patreon)](https://www.patreon.com/akashaman)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-FFDD00?style=for-the-badge&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/akashaman)
[![Hire Me](https://img.shields.io/badge/Hire%20Me-Email-blue?style=for-the-badge&logo=gmail)](mailto:sir.akashaman@gmail.com)

</div>

# 🚀 @dynamix-layout/core

## Overview

**@dynamix-layout/core** is the **engine** that powers the **creation**, **management**, and **dynamic modification** of your layout structures. It handles the **internal logic** of the layout tree, including **node creation**, **dimension calculation**, and **state updates**. This package works with a **hierarchical tree structure** composed of `Node` objects and exposes a **reactive state** for seamless integration with modern UI frameworks.

---

### Made with ❤️ by [Akash Aman](https://linktr.ee/akash_aman)

---

![alt text](https://raw.githubusercontent.com/xcode-studio/dynamix-layout/main/assets/demo1.gif)

---

## Core Classes

The package is built around three primary classes: `DynamixLayoutCore`, `Node`, and `Bond`.

1.  **`DynamixLayoutCore`**: The main controller class that you instantiate to create and manage the entire layout. It serves as the primary public API.
2.  **`Node`**: The fundamental building block of the layout tree. Each `Node` can be a `row`, a `tabset`, or a `tab`.
3.  **`Bond`**: A special object that represents the draggable separator between two nodes, allowing for resizing.

---

## `DynamixLayoutCore` Class

The `DynamixLayoutCore` class is the central point of control for your entire layout configuration.

### Constructor

When initializing the `DynamixLayoutCore` class, you provide a single **options object**.

`new DynamixLayoutCore(options)`

- **`options`** (`object`): An object containing configuration properties.
    - **`tabs`** (`string[]`): An array of tab names to generate an initial binary tree layout. Defaults to `[]`.
    - **`tree`** (`LayoutTree | null`): A serialized JSON representation of a previously saved layout (`LayoutTree` object). If provided, it will recreate that specific layout. Defaults to `null`.
    - **`tabsIds`** (`Map<string, string>`): A map where keys are tab names and values are their unique IDs. This is useful for persisting tab identities across sessions.
    - **`minW`** (`number`): The minimum width for a `tabset`. Defaults to `40`.
    - **`minH`** (`number`): The minimum height for a `tabset`. Defaults to `40`.
    - **`bond`** (`number`): The width or height (in pixels) of the draggable separator (`Bond`) between nodes. Defaults to `10`.

### Reactive Properties

The layout's state is exposed through static reactive properties on the `Node` class. You can subscribe to these to drive your UI.

- **`Node.cache.nodOpts`**: A reactive map of all `tabset` nodes and their options.
- **`Node.cache.bndOpts`**: A reactive map of all `bond` objects.
- **`Node.cache.tabOpts`**: A reactive map of all `tab` nodes within their respective tabsets.

### Methods

#### 🌳 `updateTree(src, des, layout)`

This is the core method for rearranging the layout. It moves a source node (`src`) to a new position relative to a destination node (`des`).

- **`src`** (`string`): The unique ID of the node to move (can be a `tab` or a `tabset`).
- **`des`** (`string`): The unique ID of the destination node.
- **`layout`** (`'top' | 'bottom' | 'left' | 'right' | 'contain'`): Specifies how the source should be placed relative to the destination.
    - `top`, `bottom`, `left`, `right`: Places the source node by splitting the destination area.
    - `contain`: Places a source `tab` into the destination `tabset`.

**Returns**: `boolean` - `true` if the update was successful, `false` otherwise.

```javascript
// Moves the node with 'sidebar-id' to be to the left of 'main-content-id'
layout.updateTree('sidebar-id', 'main-content-id', 'left')
```

---

#### 📏 `updateDimension(dim, disableTimeout, timeout)`

Recalculates all node dimensions within the layout, typically after the main container has been resized.

- **`dim`** (`{ w, h, x, y }`): An object representing the new dimensions of the root container.
- **`disableTimeout`** (`boolean`): If `true`, the update runs instantly. Otherwise, it's debounced. Defaults to `false`.
- **`timeout`** (`number`): The debounce delay in milliseconds. Defaults to `2`.

<!-- end list -->

```javascript
// On window resize, update the layout dimensions
layout.updateDimension({
	w: window.innerWidth,
	h: window.innerHeight,
	x: 0,
	y: 0,
})
```

---

#### ↔️ `updateSlider(id, dim, disableTimeout, timeout)`

Updates the layout in response to a user dragging a `Bond` (slider).

- **`id`** (`string`): The unique ID of the `Bond` being moved.
- **`dim`** (`{ x, y }`): An object with the new coordinates of the slider.
- **`disableTimeout`** (`boolean`): If `true`, the update runs instantly. Defaults to `false`.
- **`timeout`** (`number`): The debounce delay in milliseconds. Defaults to `2`.

<!-- end list -->

```javascript
// When a user drags a separator
layout.updateSlider('bond-123', { x: 450, y: 300 })
```

---

#### 🗑️ `clearAllCache()`

Clears all internal caches for nodes, bonds, dimensions, and other layout data. Use this when completely destroying or resetting the layout.

```javascript
layout.clearAllCache()
```

---

## `Node` Class

The `Node` represents a single element in the layout tree. You will typically interact with Node data through the reactive properties rather than manipulating `Node` objects directly.

### Constructor

`new Node(options)`

- **`options`** (`object`): An object containing node properties like `type`, `host`, `name`, `part`, `dims`, `unId`, and `open`.

### Static Cache (`Node.cache`)

The `Node` class contains a static `cache` object. This centralized cache holds the state for the entire layout, including maps of all nodes, dimensions, and the **reactive options** that your UI will consume. **Direct manipulation of the cache is not recommended.**

### Methods

#### 💾 `toJSON()`

Serializes the node and its entire subtree into a JSON object (`LayoutTree`). This is used to save the current state of the layout.

```javascript
const rootNode = DynamixLayoutCore._root // Access the static root node
const layoutJSON = rootNode.toJSON()
// localStorage.setItem('savedLayout', JSON.stringify(layoutJSON));
```

## Example Usage

```javascript
import { DynamixLayoutCore, Node } from '@dynamix-layout/core'

// 1. Initialize the Layout class
// Provide an options object to the constructor
const layout = new DynamixLayoutCore({
	tabs: ['editor', 'terminal', 'preview'],
})

// ...or restore a layout from a saved JSON object
// const savedLayout = JSON.parse(localStorage.getItem('savedLayout'));
// const layout = new DynamixLayoutCore({ tree: savedLayout });

// 2. Set the initial dimensions of your container
layout.updateDimension({ w: 1200, h: 800, x: 0, y: 0 }, true)

// 3. Subscribe to reactive state to render your UI.
const unsubscribe = Node.cache.nodOpts.onChange((nodeOptionsMap) => {
	console.log('Layout updated!', nodeOptionsMap)
	// Your UI rendering logic here...
})

// 4. Move a tab to a new location
// (In a real app, you'd get these IDs from the reactive state)
setTimeout(() => {
	const terminalTabId = 'some-unique-id-for-terminal-tab'
	const editorTabsetId = 'some-unique-id-for-editor-tabset'

	// Move the terminal tab into the editor's tabset
	layout.updateTree(terminalTabId, editorTabsetId, 'contain')
}, 2000)

// 5. Clean up when the component unmounts
// unsubscribe();
// layout.clearAllCache();
```

---

<div align="center">

[![Patreon](https://img.shields.io/badge/Patreon-Support-F96854?style=for-the-badge&logo=patreon)](https://www.patreon.com/akashaman)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-FFDD00?style=for-the-badge&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/akashaman)
[![Hire Me](https://img.shields.io/badge/Hire%20Me-Email-blue?style=for-the-badge&logo=gmail)](mailto:sir.akashaman@gmail.com)

### Made with ❤️ by [Akash Aman](https://linktr.ee/akash_aman)

</div>
