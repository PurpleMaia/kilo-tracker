# App Layer

The **`src/app`** directory contains the Next.js application entry points and page routes.

- **Page files** (`*.tsx`) define the UI for each route. For example, `page.tsx` renders the home page, and the nested `app/(auth)` folder holds the login and registration pages. Note that the grouping of pages requires parantheses () around the name.
- **Layout components** (`layout.tsx`) provide shared wrappers such as navigation bars, global CSS imports, and authentication context providers.
- **`globals.css`** holds the base styles applied across the whole app.
- **`middleware.ts`** runs on every request and can enforce redirects, auth checks, or other server‑side logic.

Treat this layer as the **presentation layer** that ties together components, hooks, and services to render the UI.
