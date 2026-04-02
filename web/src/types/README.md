# Types Layer

The **`src/types`** directory holds TypeScript type definitions and interfaces that describe the shape of data used throughout the project.

- **Domain models** (`auth.ts`, `db.ts`, etc.) define the structure of objects that flow between the client, services, and database.
- **Shared utility types** (e.g., `Result<T>`, `ApiResponse`) provide reusable patterns for handling success/error outcomes.
- Keeping types in a dedicated layer ensures **type safety** across the codebase and makes it easy for new developers to understand the expected data contracts.

Reference these types when creating new functions, components, or API routes to maintain consistency in data shapes and catch mistakes at compile time.
