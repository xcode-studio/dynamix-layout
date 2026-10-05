---
'@dynamix-layout/core': patch
'@dynamix-layout/react': patch
'@dynamix-layout/solid': patch
---

Packaging fixes for 1.x, and deprecation notes ahead of 2.0.

- **React 18 works.** The React bundle no longer inlines React 19's `react/jsx-runtime`, and the peer dependencies are `react` and `react-dom` `^18.0.0 || ^19.0.0` (the `react` peer was `^0.0.1`). The React package's unused IIFE/UMD builds are gone; they weren't reachable through `exports`.
- **Types resolve.** The published declarations of the React and Solid packages imported `../../../core/src`, a path that doesn't exist in the package, so core types were `any`. Each package now ships one self-contained declaration file, plus `index.d.cts` for CommonJS.
- **`require()` works.** The CommonJS builds were named `*.cjs.js` in `"type": "module"` packages, so Node loaded them as ESM. They're now `*.cjs`. Core's `browser` field, which pointed at an IIFE without exports, is removed.
- **Installs on Node 18 and later** (it required Node 22).
- **Solid:** `solid-js` is a peer dependency, so apps don't end up with two copies.
- **Docs:**
  - The README now gives the correct stylesheet path, `@dynamix-layout/react/style.css` (`styles.css` also works).
  - Repository links point to `xcode-studio/dynamix-layout`.
- **Deprecations:** the props and exports that 2.0 renames or removes are marked `@deprecated`, each naming its replacement and linking the migration guide. Behaviour is unchanged.
