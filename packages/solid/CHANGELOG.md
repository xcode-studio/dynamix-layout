# @dynamix-layout/solid

## 1.1.0

### Minor Changes

- [#83](https://github.com/xcode-studio/dynamix-layout/pull/83) [`034fb0a`](https://github.com/xcode-studio/dynamix-layout/commit/034fb0afced4a7a1b4ca033cbf73771780f520d4) Thanks [@akash-aman](https://github.com/akash-aman)! - Maximize and fold tabsets (UI), on by default:

    - Hover toolbar at the end of every tab bar with Maximize/Restore and Fold/Unfold buttons (accessible labels and tooltips), like LeetCode.
    - Folded tabsets in side-by-side rows show their tab bar as a rotated vertical strip with the toolbar at the bottom; in stacked rows they shrink to their tab bar.
    - Double-click a tab bar to maximize/restore; Alt/Option + `+` maximizes and Alt/Option + `-` folds the last touched tabset.
    - New props: `enableMaximize`, `enableCollapse`, `enableDoubleClickMaximize`, `keyboardShortcuts`, and `TabsetToolbar` to replace the toolbar.
    - Starting a drag while maximized restores the layout first; locked bonds next to folded tabsets ignore the pointer.

### Patch Changes

- Updated dependencies [[`4f01ca4`](https://github.com/xcode-studio/dynamix-layout/commit/4f01ca47e0ec6c28e68b157b2b2bed1522b92d0f)]:
    - @dynamix-layout/core@1.2.0

## 1.0.3

### Patch Changes

- [#84](https://github.com/xcode-studio/dynamix-layout/pull/84) [`a8295a7`](https://github.com/xcode-studio/dynamix-layout/commit/a8295a790a99cbf522ca68acd8057b666b401de4) Thanks [@akash-aman](https://github.com/akash-aman)! - Packaging fixes for 1.x, and deprecation notes ahead of 2.0.

    - **React 18 works.** The React bundle no longer inlines React 19's `react/jsx-runtime`, and the peer dependencies are `react` and `react-dom` `^18.0.0 || ^19.0.0` (the `react` peer was `^0.0.1`). The React package's unused IIFE/UMD builds are gone; they weren't reachable through `exports`.
    - **Types resolve.** The published declarations of the React and Solid packages imported `../../../core/src`, a path that doesn't exist in the package, so core types were `any`. Each package now ships one self-contained declaration file, plus `index.d.cts` for CommonJS.
    - **`require()` works.** The CommonJS builds were named `*.cjs.js` in `"type": "module"` packages, so Node loaded them as ESM. They're now `*.cjs`. Core's `browser` field, which pointed at an IIFE without exports, is removed.
    - **Installs on Node 18 and later** (it required Node 22).
    - **Solid:** `solid-js` is a peer dependency, so apps don't end up with two copies.
    - **Docs:**
        - The README now gives the correct stylesheet path, `@dynamix-layout/react/style.css` (`styles.css` also works).
        - Repository links point to `xcode-studio/dynamix-layout`.
    - **Deprecations:** the props and exports that 2.0 renames or removes are marked `@deprecated`, each naming its replacement and linking the migration guide. Behaviour is unchanged.

- Updated dependencies [[`a8295a7`](https://github.com/xcode-studio/dynamix-layout/commit/a8295a790a99cbf522ca68acd8057b666b401de4)]:
    - @dynamix-layout/core@1.1.1

## 1.0.2

### Patch Changes

- [#79](https://github.com/xcode-studio/dynamix-layout/pull/79) [`f53fecc`](https://github.com/xcode-studio/dynamix-layout/commit/f53feccc08eada1627b6855cbf1f7ba053dfdde4) Thanks [@akash-aman](https://github.com/akash-aman)! - Performance and layout fixes:

    - Fix listener leak in the React hook (subscriptions were added on every render) and unsubscribe on unmount in Solid.
    - Coalesce slider pointer moves to one layout update per animation frame.
    - Keep sliders following the pointer over iframes and other embedded content.
    - Remove resize/drag jitter: round cumulative split boundaries so unrelated panels never move and edges move smoothly.
    - Keep tabsets outside a dragged subtree in the shared maps (tab clicks no longer break after nested slider drags).
    - A tabset can no longer be shorter than its tab bar; empty tab bodies are hidden.
    - Solid: tab bodies follow deferred updates when resize/slider timeouts are enabled.
    - Fix crash when dropping the last tab of a tabset onto its own tabset; reject moves relative to nested rows.
    - Remove the Google Fonts import from the bundled CSS.

- [#82](https://github.com/xcode-studio/dynamix-layout/pull/82) [`993920c`](https://github.com/xcode-studio/dynamix-layout/commit/993920c407f2eea552b4349c0932b58f39902549) Thanks [@akash-aman](https://github.com/akash-aman)! - Internal refactor for maintainability (no breaking changes):

    - Core engine split into focused modules (tree builder, geometry, slider, tree mutations, node, shared state); `DynamixLayoutCore` keeps its public API as a facade.
    - New core exports shared by the React and Solid wrappers: `getTabsetDropPreview`, `getNavbarDropPreview`, `getRootSplitPreview`, `isSameDropPreview`, `setElementRect`, `getTabBodyRect`, `createFrameScheduler`.
    - `DynamixLayoutCore` accepts optional `createId` and `timer` options (defaults: `crypto.randomUUID`, `setTimeout`) for deterministic tests.
    - Solid: the drag hover state is now actually reset after a drag ends.
    - The hooks' internal state setters (`setIsUpdating`, `setDragging`, `setTabsets`, `setSliders`, `setLayoutJSON`) are deprecated and will be removed in v2.

- Updated dependencies [[`320b881`](https://github.com/xcode-studio/dynamix-layout/commit/320b881f74d4a92cd1b4bbc584b6bd4afed35726), [`f53fecc`](https://github.com/xcode-studio/dynamix-layout/commit/f53feccc08eada1627b6855cbf1f7ba053dfdde4), [`993920c`](https://github.com/xcode-studio/dynamix-layout/commit/993920c407f2eea552b4349c0932b58f39902549)]:
    - @dynamix-layout/core@1.1.0

## 1.0.1

### Patch Changes

- Fix security vulnerabilities in transitive dependencies via pnpm overrides and dependency bumps

- Updated dependencies []:
    - @dynamix-layout/core@1.0.1

## 1.0.0

### Major Changes

- [#66](https://github.com/akash-aman/dynamix-layout/pull/66) [`416172e`](https://github.com/akash-aman/dynamix-layout/commit/416172e03da7e7916c160409996a23189dedc588) Thanks [@akash-aman](https://github.com/akash-aman)! - This pull request updates several dependencies across the project to their latest patch or minor versions, focusing primarily on build tools, frameworks, and linting packages. These updates help ensure compatibility, improved features, and bug fixes throughout the codebase.

    Dependency updates:

    **Vite upgrades:**
    - Updated the `vite` dependency from versions `^7.0.4` or `^7.0.5` to `^7.1.11` in `apps/site/package.json`, `examples/react/package.json`, `examples/solid/package.json`, `packages/core/package.json`, `packages/react/package.json`, and `packages/solid/package.json`. [[1]](diffhunk://#diff-33ce070b849ec2220094ce84790e6978b0870aa1168826458888f280eae6489bL82-R82) [[2]](diffhunk://#diff-3ae58cd0dc48e9afc5345bcd388b6f82b75345c9fd156f5bd3c71cb92037aa64L43-R43) [[3]](diffhunk://#diff-d3b34c9f36ccc3e9869a8c4a6f0d775de611001b94f1230887d0958fa2db8a16L18-R18) [[4]](diffhunk://#diff-0b810c38f3c138a3d5e44854edefd5eb966617ca84e62f06511f60acc40546c7L73-R73) [[5]](diffhunk://#diff-1f344ac391eeecc21ec0f01fb07430a47f4b80d20485c125447d54c33c4bbfc4L92-R92) [[6]](diffhunk://#diff-24f04605b9a786a23c3cf2ab9649fb66cf01126ed9c7a202100840b6a8323fa1L85-R85)

    **Next.js and related dependencies:**
    - Upgraded `next` from `15.4.1` to `15.4.7` and `eslint-config-next` from `15.4.1` to `15.4.7` in `examples/nextjs/package.json`. [[1]](diffhunk://#diff-23044c563f1173db6464d127497c342c8f7f90722764a37749681bf455a515e0L12-R12) [[2]](diffhunk://#diff-23044c563f1173db6464d127497c342c8f7f90722764a37749681bf455a515e0L25-R25)

    **Linting and TypeScript tooling:**
    - Updated `typescript-eslint` from `^8.37.0` to `^8.46.3` in `package.json`.

    **SolidJS and related tooling:**
    - Upgraded `@solidjs/start` from `^1.1.7` to `^1.2.0` in `package.json`.

### Patch Changes

- Updated dependencies [[`416172e`](https://github.com/akash-aman/dynamix-layout/commit/416172e03da7e7916c160409996a23189dedc588)]:
    - @dynamix-layout/core@1.0.0

## 0.0.1

### Patch Changes

- [#52](https://github.com/akash-aman/dynamix-layout/pull/52) [`b6568bc`](https://github.com/akash-aman/dynamix-layout/commit/b6568bc6dac744ca18e066541b0306439b51738f) Thanks [@akash-aman](https://github.com/akash-aman)! - @dynamix-layout/solid
    - Introduced SolidJS wrapper for @dynamix-layout/core.
    - Added SolidJS and SolidStart usage examples.
    - Enhanced default CSS styles.
    - Added support for export & save layout as JSON via callback.
    - Fixed TypeScript type definitions.
- Updated dependencies [[`b6568bc`](https://github.com/akash-aman/dynamix-layout/commit/b6568bc6dac744ca18e066541b0306439b51738f)]:
    - @dynamix-layout/core@0.0.8
