# dynamix-layout v2 — Phase 1 audit

Status: **draft for review**. No source code was changed in this phase.

- **Baseline:** branch `feat/maximize-and-fold-ui` at `1be7413`. That is `main` (core 1.1.0, react 1.0.2, solid 1.0.2) plus the still-open PR #83 (maximize and fold). Features that exist only in PR #83 are marked **[#83]**.
- **Line references** are to that commit.
- **Evidence.** Items marked **(probed)** were checked by running throwaway Vitest / React Testing Library scripts against the source. The scripts were deleted afterwards, and their output is quoted where it matters.

---

## 0. Summary

| Area | Verdict |
|---|---|
| Global singleton state | **Confirmed, and worse than described.** Two instances don't just overwrite each other: instance A's methods mutate instance B's tree (probed). |
| Engine lifecycle in React | **Confirmed.** Every new `tabs` identity rebuilds the engine from the *initial* tree, and the rendered DOM keeps pointing at the old engine's node ids (probed). |
| SSR | **Confirmed.** `renderToString` works but isn't deterministic (random UUIDs in markup), so hydration will mismatch (probed). |
| Packaging | **Confirmed**, plus two new problems: (a) the React bundle *inlines React 19's `jsx-runtime`*, so the package can't work with React 18; (b) the React package has no `test` script (CI still runs its one smoke test through the root Vitest projects; see P13). |
| Public API | About 60 exports across core and react. Most are internals. Three exported React types describe an API that doesn't exist. |
| Serialized format | Documented in §5. Tab identity is the tab **label** (`nodName`); `uidNode` of tabs is a per-session random id and is ignored on load. |
| New bugs | 29 items in §4. The most important are B1–B6 and B25. B26–B29 were found later, by the characterization fixtures. |

---

## 1. Feature inventory

### 1.1 Layout model (core)

