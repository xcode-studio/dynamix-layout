---
'@dynamix-layout/core': patch
'@dynamix-layout/react': patch
'@dynamix-layout/solid': patch
---

Performance and layout fixes:

- Fix listener leak in the React hook (subscriptions were added on every render) and unsubscribe on unmount in Solid.
- Coalesce slider pointer moves to one layout update per animation frame.
- Keep sliders following the pointer over iframes and other embedded content.
- Remove resize/drag jitter: round cumulative split boundaries so unrelated panels never move and edges move smoothly.
- Keep tabsets outside a dragged subtree in the shared maps (tab clicks no longer break after nested slider drags).
- A tabset can no longer be shorter than its tab bar; empty tab bodies are hidden.
- Solid: tab bodies follow deferred updates when resize/slider timeouts are enabled.
- Fix crash when dropping the last tab of a tabset onto its own tabset; reject moves relative to nested rows.
- Remove the Google Fonts import from the bundled CSS.
