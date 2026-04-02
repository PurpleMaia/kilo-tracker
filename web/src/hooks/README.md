# Hooks Layer

The **`src/hooks`** directory holds custom React hooks that encapsulate reusable logic for the UI and data fetching.

- **Data fetching hooks** (e.g., `use-query.tsx`) wrap server‑side calls, caching, and error handling so components can simply call `useQuery()`.
- **Context hooks** (e.g., `hooks/contexts/AuthContext.tsx`) provide a convenient API for accessing authentication state throughout the app.
- Hooks should be **thin**: they delegate heavy work to services or server actions and keep side‑effects predictable.

Add new hooks here when you notice repeated patterns across components, such as form handling, pagination, or debounced searches.
