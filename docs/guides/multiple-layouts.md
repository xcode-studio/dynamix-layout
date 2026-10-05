# Multiple layouts on one page

Every `<DynamixLayout>` (and every `createLayout()`) is a separate instance with its own state. Put as many on a page as you like:

```tsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100vh' }}>
	<DynamixLayout tabs={leftTabs} defaultLayout={savedLeft} onLayoutChange={saveLeft} />
	<DynamixLayout tabs={rightTabs} defaultLayout={savedRight} onLayoutChange={saveRight} />
</div>
```

- **DOM ids** used for ARIA are scoped by React's `useId`, or by the `id` prop when you pass one, so they never collide.
- **Keyboard shortcuts** listen on each layout's root, so only the layout that has focus reacts.
- **Hooks** (`useTab`, `useLayoutState`, …) use the nearest layout.
- **Drags stay inside their layout.** Moving tabs between two layouts isn't supported.
- **Tab ids only need to be unique within a layout.**

v1 kept its state in module globals, so two layouts on a page overwrote each other. That's fixed in v2.
