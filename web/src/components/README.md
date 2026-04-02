# Components Layer

The **`src/components`** directory contains reusable UI building blocks that are used throughout the application.

- **UI primitives** (found under `components/ui/`) are lightweight, framework‑agnostic components such as buttons, inputs, dialogs, and layout helpers. They are designed to be themeable and accessible. These were pre-installed using Shadcn UI. 
- **Shared components** (e.g., `components/shared/Loading.tsx`, `DashboardHeader.tsx`) compose UI primitives into higher‑level pieces that are specific to the app’s pages.
- **Auth components** (`components/auth/…`) provide UI for login, registration, and logout flows and integrate with the authentication logic in `src/lib/auth`.

This layer is the **presentation toolkit**: build new pages by assembling these components, and keep visual concerns (styles, accessibility) here rather than scattering them across pages or hooks.
