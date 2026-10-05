# Keyboard and accessibility

Every part follows a WAI-ARIA pattern and can be used without a mouse.

## Tabs ([Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/))

- **Roles:** the tab bar is `role="tablist"` (`aria-orientation="vertical"` on a folded strip). Each tab is `role="tab"` with `aria-selected` and `aria-controls`. Its content is `role="tabpanel"` with `aria-labelledby`.
- **Focus:** one tab per tab bar is focusable (roving `tabindex`), so Tab moves between tab bars and contents.

| Key (on a tab) | Action |
|---|---|
| ← / → (↑ / ↓ on a folded strip) | Focus the previous/next tab, wrapping. With `tabActivation="automatic"` (default) it's also selected. |
| Home / End | First / last tab |
| Enter / Space | Select the focused tab (for `tabActivation="manual"`) |
| Delete / Backspace | Close the tab, if it's closable (calls `onTabClose`) |
| Ctrl/⌘ + Shift + M | Start **move mode** (below) |

## Moving tabs from the keyboard

Move mode is a keyboard drag:

1. **Start.** Focus a tab and press **Ctrl/⌘ + Shift + M**.
2. **Choose a target.** **Arrow keys** cycle through every valid target: each tabset's center and sides, then the layout's edges. The drop indicator shows the target, and a polite live region announces it, e.g. "Move Terminal: right of Editor".
3. **Drop or cancel.** **Enter** or **Space** drops; **Escape** or **Tab** cancels.

From code, use [`moveTab`](../api/use-layout-actions.md) with a [`DropTarget`](../api/create-layout.md#droptarget).

## Splitters ([Window splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/))

- **Roles:** each splitter is `role="separator"` with `aria-orientation`. `aria-valuenow`, `aria-valuemin` and `aria-valuemax` are the panel's share of the pair, in percent. `aria-controls` points at the panel before it, and the `aria-label` reads e.g. "Resize Editor and Terminal".
- **Focus:** every splitter is focusable. A splitter next to a folded panel is `aria-disabled`.

| Key (on a splitter) | Action |
|---|---|
| ← / → (side-by-side panels), ↑ / ↓ (stacked panels) | Move 10px |
| Shift + arrow | Move 50px |
| Home / End | Move to the minimum / maximum |
| Enter | Fold or unfold the panel before it (when folding is allowed) |

## Maximize and fold

The toolbar buttons are real buttons:
- Maximize has `aria-label` "Maximize" or "Restore" and `aria-pressed`.
- Fold has `aria-label` "Fold" or "Unfold" and `aria-expanded`.

| Shortcut (focus inside the layout) | Action |
|---|---|
| Alt/Option + "+" | Maximize or restore the focused tabset |
| Alt/Option + "-" | Fold or unfold the focused tabset |

The shortcuts act on the tabset that contains the focus, or that you last clicked. They only listen inside the layout, so several layouts on a page don't conflict. Turn them off with `keyboardShortcuts={false}`. Double-clicking a tab bar also maximizes it (`maximizeOnDoubleClick`).

## Pointer and touch

- **Mouse and pen:** a tab drag starts after the pointer moves 4px, so clicks still select tabs.
- **Touch:** a drag starts after a 350ms long press; a quick swipe scrolls the tab bar instead.
- **Cancel:** Escape cancels any drag.

## Your own components

The prop getters (`getTabProps`, `getSplitterProps`, …) apply all of the above. If you replace a slot or build a [headless](../api/use-dynamix-layout.md) UI:
- spread their props onto real focusable elements;
- don't remove `role`, `aria-*` or `tabIndex`;
- keep a visible focus style. `styles.css` uses `--dx-focus-ring`.
