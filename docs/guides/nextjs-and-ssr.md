# Next.js and server rendering

`@dynamix-layout/react` renders on the server and hydrates without warnings:

- **No `window` or `document` at import or during render.** All measuring happens in effects.
- **The first render is deterministic.** Rows and tabsets get ids derived from your tab ids (`ts-editor`), and DOM ids come from React's `useId`. Server and client produce the same markup.
- **Before the first measurement** the root has `data-dx-measuring`, and the stylesheet hides its children. On the client the layout measures itself before the first paint, so there's no flash.

## App Router

The package's entry starts with `'use client'`, so you can render `<DynamixLayout>` from a client component. Tab content is often interactive, so the page is usually a client component too:

```tsx
// app/page.tsx
'use client'
import { DynamixLayout } from '@dynamix-layout/react'
import '@dynamix-layout/react/styles.css'
import { tabs } from './tabs'

export default function Page() {
	return <DynamixLayout tabs={tabs} style={{ height: '100vh' }} />
}
```

There's no need for `dynamic(() => import(…), { ssr: false })`; v1 needed it. You can still use it for heavy tab content such as editors.

Server components can read and migrate saved layouts with the core, which has no client code:

```ts
import { isLayoutV1, migrateLayoutFromV1 } from '@dynamix-layout/core'

const saved = await db.getLayout(user.id)
const layout = isLayoutV1(saved) ? migrateLayoutFromV1(saved) : saved
```

## Restoring a saved layout without a mismatch

The server and the client must start from the same layout. If you keep it in `localStorage`, the server can't read it. Either:

- store it where the server can read it (a cookie or your database) and pass it as `defaultLayout` on both sides; or
- render the layout only after mount when you restore from `localStorage`:

```tsx
const [saved, setSaved] = useState<LayoutJSON | null | undefined>(undefined)
useEffect(() => setSaved(load() ?? null), [])
if (saved === undefined) return null
return <DynamixLayout tabs={tabs} defaultLayout={saved ?? undefined} onLayoutChange={save} />
```

## Pitfalls

- **Give the layout a height.** `100vh`, or a parent with a fixed or flex height. In the App Router, a `body` with `height: 100%` doesn't fill the viewport by itself.
- **Import the stylesheet once,** in the page or in `app/layout.tsx`.
- **Two copies of `@types/react`** (common in monorepos with mixed React versions) cause "cannot be used as a JSX component" errors. Make sure your app resolves one copy; see the `paths` in [the Next.js example's tsconfig](../../examples/nextjs/tsconfig.json).
