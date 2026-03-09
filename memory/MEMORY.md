# Project Memory

## Stack
- Next.js 16 + TypeScript + React 19
- PostgreSQL via Kysely (type-safe query builder)
- TailwindCSS 4 + Radix UI (shadcn/ui components in src/components/ui/)
- Auth: custom session-based (argon2 + cookies), Google OAuth via `arctic`
- pnpm package manager

## Key Paths
- Dashboard page: src/app/dashboard/page.tsx
- GuestDashboardClient: src/components/dashboard/GuestDashboardClient.tsx
- DB migrations: src/db/migrations/ (SQL files, prefix 000001_, 000002_, ...)
- DB types (manual + codegen): src/db/types.ts
- Auth session: src/lib/auth/session.ts (getAuthUser for server, validateSession for API routes)
- Errors: src/lib/errors.ts (AppError class, Errors constants)
- API routes: src/app/api/**

## DB Schema highlights
- users: id, username, email, password_hash, system_role (sysadmin|user)
- sessions: id, user_id, token_hash, expires_at
- tenants (formerly orgs): id, name, slug
- members: id, user_id, tenant_id, user_role (admin|member)
- profiles: id, user_id, first_name, last_name, dob, mokupuni, mauna, aina, wai, kula, role
- kilo: id, user_id, q1, q2, q3, location, audio, image, created_at

## Profile Setup Feature (feat/profile-setup branch)
- Profile API: src/app/api/profile/route.ts (GET + PUT)
- Profile data fetch (server): src/lib/data/profile.ts
- Profile utils (client-safe): src/lib/profile-utils.ts — UserProfile type + isProfileComplete()
- Migration 000004: adds `role TEXT` column to profiles table
- GuestDashboardClient: editable "Your Account" card with profile fields; KILO button disabled until isProfileComplete()

## Conventions
- Client components import shared pure utilities from src/lib/*-utils.ts (not from src/lib/data/* which imports pg)
- API routes use validateSession(request) for auth, AppError for errors
- Server components use getAuthUser() (React.cache'd)
- DB queries use Kysely fluent API via `db` from src/db/kysely/client.ts
- Toasts via `sonner` (toast.success / toast.error)
- router.refresh() after mutations to re-run server component data fetching
