---
'@dynamix-layout/core': patch
---

- Fix data loss: dropping the only tabset (or the only tab of the only tabset) on a root edge removed every tab. Such moves are now rejected as no-ops.
- Fix unbounded growth of the internal direction cache (`mapDirs`), which kept an entry for every bond ever created.
- A layout created from `tabs` no longer reuses the tree of a previously created layout.
