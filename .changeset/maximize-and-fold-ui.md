---
'@dynamix-layout/react': minor
'@dynamix-layout/solid': minor
---

Maximize and fold tabsets (UI), on by default:

- Hover toolbar at the end of every tab bar with Maximize/Restore and Fold/Unfold buttons (accessible labels and tooltips), like LeetCode.
- Folded tabsets in side-by-side rows show their tab bar as a rotated vertical strip with the toolbar at the bottom; in stacked rows they shrink to their tab bar.
- Double-click a tab bar to maximize/restore; Alt/Option + `+` maximizes and Alt/Option + `-` folds the last touched tabset.
- New props: `enableMaximize`, `enableCollapse`, `enableDoubleClickMaximize`, `keyboardShortcuts`, and `TabsetToolbar` to replace the toolbar.
- Starting a drag while maximized restores the layout first; locked bonds next to folded tabsets ignore the pointer.
