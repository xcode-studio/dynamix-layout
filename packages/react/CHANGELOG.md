# @dynamix-layout/react

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

## 0.0.5

### Patch Changes

- [#52](https://github.com/akash-aman/dynamix-layout/pull/52) [`b6568bc`](https://github.com/akash-aman/dynamix-layout/commit/b6568bc6dac744ca18e066541b0306439b51738f) Thanks [@akash-aman](https://github.com/akash-aman)! - @dynamix-layout/react
    - Fixed hover element rendering issue caused by hardcoded width.
    - Improved default CSS styles.
    - Added support for export & save layout as JSON via callback.
    - Resolved TypeScript type issues.
    - Included example projects for React and Next.js.
- Updated dependencies [[`b6568bc`](https://github.com/akash-aman/dynamix-layout/commit/b6568bc6dac744ca18e066541b0306439b51738f)]:
    - @dynamix-layout/core@0.0.8
    - react@0.0.1

## 0.0.4

### Patch Changes

- [#42](https://github.com/akash-aman/dynamix-layout/pull/42) [`e5549f8`](https://github.com/akash-aman/dynamix-layout/commit/e5549f8fddfe3f10f07daddea4c247f3d12d19a2) Thanks [@akash-aman](https://github.com/akash-aman)! - Remove unnecessary data transfer handling in drag and drop events

## 0.0.3

### Patch Changes

- [#38](https://github.com/akash-aman/dynamix-layout/pull/38) [`3f3e2dd`](https://github.com/akash-aman/dynamix-layout/commit/3f3e2dd117b3043256ccb9bb21a10f83215b3d62) Thanks [@akash-aman](https://github.com/akash-aman)! - Fixed drag & drop not working bug for safari browser

## 0.0.2

### Patch Changes

- [#33](https://github.com/akash-aman/dynamix-layout/pull/33) [`1861a2c`](https://github.com/akash-aman/dynamix-layout/commit/1861a2cbc8e0fa90971a1899ed3078e226ecf0b3) Thanks [@akash-aman](https://github.com/akash-aman)! - - Fixed demo gif.

## 0.0.1

### Patch Changes

- [#25](https://github.com/akash-aman/dynamix-layout/pull/25) [`8b7ab1a`](https://github.com/akash-aman/dynamix-layout/commit/8b7ab1a0317dae85400ed381c85a4e50c35db41e) Thanks [@akash-aman](https://github.com/akash-aman)! - feat(core): enhance demo with GIFs/MP4s and update README for better structure
    - Updated `.hintrc` to enforce consistent casing for TypeScript.
    - Added demo assets (GIFs, MP4) to showcase layout functionality.
    - Cleaned up `.npmignore` to exclude `.map` files.
    - Removed unused `vite-plugin-compression2` dependency.
    - Improved README structure and visual assets for `core` package.
    - Added TypeScript configuration files for clearer project setup.

    feat(react): initial release of DynamixLayout React component
    - Introduced `@dynamix-layout/react` package to provide a React wrapper around `@dynamix-layout/core`.
    - Added `DynamixLayout` component with support for dynamic, draggable, and resizable layouts.
    - Included usage examples and updated README for better developer onboarding.
    - Integrated demo assets (GIFs, MP4s) to showcase layout behavior.
    - Refactored tests to validate component behavior and ensure coverage.

- Updated dependencies [[`8b7ab1a`](https://github.com/akash-aman/dynamix-layout/commit/8b7ab1a0317dae85400ed381c85a4e50c35db41e)]:
    - @dynamix-layout/core@0.0.6