| # | Feature | Where | Notes |
|---|---|---|---|
| F1 | Tree of `row → tabset → tab` nodes with bonds (splitters) between siblings | `core/src/app/node.ts:7-225` (`Node`), `:227-256` (`Bond`) | Bonds are a doubly-linked list woven through `Node.prev/next`, not children. |
| F2 | Alternating direction: the root row lays out horizontally, and every level flips | `tree-builder.ts:60-79`, `:90`, `:127`; `Node.cache.mapDirs` | Not serialized; derived from depth. |
| F3 | Initial layout from a list of tab names | `tree-builder.ts:134-242` | Right-leaning binary tree: `ts(t1) \| row(ts(t2) / row(…))`. One tab → one tabset (`:151-171`). |
| F4 | Restore from a saved `LayoutTree` | `tree-builder.ts:81-132`, `:244-260`; `dynamix.ts:106-128` | BFS zip of the JSON tree against the node tree. Tab ids are re-mapped from labels (`:255-257`). |
| F5 | Minimum sizes: per-tabset `minW`/`minH`, propagated up (sum along the axis plus bonds, max across it) | `geometry.ts:19-136`; `node.ts:80-100` | Tab bar height raises `minH` in the adapters (`react/src/hooks/useLayout.ts:76-78`). |
| F6 | Root overflow: if the container is smaller than the tree minimum, the root grows past it and is clipped | `geometry.ts:144-170`; root `overflow:hidden` (`react/src/components/Layout.tsx:180`) | Users can't scroll to the clipped part. |
| F7 | Space distribution by weight (`part`) of the space *above the minimum*, with cumulative boundary rounding | `node.ts:102-191` | `part` isn't a percentage (see §5.3). |
| F8 | Splitter resize: clamp to the neighbours' minimums, re-weight only the two neighbours, recompute only that subtree | `slider.ts:30-126` | Edges outside the dragged pair don't move. |
| F9 | Optional debounce for splitter and container updates | `slider.ts:7-28`; `geometry.ts:263-285` | Both share **one** `engine.cntdown` timer (see B12). Disabled by default in the adapters. |
| F10 | Injectable `createId` and `timer` | `state.ts:5-15`; `dynamix.ts:82-85` | Added in 1.1.0. Stored globally. |
| F11 | Tree mutations from drag-and-drop | `tree-mutations.ts:8-107` | See 1.2. |
| F12 | Tree normalization after a removal: collapse single-child rows into the grandparent; delete an empty tabset | `tree-mutations.ts:447-500`, `:527-575` | Incomplete (see B7). |
| F13 | Serialization `Node.toJSON()` | `node.ts:193-224` | Only reachable through the static `DynamixLayoutCore._root.toJSON()`. |
| F14 | Reactive output maps (`nodOpts` tabsets, `bndOpts` bonds, `tabOpts` tabs) with an equality check | `geometry.ts:172-261`; `reactive-state.ts`; `comparator.ts` | Static, not per instance. |
| F15 | **[#83]** Maximize one tabset over the whole layout; the others stay mounted and hidden; restore is exact | `view-state.ts:73-92`; `geometry.ts:190-237` | Persisted as root `nodMaxd`. |
| F16 | **[#83]** Fold a tabset to a strip along its row; unfold restores the exact size; folding the last open sibling unfolds the most recently folded one | `view-state.ts:94-125`; `geometry.ts:84-100`; `node.ts:114-124` | Persisted as tabset `nodFold`. Neighbouring bonds are locked (`geometry.ts:249`, `slider.ts:55`). |
| F17 | **[#83]** View-state normalization: a lone tabset can't stay folded, every row keeps one open child, a missing maximized id is dropped | `view-state.ts:52-71` | |
| F18 | Framework-agnostic helpers: drop-preview geometry, tab bar placement, body rect, rAF scheduler | `drop-preview.ts`, `dom.ts` | Added in 1.1.0 and used by both adapters. |

### 1.2 Drag-and-drop operations (`updateTree(src, des, area)`)

| Source → target, area | Result | Where |
|---|---|---|
| tab → tab, `left`/`right` | Insert the tab before/after the target tab in its tabset | `tree-mutations.ts:122-192` |
| tab → tabset, `contain` | Append to the tabset (rewritten as "beside its last tab") | `:77-79` |
| tabset → tab or tabset, `contain` | Merge all its tabs into the target tabset | `:168-189` |
| tab or tabset → tabset, `top`/`bottom`/`left`/`right` | Split: a sibling if the axis matches, otherwise wrap both in a new row | `:194-251`, `:253-445` |
| tab or tabset → root, a side | Dock at the layout edge, wrapping the existing children if needed | `:322-407` |
| Guards | Ignore: a move onto itself; a lone tab onto its own tabset; the only tabset/tab in the layout; nested-row targets; `row` sources | `:17-87` |
| Side effects | Any move ends maximize, and a moved tabset arrives unfolded **[#83]** | `:89-91` |

### 1.3 React adapter features

| # | Feature | Where |
|---|---|---|
| R1 | `<DynamixLayout tabs={[label, node][]}>` | `components/Layout.tsx:50-436` |
| R2 | **All tab bodies are rendered as flat siblings of the root and positioned absolutely.** Moving a tab between tabsets therefore never remounts its content (editors, iframes and terminals keep their state). | `Layout.tsx:335-368` — **this behaviour must survive v2** |
| R3 | Imperative DOM fast path: engine change listeners write rects directly; React re-renders only on structural changes | `hooks/useLayout.ts:124-187` |
| R4 | Splitter drag with pointer events and pointer capture, coalesced by rAF | `useLayout.ts:189-254` |
| R5 | Tab and tabset drag with HTML5 DnD: transparent drag image, drop indicator, root-edge targets, tab-bar insertion marker, folded-strip target **[#83]** | `useLayout.ts:256-585` |
| R6 | During a drag: `.is-dragging` disables pointer events inside tab bodies, so iframes don't swallow events; overlay panels catch drops; `document.body.style.cursor` is changed | `layout.css:27-29`; `useLayout.ts:414-458`, `:486-566` |
| R7 | Active tab switch, done imperatively (no React render) | `useLayout.ts:587-648` |
| R8 | Container measurement with `getBoundingClientRect` and padding `pad {t,b,l,r}` | `Layout.tsx:108-118` |
| R9 | Container resize on `window.resize` only | `useLayout.ts:650-682` |
| R10 | Tab bar toggle (`enableTabbar`), height (`tabHeadHeight`), display names (`tabNames`) | `Layout.tsx:65`, `:71-72`, `:306` |
| R11 | Six replaceable wrappers plus defaults: `WrapTabPanel`, `WrapTabHead`, `WrapTabLabel`, `WrapTabBody`, `SliderElement`, `HoverElement`; **[#83]** `TabsetToolbar` | `Layout.tsx:64-70`, `:99`; `components/Default.tsx` |
| R12 | Fourteen styling props (7 `*Styles`, 7 `*Class`) | `Layout.tsx:81-94` |
| R13 | `updateJSON(tree)` on mount, after a drop, after a splitter release, and after maximize/fold | `useLayout.ts:674`, `:557`, `:229`, `:364` |
| R14 | **[#83]** Toolbar (maximize, fold), tab-bar double-click, and Alt +/- shortcuts for the last-touched tabset | `Default.tsx:338-406`; `useLayout.ts:358-412` |
| R15 | Default stylesheet: active tab colours, hidden scrollbars, toolbar, `[data-dx-hidden]` | `components/layout.css` |

---

## 2. Public API inventory

"Public" means exported from the package entry. "Intended" is my judgement of whether a user should rely on it.

### 2.1 `@dynamix-layout/core` (`src/index.ts` → `src/app/index.ts`)

| Export | Kind | Intended public? | Notes |
|---|---|---|---|
| `DynamixLayoutCore` | class | Yes (the only engine entry) | See the method table below. |
| `Node`, `Bond` | class | **No** | Exported so the adapters can read `Node.cache`. |
| `Queue` | class | **No** | 41 methods; core uses 13 (§3, P8). |
| `createReactiveState` | fn | **No** | |
| `areNodeOptionsMapEqual`, `areNodeOptionsEqual` | fn | **No** | |
| `getTabsetDropPreview`, `getNavbarDropPreview`, `getRootSplitPreview`, `isSameDropPreview` | fn | Semi (adapter helpers, 1.1.0) | Pure; worth keeping, possibly under a subpath. |
| `setElementRect`, `getTabBodyRect`, `getTabbarPlacement`, `placeTabbar`, `createFrameScheduler` | fn | Semi (adapter helpers) | Touch the DOM only when called. |
| Types `Dimension`, `LayoutTree`, `NodeOptions`, `BaseNode`, `NodeType`, `NodeTypeWithBond`, `TabsIds`, `NodeCache`, `RootAdjustment`, `ReactiveValue`, `ChangeListener`, `DropArea`, `RootSide`, `DropPreview`, `PreviewRect`, `TabbarPlacement`, `FrameScheduler` | types | Only `LayoutTree` and `Dimension` are user-facing | `Timer` appears in the public constructor signature but **isn't exported**. |
| *(side effect)* console banner and `window.__DYNAMIX_LAYOUT__` | import-time | No | P11. |

**`DynamixLayoutCore` members (all public):**
- Static accessors: `_root`, `_tree`, `_minW`, `_minH`, `_bond`, `_inst` (`dynamix.ts:22-68`).
- Fields: `nodeOps` (unused), `cntdown`, `tabsIds`.
- Methods:
  - Iterators: `JSONLayoutIterator`, `NodeLayoutIterator`, `NodeLayoutRecursiveIterator`.
  - Tree building: `updateChildDirections`, `createNodeLayout`, `createNodeTreeFromJSONTree`, `createBinaryNodeTreeFromQueue`, `createNodeFromJSON`.
  - Geometry: `calcTabsetCountAndMinDim`, `pruneStaleDirections`, `calculateRootAdjustment`, `calcDimensions`, `updateDimension`, `updateSlider`, `updateSliderDimension`.
  - Mutations: `updateTree`, `isOnlyContent`, `moveNodeAsTab`, `moveRelativeToRoot`, `moveRelativeToTabset`, `insertNode`, `insertNodeWithNewParent`, `moveAdjacentNodeToGrandParent`, `removeRelation`, `removeNode`, `removeKid`, `clearAllCache`.
  - **[#83]** `maximizedId`, `maximize`, `restore`, `toggleMaximize`, `collapse`, `expand`, `toggleCollapse`.
- Of these, a user needs about 8: construct, `updateDimension`, `updateSlider`, `updateTree`, serialize, and the view-state methods.

### 2.2 `@dynamix-layout/react` (`src/index.ts`)

| Export | Kind | Intended public? | Notes |
|---|---|---|---|
| `DynamixLayout` | component | Yes | 46 props (§3, API surface). |
| `useDynamixLayout` | hook | **No in practice** | It needs `tabOutput` (from `getTabOutput`) and `dimensions` callbacks, and returns 31 members, including raw refs, DnD handlers and 5 deprecated setters. |
| `getTabOutput` | fn | **No** | Calls `crypto.randomUUID()` per tab (`Layout.tsx:33`). |
| `DefaultWrapTabLabel`, `DefaultWrapTabBody`, `DefaultWrapTabHead`, `DefaultWrapTabPanel`, `DefaultHoverElement`, `DefaultSliderElement`, `RootSplitterHoverEl`, `DefaultTabsetToolbar` **[#83]** | components | Yes (for composing custom wrappers) | Inline styles everywhere, so they're hard to theme. |
| `LayoutProps`, `TabsetToolbarProps` **[#83]**, `TabInput`, `TabOutput`, `TabEntry`, `DivFC`, `useDynamixLayoutOptions` | types | `LayoutProps` and `TabsetToolbarProps` only | |
| `DynamixLayoutProps`, `UseDynamixLayoutOptions`, `UseDynamixLayoutResult` | types | **Dead** | They describe an API (`setTabs`, `setLayoutTree`, `tabs: string[]`) that doesn't exist. They're used nowhere (`types/index.ts:4-22`). Same in Solid. |
| `./style.css` | CSS subpath | Yes | |

---

## 3. Verification of known problems

### Architecture

**P1. Global singleton state — CONFIRMED (and broader).**
- `state.ts:18-33` is module-level mutable state. Its fields:
  - `createId`, `timer`, `root`, `tree`, `minW`, `minH`, `bond`, `inst`;
  - **[#83]** `maximized`, `collapsedSize`, `foldSeq`.
- The static accessors are at `dynamix.ts:22-68`. `Node.cache` is static at `node.ts:8-25`.
- **Probe: two engines.**
  - I created engine A (`a1,a2`), then engine B (`b1,b2,b3`). `_root` contained `[b1,b2,b3]`.
  - Calling `a.updateTree(b1, b3, 'contain')` **succeeded and rearranged B's tabs**.
- **Probe: two `<DynamixLayout>`s on a page.**
  - Layout `#one` (tabs A, B) rendered the **tab bars of layout two** (`cd`) above its own bodies.
- **SSR:** every request on a server shares the same module state. React StrictMode creates the instance twice; the second overwrites the first, which only works because both write the same globals.
- Also, every core module reads `layoutState` directly, not through `engine`. The "injected `engine`" parameter only gives access to methods; the data stays global.

**P2. Side effects during render — CONFIRMED.**
- `useLayout.ts:80-96` writes `DynamixLayoutCore._bond/_minH/_minW` and constructs the engine inside `useMemo`.
- The constructor writes globals (`dynamix.ts:101-130`) and clears the shared caches (via `calcTabsetCountAndMinDim`).
- Component defaults read the statics (`Layout.tsx:56-58`, `:71`), so a default depends on whichever layout was constructed last.
- Solid does the same (`solid/src/components/Layout.tsx:94-100`, `:121`).

**P3. Engine recreated too often — CONFIRMED, with a worse consequence.**
- The deps `[layoutJSON, tabOutput, …]` are at `useLayout.ts:97-106`. `tabOutput = useMemo(() => getTabOutput(tabs), [tabs])` is at `Layout.tsx:104`.
- So any parent render with an inline `tabs` array (the official example does this: `examples/react/src/App.tsx:238`) rebuilds the engine.
- **Probe: rerender with a new `tabs` identity.**
  - The engine root was replaced, but the tab bars kept the **old** tabset uids, and the tab body ids changed.
  - After that, clicks and drops target uids that no longer exist in `Node.cache.mapElem`, so they silently do nothing.
- Also, `layoutJSON` is `useState(layoutTree)` (`useLayout.ts:45-47`) and is never updated from user moves. Each rebuild therefore **resets the layout to the initial tree, losing all user changes**.
- The resize effect (`:650-682`) doesn't depend on `layoutInstance`, so its closure keeps the old engine. It only works because the old and new engines share globals.

**P4. The class is a thin facade with everything public — CONFIRMED.**
- `dynamix.ts:133-296`: 33 of 37 methods are one-line forwards to free functions.
- All internals are public: iterators, `insertNodeWithNewParent`, `removeKid`, `clearAllCache`, the field `cntdown`, and the unused field `nodeOps` (`:70`, `:117-120`).

**P5. Mixed concerns in the React hook — CONFIRMED.**
- `useLayout.ts` is 733 lines (it was 627 before #83). One hook holds:
  - engine construction;
  - three cache subscriptions with imperative DOM writes;
  - splitter pointer handling;
  - HTML5 DnD (7 handlers);
  - drag-image creation and `document.body.style.cursor` writes;
  - active-tab switching through DOM `dataset`;
  - window resize;
  - **[#83]** maximize/fold, keyboard shortcuts and double-click.
- Solid mirrors it (`solid/src/hooks/useLayout.ts`, 657 lines).

**P6. Resize detection uses `window.resize` — CONFIRMED.** See `useLayout.ts:665`, and Solid `useLayout.ts:594`. A container resized by a sidebar or flex parent isn't detected; the layout stays at its old size until the window resizes.

**P7. HTML5 DnD for tabs — CONFIRMED; recommend moving to pointer events.**
- Tabs and tab bars use `draggable` with `onDragStart/Over/End` (`Layout.tsx:228-250`, `:287-289`). Consequences:
  - no touch support;
  - a fake 1×1 drag image is attached to `document.body` (`useLayout.ts:424-438`);
  - no keyboard path;
  - the drop is decided in `onDragEnd`, not `onDrop`.
- Splitters already use pointer events with capture (`:236-253`).
- A pointer-based tab drag also lets us use the same `.is-dragging` path and hit-test with `elementFromPoint` against the engine's rects, rather than DOM `dragover` on overlay panels.
- I'll evaluate this in the Phase 2 design. Risks: losing native drag-out to other windows (not supported today anyway), and needing a movement threshold so clicks still select tabs.

**P8. Custom 702-line `Queue` — CONFIRMED oversized.**
- Of 41 methods, core uses: `enqueue`, `enqueueFront`, `insert`, `insertQueue`, `dequeue`, `indexOf`, `removeAt`, `get`, `peek`, `peekBack`, `size`, `isEmpty`, `clear`, and iteration.
- The rest are aliases (`push/unshift/fifo*/filo*/lifo*/lilo*/front/back`) or unused.
- Children lists are tiny (a few items), so a plain `readonly T[]` is enough. BFS iterators can use an array plus an index.

### Packaging and DX

**P9. `react` peer dependency is `^0.0.1` — CONFIRMED.** See `react/package.json:81`. `react-dom` lists `^17 || ^18 || ^19`, but React 17 can't work: React 19's jsx-runtime is bundled, as described next.

> **NEW P9b (severe). The React bundle inlines `react/jsx-runtime`.**
> - Rollup `external` is `['react', 'react-dom', '@dynamix-layout/core']` (`react/vite.config.ts:54`). That matches `react` exactly, not `react/jsx-runtime`.
> - `dist/index.es.js` therefore embeds React **19**'s jsx runtime: `Symbol.for("react.transitional.element")`, plus a `process.env.NODE_ENV` switch.
> - React 18 doesn't recognise that element symbol, so the package can't render under React 18. It also references `process`, which breaks unbundled ESM use.
> - Solid isn't affected.

**P10. Documented CSS import path fails — CONFIRMED.**
- `react/README.md:42` says `@dynamix-layout/react/dist/layout.css`. The file doesn't exist (the build emits `dist/index.css`), and `exports` only exposes `./style.css` (`package.json:48`).
- Also, `react/README.md:183` tells React users to import `@dynamix-layout/solid/style.css` (a copy-paste error).

**P11. Import-time side effects in core — CONFIRMED.**
- An IIFE in `core/src/index.ts:8-51` prints a collapsed console banner and sets `window.__DYNAMIX_LAYOUT__ = { __LICENSE__, __LAYOUT__ }`, but `package.json:50` declares `"sideEffects": false`.
- Because of that flag, bundlers may drop the banner or keep it depending on usage, which is non-deterministic.
- The full MIT licence text is embedded **twice** in `dist/core.es.js` (the banner plus the `__LICENSE__` define).

**P12. Repository links point to `akash-aman/dynamix-layout` — CONFIRMED.** Locations:
- `README.md:19`, `:52`, `:170`
- `CONTRIBUTING.md:9`, `:13`
- `SECURITY.md:9`
- `packages/core/README.md:21`
- `packages/react/README.md:23`
- the core banner, `core/src/index.ts:38`

The `package.json` `repository` fields are already correct.

**P13. The React package has a single smoke test — CONFIRMED.**
- `react/src/test/layout.test.ts` has one render test.
- `react/package.json` has no `test` script (`:68-76`), so `pnpm --filter @dynamix-layout/react test` does nothing. Solid has a script.
- *Correction (Phase 3):* the first version of this audit said the test never runs in CI. That was wrong. CI runs the root `vitest`, whose `projects` include `packages/react/vite.config.ts`, so the smoke test did run.
- The React `lint` script also lacks `--max-warnings 0`, unlike core.

### Naming — CONFIRMED

Every abbreviation listed in the brief exists. Additional ones:
- `cntdown`, `uqid`, `unId`, `papa`, `dada` (`tree-mutations.ts:533-534`), `desHst`, `insrtIndex`, `gndHost`, `bnd`, `rghtName`, `totlMinSize`, `curntOffset`, `KidNode`, `LT` (`useLayout.ts:85`).
- The typo `supress` (`dynamix.ts:180`, `geometry.ts:175`).
- `nodMaxd`, `nodFold` **[#83]**. These follow the v1 naming scheme; v2 renames them.

Inconsistencies:
- `rowIsHorizontal` vs `nodeDir` semantics: a tabset's `nodeDir` is the *opposite* of its row (`dom.ts:40-41`).
- `RootSplitterHoverElStyles` (PascalCase) vs `hoverElementStyles`.
- The type `useDynamixLayoutOptions` is lowercase.

### API surface — CONFIRMED

- `LayoutProps` has 46 props (`react/types/index.ts:41-99`). Configuration groups:
  - 14 styling props;
  - 6 wrappers plus `TabsetToolbar`;
  - 4 debounce props, where `disable*Timeout` defaults to `true`, so the `*Timeout` values do nothing unless the user flips both.
- Tabs are tuples, the label is the id, and `tabNames` provides the display name.
- `useDynamixLayout` returns 31 members (`useLayout.ts:695-732`). `isUpdating` is never set to `true` anywhere (dead state).
- No controlled mode, no imperative handle, and no programmatic add/remove/select/move.

---

## 4. Bugs found (not fixed)

Severity: **H** = data loss, crash or wrong behaviour in normal use; **M** = wrong in an edge case or a real environment; **L** = cosmetic or DX.

| # | Sev | Bug | Evidence |
|---|---|---|---|
| B1 | **H** | **Parent re-render resets the layout and breaks interaction.** A new `tabs` identity rebuilds the engine from the initial tree; the DOM keeps the stale uids. | P3, probed. |
| B2 | **H** | **The React package doesn't work with React 18 or 17** (bundled React 19 jsx-runtime) despite its peer range. | P9b. |
| B3 | **H** | **Two layouts on one page corrupt each other.** | P1, probed. |
| B4 | **M** | **SSR markup isn't deterministic** (random tab body ids), so hydration fails. The Next.js example avoids this only with `dynamic(..., { ssr: false })` (`examples/nextjs/src/app/page.tsx:8-18`). | Probed. |
| B5 | **M** | **`crypto.randomUUID` throws outside secure contexts** (plain `http://` on a LAN IP or an internal host), so the layout crashes on construction. | `state.ts:10`; `Layout.tsx:33`; Solid `Layout.tsx:26`. |
| B6 | **M** | **A callback `ref` on `<DynamixLayout>` is never called.** | `Layout.tsx:106` (`typeof ref === 'function' ? ownRef : …`), probed. |
| B7 | M | **Non-normalized tree after some moves.** Example: `b1 \| (b2 / b3)`, then move `b1` into `b3`. `removeNode` removes `ts(b1)` and calls `moveAdjacentNodeToGrandParent(row)` with the root as the parent; that warns "has no host" and returns. The root is left with one nested `row` child. `updateTree` still returns `true`, and that shape is what gets saved. | Probed; `tree-mutations.ts:544-554`, `:447-451`. |
| B8 | M | **Saved layout vs `tabs` drift is silent.** Tabs added to `tabs` after a layout was saved never appear. Tabs removed from `tabs` still show a tab label, with no body. | Probed (`tabs:[x,y,z]` + tree with x,y → `[x,y]`; `tabs:[x]` → `[x,y]`). |
| B9 | M | **Duplicate tab labels** create several core tabs, but every React map is keyed by label (`Layout.tsx:29-41`). Bodies collapse into one, and `tabset.open` (stored as a *name*) marks every duplicate active. | Probed (core keeps 3 tabs for `['a','a','b']`). |
| B10 | M | **The `layoutTree` prop is read only on mount.** Later changes are ignored (`useState(layoutTree)`), with no warning. | `useLayout.ts:45-47`. |
| B11 | M | **The published snapshot is mutated in place.** `calcTabsetCountAndMinDim` calls `Node.cache.nodOpts.get().clear()`, so a listener holding the last snapshot sees it emptied. `updateActiveTab` also writes `nodOpen` into the cached objects (`useLayout.ts:619`, `:632-646`). | Probed (snapshot size 3 → 0); `geometry.ts:29-30`. |
| B12 | M | **The splitter and resize debounces share one timer** (`engine.cntdown`). With timeouts enabled, a resize during a drag cancels the pending splitter update, or the other way round. | `slider.ts:19-27`; `geometry.ts:276-284`. |
| B13 | M | **Solid ignores `0` and `false`-y numeric props** (`props.bondWidth \|\| …`, `tabHeadHeight \|\| …`), so `bondWidth={0}` is impossible. Solid also reads `tabs` and `layoutTree` once, so later changes are ignored. | `solid/src/components/Layout.tsx:94-100`, `:121`, `:44`. |
| B14 | M | **Duplicate DOM ids.** `id={rootId}` defaults to `dynamix-layout-root` on every instance, and tab body `id`s are UUIDs that change on every rebuild. | `Layout.tsx:80`, `:170`, `:340`. |
| B15 | M | The resize effect closes over a stale `layoutInstance`. It works only through shared globals. Once state is per instance, this becomes a real bug. | `useLayout.ts:650-682`. |
| B16 | M | **`onDragEnd` schedules `requestAnimationFrame` without cancelling it on unmount.** It can run after unmount and call `setState` / `updateJSON`. | `useLayout.ts:554-558`. |
| B17 | L | `updateJSON` fires on every mount with the initial tree. Under StrictMode it fires twice. | `useLayout.ts:674`. |
| B18 | L | `updateTree` warns "Source node … not found" even when the *destination* is missing. `console.warn` calls in the engine can't be silenced (21 call sites). | `tree-mutations.ts:23`; grep. |
| B19 | L | The keyboard-shortcut effect has no dependency array, so it re-subscribes the `window` listener on every render. **[#83]** | `useLayout.ts:393-412`. |
| B20 | L | Core `package.json` `"browser": "./dist/core.iife.js"` points bundlers that honour `browser` at an IIFE with no exports. The IIFE and UMD builds are also emitted for React, where `exports` never references them. | `core/package.json:33`; `react/vite.config.ts:50`. |
| B21 | L | Solid lists `solid-js` under `dependencies`, not `peerDependencies`. That risks two Solid runtimes. | `solid/package.json:89-92`. |
| B22 | L | `Timer` appears in the public constructor options but isn't exported. | `dynamix.ts:85`; `index.ts`. |
| B23 | L | `examples/svelte` contains only a stale `dist/` (no `package.json`). It's dead weight in the repo. | `ls examples/svelte`. |
| B24 | L | The comment in the React `layout.css` says "for the SolidJS components". A fallback "No content" body uses Tailwind classes the library doesn't ship. | `layout.css:1`; `Layout.tsx:360-364`. |
| B25 | **H** | **Wrong placement unless the root sits at the viewport's top-left.** The container rect uses viewport coordinates (`rect.left/top`, `Layout.tsx:108-118`), but children are absolutely positioned *inside* the root. A root offset by 150px drew its tab bars at 300px, and the far side was clipped. The page scroll position isn't tracked either. Hidden today because every example is full-viewport. | Probed in agent-browser on `examples/react` (root `margin-left:150px` → tab bar `style.left=150px`, on screen at 300px). |
| B26 | L | **A center drop inserts the tab before the target's last tab**, not at the end: `'contain'` is rewritten to "beside the last tab" with `insertFlg` true. | Found by the characterization fixtures; `tree-mutations.ts:77-79`, `:142-143`. |
| B27 | M | **Splitting beside a folded tabset leaves a row stuck at its minimum size.** The tabset turns into a row but keeps `collapsed`, so the row gets no extra space, its splitters lock, and no toolbar can unfold it. The flag is also saved (`nodFold` on a row). | Fixtures (scenarios 7 and 15); `tree-mutations.ts:409-444`. |
| B28 | M | **A row whose open children all have weight 0 keeps stale sizes**, sometimes drawn outside the row. A splitter dragged fully to one side writes weight 0; once the other sibling folds, `calcDimensions` returns early. | Fixtures (scenario 8); `node.ts:124`. |
| B29 | L | **After the container shrinks below the layout minimum, the root stays oversized** until the next window resize, because the grown size is written back into the root's dimensions and reused by later recomputes. | Fixtures (scenario 9); `geometry.ts:160-163`. |

---

## 5. Serialized format (v1 `LayoutTree`)

### 5.1 TypeScript shape (`core/src/type/index.ts:25-41`)

```ts
type LayoutTree = {
  typNode: 'row' | 'tabset' | 'tab' | 'bond' // 'bond' never appears in output
  nodName: string
  uidNode: string
  nodPart: number
  nodOpen?: string | boolean                 // output: string, tabsets only
  nodKids?: LayoutTree[]
  nodFold?: boolean                          // [#83] tabset only
  nodMaxd?: string                           // [#83] root only
}
```

### 5.2 What `Node.toJSON()` actually writes (`node.ts:193-224`)

Key order: `typNode, nodPart, nodName, uidNode, nodOpen?, nodFold?, nodMaxd?, nodKids?`. A real output (probed, two tabs):

```json
{
  "typNode": "row", "nodPart": 100,
  "nodName": "dynamix-layout-root", "uidNode": "dynamix-layout-root",
  "nodKids": [
    { "typNode": "tabset", "nodPart": 100, "nodName": "", "uidNode": "3ddc2c41-…", "nodOpen": "x",
      "nodKids": [{ "typNode": "tab", "nodPart": 100, "nodName": "x", "uidNode": "fc8ab160-…" }] },
    { "typNode": "tabset", "nodPart": 100, "nodName": "", "uidNode": "adf88532-…", "nodOpen": "y",
      "nodKids": [{ "typNode": "tab", "nodPart": 100, "nodName": "y", "uidNode": "f24bb0d8-…" }] }
  ]
}
```

| Node | Field rules |
|---|---|
| **Root** | `typNode:"row"`. `nodName` and `uidNode` both equal `rootId` (default `"dynamix-layout-root"`). `nodPart:100`. On load the saved root uid is **ignored**; the live `rootId` is used. **[#83]** optional `nodMaxd`: the uid of a tabset. |
| **Row** | `nodName:""`, `uidNode`: random UUID. Always has `nodKids` in practice. Direction isn't stored: the root is horizontal and directions alternate by depth. |
| **Tabset** | `nodName:""`, `uidNode`: random UUID (stable across saves within a session and restored on load). `nodOpen`: the **label** of the active tab, omitted when empty. `nodKids`: tabs. **[#83]** `nodFold:true` when folded (omitted otherwise). |
| **Tab** | `nodName`: **the tab's label, which is its identity**. `uidNode`: in React/Solid, a random UUID from `getTabOutput`, new every page load; on load it's **replaced** by `tabsIds.get(nodName)` (`tree-builder.ts:255-257`). `nodPart:100`, meaningless for tabs. No `nodKids`. |

### 5.3 Semantics that migration must respect

- **`nodPart` is a weight, not a size or percentage.**
  - Each child gets `min + extra × part / Σpart(open siblings)`, where `extra = parent size − Σmin − bonds` (`node.ts:107-157`).
  - Parts are floats after a splitter drag (`slider.ts:84-95`). New nodes default to 100.
  - Converting to a v2 `size` means either keeping weight semantics or accepting that a restored layout looks slightly different. Phase 2 decision; see Q4.
- **Identity:** tabs are matched by `nodName`; tabsets and rows by `uidNode`.
- **Direction is positional.** Moving a row to another depth flips its direction. A migration must compute `direction` from depth: even depth (root = 0) is horizontal.
- **Load algorithm:** BFS-zip the JSON against a freshly built node tree (`tree-builder.ts:81-111`). Tabs present in `tabs` but absent from the tree are dropped; tabs in the tree but absent from `tabs` are kept (B8).

### 5.4 Shapes that occur in saved data (migration must accept)

1. **Root with a single child row.** This happens after B7. The direction of that row's children is vertical, because the row sits at depth 1.
2. **Nested rows whose direction equals their parent's.** This can't happen by construction, but I'll treat it as possible in hand-edited files.
3. **Tabset `nodOpen` naming a tab that isn't among its kids.** This is possible after B9-style duplicates or hand edits.
4. **Duplicate tab `nodName`s** (B9).
5. **Fractional `nodPart`s, and `nodPart` ≤ 0.** The second is not produced by the code, but hand edits are possible.
6. **`nodFold` / `nodMaxd` present [#83], or absent** (everything saved by ≤ 1.1.0).
7. **Unknown fields**, to be ignored.

Unverified (to be pinned by characterization tests in Phase 3): empty tabsets, a row directly containing tabs, and a root whose `typNode` isn't `row`.

---

## 6. Baseline numbers (for Phase 5 comparison)

| Artifact | Raw | gzip -9 |
|---|---|---|
| `core/dist/core.es.js` | 45.8 kB | 11.0 kB (includes the licence twice and the banner) |
| `react/dist/index.es.js` | 41.1 kB | 10.4 kB (includes the React 19 jsx-runtime) |
| `react/dist/index.css` | 1.0 kB | 0.5 kB |
| `solid/dist/index.es.js` | 29.7 kB | 7.6 kB |

Tests:
- Core has 6 files, 44 `it` blocks, and generated cases in `manual`/`dynamic`; the whole repo runs 3,766 tests.
- React has 1 test (not executed).
- Solid has 1 test file.

---

## 7. Open questions (need your decision before Phase 2)

1. **PR #83 (maximize/fold).** Should it merge first, so v2 includes and ports it? The audit assumes yes.
2. **Solid's version.** The brief lists Solid with no version and says to mark only `core` and `react` major. But Solid is published (1.0.2) and depends on the core API and types that v2 removes. Should Solid be **major** too, with a port that keeps its props, or should it pin core 1.x until a later Solid redesign?
3. **Tabs missing from a saved layout (B8).** In v2, should a tab in `tabs` but absent from the layout be (a) appended to the active or first tabset, (b) ignored as in v1, or (c) reported through a callback? Should a layout tab with no matching entry in `tabs` be dropped?
4. **Meaning of `size` in v2.** The options:
   - (a) keep v1 weight-of-extra-space semantics, so migration is lossless and resize behaviour is unchanged;
   - (b) switch to a proportional share of the whole size, like react-resizable-panels percentages;
   - with (b), migration converts weights using the minimums, and restored layouts can shift by a few pixels.
5. **Duplicate tab ids.** Should v2 throw in development and dedupe with a warning in production?
6. **`examples/svelte`** (stale `dist/` only): delete it?
