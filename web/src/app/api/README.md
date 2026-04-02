# API Layer

The **`src/app/api`** directory holds the server‑side API routes for the Next.js application.

- Each file under `api/*/route.ts` (or `route.tsx`) defines an HTTP endpoint that can be called from external clients.
- These endpoints are **only for secure operations** such as authentication, token refresh, and other logic that must be accessible to external services. They should enforce proper authentication, validation, and rate‑limiting.
- **Do not use API routes for regular CRUD operations**. Instead, implement **React Server Actions** (or Server Components) within the `src/app` layer to perform create, read, update, and delete actions. Server Actions keep the CRUD logic close to the UI and benefit from Next.js's built‑in optimizations.
- The API layer is designed to be **testable**; you can invoke the routes directly in integration tests or with tools like `curl`/`fetch`.
- For CRUD, use Server Actions defined in the appropriate `src/app/.../action.ts` files and call them from your React components. This keeps the client‑side code focused on presentation while the server‑side actions handle data manipulation securely.

Interns should think of this layer as the **backend‑for‑frontend** that external sites interact with, while CRUD lives in server actions inside the app layer.
