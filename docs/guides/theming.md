# Theming

From the lightest to the most control:

1. **CSS variables** on `.dx-root`, or any ancestor that sets them on `.dx-root`.
2. **`classNames` and `styles`**, by slot.
3. **State attributes** in your own CSS.
4. **[Custom components](./custom-components.md)**.

Import the default stylesheet once:

```ts
import '@dynamix-layout/react/styles.css'
```

## CSS variables

| Variable | Default | Used for |
|---|---|---|
| `--dx-font` | `inherit` | Root font |
| `--dx-tab-bar-bg` | `#dfdfdf` | Tab bar background (the toolbar inherits it) |
| `--dx-tab-bg` | `#dfdfdf` | Inactive tab |
| `--dx-tab-active-bg` | `#ffffff` | Active tab |
| `--dx-tab-color` | `inherit` | Tab text |
| `--dx-tab-radius` | `4px` | Tab corners |
| `--dx-tab-gap` | `6px` | Space between tabs |
| `--dx-splitter-bg` | `#ffffff` | Splitter |
| `--dx-splitter-hover-bg` | `#e8f2ff` | Splitter on hover |
| `--dx-grip-color` | `#9a9a9a` | Splitter grip dots |
| `--dx-drop-indicator-bg` | `rgba(0, 175, 249, 0.35)` | Drop indicator fill |
| `--dx-drop-indicator-border` | `2px dashed rgb(0, 196, 42)` | Drop indicator border |
| `--dx-root-drop-zone-bg` | `#0081f9` | Layout-edge drop handles |
| `--dx-focus-ring` | `2px solid #0081f9` | Keyboard focus outline |

A dark theme:

```css
.dark .dx-root {
	--dx-tab-bar-bg: #18181b;
	--dx-tab-bg: #27272a;
	--dx-tab-active-bg: #3f3f46;
	--dx-tab-color: #e4e4e7;
	--dx-splitter-bg: #09090b;
	--dx-splitter-hover-bg: #27272a;
	--dx-grip-color: #52525b;
}
```

## `classNames` and `styles`

Both are keyed by slot: `root`, `panel`, `tabBar`, `tab`, `activeTab`, `tabClose`, `tabContent`, `splitter`, `dropIndicator`, `rootDropZone`, `toolbar` and `toolbarButton`. Class names are added next to the defaults (`.dx-tab`, …). Styles are merged under the positioning styles, so `left`/`top`/`width`/`height` always come from the layout.

```tsx
<DynamixLayout
	tabs={tabs}
	classNames={{ tab: 'px-3 text-sm', activeTab: 'font-semibold', tabContent: 'border shadow-lg' }}
	styles={{ tabBar: { background: 'var(--surface-2)' } }}
/>
```

Inline `classNames` and `styles` objects are compared by content, so creating them inline doesn't re-render the layout's parts.

## Classes and state attributes

| Element | Class | Attributes |
|---|---|---|
| root | `.dx-root` | `data-dx-measuring` (before the first measurement), `data-dx-dragging` |
| panel | `.dx-panel` | `data-dx-hidden` |
| tab bar | `.dx-tab-bar` | `data-dx-folded`, `data-dx-maximized`, `data-dx-rotated`, `data-dx-has-toolbar`, `data-dx-hidden` |
| tab | `.dx-tab` | `data-state="active \| inactive"` |
| close button | `.dx-tab-close` | |
| tab content | `.dx-tab-content` | `data-dx-hidden` |
| splitter | `.dx-splitter` | `data-dx-direction`, `data-dx-locked`, `data-dx-hidden` |
| drop indicator | `.dx-drop-indicator` | |
| edge drop zone | `.dx-root-drop-zone` | `data-dx-side`, `data-dx-active` |
| toolbar | `.dx-toolbar`, `.dx-toolbar-button` | |

Examples:

```css
.dx-tab-bar[data-dx-folded] { background: var(--strip-bg); }
.dx-root[data-dx-dragging] .dx-tab-content { opacity: 0.85; }
.dx-splitter[data-dx-direction='horizontal']:hover { background: var(--accent); }
```

**Hiding uses `[data-dx-hidden]`** (`display: none !important` in the stylesheet) plus the `hidden` attribute. Don't override `display` on hidden elements.

## Tailwind

`classNames` works with utility classes as they are. To react to state, use data variants: `data-[state=active]:bg-white` on tabs, or `group-data-[dx-dragging]:…` with `group` on the root. See the [custom components example](../../examples/react/src/components/layout-config.ts).
