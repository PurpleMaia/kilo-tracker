# CLAUDE.md - AI Development Guide for KILO Tracker

This document helps AI assistants understand how to implement features, write tests, make API calls, and work effectively with this codebase.

## Project Overview

KILO Tracker is a **pnpm monorepo** with three packages:
- **`@/shared`** (`packages/shared/`) — Shared types, Zod schemas, utilities, and database layer
- **`@/web`** (`web/`) — Next.js 16 API server + web client (App Router)
- **`@/mobile`** (`mobile/`) — React Native + Expo mobile app (primary client)

All data operations use **API routes** rather than server actions. The Expo app is the primary mobile-first client; Next.js serves as the backend API and optional web client.

### Key Architectural Decisions

1. **API-first approach** - All CRUD operations go through `/api` routes (not server actions) for React Native compatibility
2. **Shared package (`@/shared`)** - Types, Zod schemas, errors, and DB layer live in one place, consumed as raw TypeScript (no build step)
3. **Multi-tenant** - Organizations (tenants) with user roles (admin/worker)
4. **Type-safe database** - Kysely ORM with auto-generated TypeScript types
5. **Session-based auth** - Secure sessions with hashed tokens stored in DB
6. **PWA support** - Service worker, manifest, and install prompts for mobile home screen installation
7. **Voice-first input** - Audio transcription via Speaches API for hands-free KILO entry

## Directory Structure

```
kilo-tracker/
├── packages/
│   └── shared/                     # @/shared
│       ├── package.json
│       ├── tsconfig.json
│       ├── .kysely-codegenrc.json
│       └── src/
│           ├── db/
│           │   ├── kysely/
│           │   │   ├── client.ts   # Kysely singleton + pool
│           │   │   └── driver.ts   # Retry driver
│           │   ├── migrations/     # SQL up/down files
│           │   └── types.ts        # Auto-generated types (don't edit manually)
│           ├── types/
│           │   ├── auth.ts         # AuthUser, SessionType, SessionCookie
│           │   ├── db.ts           # Kysely-derived types (User, Member, Org, etc.)
│           │   ├── kilo.ts         # KiloEntry, Question, QUESTIONS
│           │   ├── profile.ts      # UserProfile
│           │   └── index.ts
│           ├── schemas/
│           │   ├── auth.ts         # loginSchema, registerSchema
│           │   ├── kilo.ts         # kiloEntrySchema, updateKiloSchema, deleteKiloSchema
│           │   ├── profile.ts      # profileUpdateSchema
│           │   └── index.ts
│           ├── lib/
│           │   ├── errors.ts       # AppError, Errors
│           │   ├── profile-utils.ts
│           │   └── index.ts
│           └── index.ts
│
├── web/                            # @/web — Next.js (API server + web client)
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── jest.config.ts
│   ├── playwright.config.ts
│   ├── components.json
│   ├── postcss.config.mjs
│   ├── eslint.config.mjs
│   ├── public/
│   ├── server/
│   ├── scripts/
│   └── src/
│       ├── app/                    # Pages + API routes
│       ├── components/             # Web-only (Shadcn/React DOM)
│       ├── db/                     # Re-exports from @/shared
│       ├── types/                  # Re-exports from @/shared
│       ├── lib/
│       │   ├── auth/              # Server-only auth (session, login, password, etc.)
│       │   ├── data/              # Data access helpers (admin, member, sysadmin, profile)
│       │   ├── errors.ts          # Re-export from @/shared
│       │   ├── profile-utils.ts   # Re-export from @/shared
│       │   └── utils.ts           # cn() Tailwind utility
│       ├── hooks/                  # Web hooks (AuthContext, use-kilo, use-query)
│       └── tests/
│
├── mobile/                         # @/mobile — Expo app
│   ├── package.json
│   ├── tsconfig.json
│   ├── app.json
│   ├── babel.config.js
│   ├── metro.config.js
│   ├── tailwind.config.js
│   ├── app/                        # Expo Router pages
│   ├── assets/
│   └── src/
│       ├── components/             # React Native components
│       ├── contexts/               # Mobile AuthContext (SecureStore-based)
│       ├── lib/                    # Mobile API client
│       └── types/                  # Re-exports from @/shared
│
├── .env                            # Shared env vars (not in git)
├── package.json                    # Root workspace scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── CLAUDE.md
```

## Import Conventions

### In web (`@/web`)
```typescript
// Shared types, schemas, lib — import from @/shared
import { AuthUser, KiloEntry } from '@/shared/types';
import { kiloEntrySchema, registerSchema } from '@/shared/schemas';
import { AppError, Errors } from '@/shared/lib';
import { db } from '@/shared/db';

// OR use the local re-exports (both work, @/ aliases still resolve)
import { db } from '@/db/kysely/client';       // re-exports from @/shared/db
import { AppError } from '@/lib/errors';        // re-exports from @/shared/lib
import { AuthUser } from '@/types/auth';        // re-exports from @/shared/types

// Web-only code — always use @/ alias
import { validateSession } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
```

### In mobile (`@/mobile`)
```typescript
import { AuthUser, KiloEntry } from '@/shared/types';
import { kiloEntrySchema } from '@/shared/schemas';
import { AppError } from '@/shared/lib';
```

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, username, password_hash, system_role) |
| `sessions` | Session tokens with expiry |
| `tenants` | Organizations |
| `members` | User-tenant relationships with role |
| `kilo` | KILO observation entries (q1, q2, q3, location, photo_path, audio) |
| `profiles` | Extended user profiles (first_name, last_name, dob, mauna, aina, wai, kula, role) |
| `oauth_accounts` | OAuth provider links |
| `login_attempts` | Security audit log |
| `olelo_noeau` | Hawaiian proverbs (daily rotating display) |
| `activity_categories` | Activity category definitions per tenant |

### User Roles

- **System roles** (`sysrole`): `sysadmin` | `user`
- **Org roles** (`role`): `admin` | `worker`

### Auto-Generated Types

After modifying migrations, regenerate types:
```bash
pnpm migrate:up d && pnpm codegen
```

Types are in `packages/shared/src/db/types.ts` - never edit manually.

## Implementing Features

### Creating a New API Route

API routes live in `web/src/app/api/`. Use shared schemas for validation:

```typescript
// web/src/app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { exampleSchema } from "@/shared/schemas";  // Define in shared

export async function POST(request: NextRequest) {
  try {
    const user = await validateSession(request);
    const body = await request.json();
    const parsed = exampleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await db
      .insertInto("your_table")
      .values({ user_id: user.id, ...parsed.data })
      .returning(["id", "created_at"])
      .executeTakeFirst();

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[POST /api/example]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

### Adding a New Zod Schema

Define schemas in `packages/shared/src/schemas/` and export from the barrel:

```typescript
// packages/shared/src/schemas/example.ts
import { z } from "zod";
export const exampleSchema = z.object({ name: z.string().min(1) });

// packages/shared/src/schemas/index.ts — add export
export { exampleSchema } from './example';
```

### Creating a New Database Migration

```bash
pnpm migrate:create add_example_table
```

Migration files are created in `packages/shared/src/db/migrations/`. Run and regenerate types:
```bash
pnpm migrate:up d && pnpm codegen
```

### Adding New Shared Types

The KILO API (`/api/kilo`) supports full CRUD operations with pagination:

```typescript
// POST - Create new entry
const response = await fetch("/api/kilo", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    q1: "My internal weather is calm",
    q2: "I see sunshine outside",
    q3: "Excited to work on my project",
    photo_path: "/api/uploads/kilo/user-id/timestamp.jpg", // optional
  }),
});

// GET - Paginated list
const entries = await fetch("/api/kilo?page=1&limit=5");
// Returns: { entries: [...], total, page, totalPages }

// GET - Single entry (for editing)
const entry = await fetch("/api/kilo?id=123");
// Returns: { entry: {...} }

// PUT - Update entry
await fetch("/api/kilo", {
  method: "PUT",
  body: JSON.stringify({ id: 123, q1: "Updated answer", ... }),
});

// DELETE - Remove entry
await fetch("/api/kilo", {
  method: "DELETE",
  body: JSON.stringify({ id: 123 }),
});
```

### Audio Transcription API

Voice-to-text transcription using the Speaches API:

```typescript
// POST /api/audio/transcribe
const formData = new FormData();
formData.append("file", audioBlob);

const response = await fetch("/api/audio/transcribe", {
  method: "POST",
  body: formData,
});

const { text } = await response.json();
```

Required environment variables:
- `MODEL_BASE_URL` - Speaches API base URL
- `MODEL_API_KEY` - Speaches API key
- `SPEACHES_STT_MODEL` - Model name (default: `Systran/faster-whisper-large-v3`)

### Photo Upload API

Photo uploads are stored in `uploads/kilo/{userId}/` and served via API:

```typescript
// POST /api/photo
const formData = new FormData();
formData.append("photo", file);

const response = await fetch("/api/photo", {
  method: "POST",
  body: formData,
});

const { path } = await response.json();
// path: "/api/uploads/kilo/{userId}/{timestamp}.jpg"
```

Constraints:
- Max file size: 5MB
- Only image files allowed
- Photo path validation regex: `/^\/api\/uploads\/kilo\/[a-zA-Z0-9-]+\/\d+-[a-f0-9]{8}\.(jpg|jpeg|png|gif|webp)$/i`

### Profile API

User profile management with upsert support:

```typescript
// GET /api/profile - Get current user's profile
const { profile } = await fetch("/api/profile").then(r => r.json());

// PUT /api/profile - Create or update profile
await fetch("/api/profile", {
  method: "PUT",
  body: JSON.stringify({
    first_name: "John",
    last_name: "Doe",
    dob: "1990-01-15",      // ISO date string
    mauna: "Mauna Kea",      // Hawaiian cultural fields
    aina: "Kailua",
    wai: "Nuʻuanu",
    kula: "Punahou",
    role: "student",
  }),
});
```

### Creating a Client Component

Client components that call APIs follow this pattern:

```typescript
// src/components/example/example-form.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ExampleForm() {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/example", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      // Handle success
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter name"
        disabled={isSubmitting}
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
```

### Creating a Page

Pages use the App Router convention:

```typescript
// src/app/example/page.tsx
import { ExampleForm } from "@/components/example/example-form";

export default function ExamplePage() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Example</h1>
      <ExampleForm />
    </main>
  );
}
```
Add to `packages/shared/src/types/` and export from the barrel index.

## Writing Tests

### Unit Tests (Jest)

Unit tests go in `web/src/tests/lib/`. Run from root:
```bash
pnpm test:web:unit
```

### E2E Tests (Playwright)

E2E tests go in `web/src/tests/e2e/`. Run from root:
```bash
pnpm test:web:e2e
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm dev:web` | Start Next.js dev server (HTTPS) |
| `pnpm dev:mobile` | Start Expo dev server |
| `pnpm build:web` | Build Next.js for production |
| `pnpm test:web:unit` | Run Jest unit tests |
| `pnpm test:web:e2e` | Run Playwright E2E tests |
| `pnpm lint` | Run ESLint across all packages |
| `pnpm migrate:create <name>` | Create new migration |
| `pnpm migrate:up d` | Run migrations (dev) |
| `pnpm migrate:up p` | Run migrations (prod) |
| `pnpm codegen` | Regenerate DB types in shared |

### Running from within a package

```bash
pnpm --filter @/web dev        # Same as pnpm dev:web
pnpm --filter @/mobile start   # Same as pnpm dev:mobile
```

### Adding Shadcn Components

Run from the `web/` directory:
```bash
cd web && npx shadcn@latest add [component-name]
```

## Environment Variables

Access in server code:
```typescript
const apiKey = process.env.MODEL_API_KEY;
```

For client-side access, prefix with `NEXT_PUBLIC_`:
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
```

### Required Environment Variables
Shared `.env` lives at the repo root. Required:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `MODEL_BASE_URL` | Speech-to-text API base URL |
| `MODEL_API_KEY` | Speech-to-text API key |
| `SPEACHES_STT_MODEL` | STT model name (optional) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NEXT_PUBLIC_BASE_URL` | App base URL for OAuth callbacks |

## Tips for AI Assistants

1. **Always use API routes** for data operations, not server actions
2. **Define Zod schemas in `@/shared/schemas`** so both web and mobile can use them
3. **Define types in `@/shared/types`** for shared data structures
4. **Validate sessions** in all protected API routes
5. **Check `packages/shared/src/db/types.ts`** for available database types
6. **Run `pnpm codegen`** after migration changes (from repo root)
7. **Use existing Shadcn components** from `web/src/components/ui/`
8. **Follow existing patterns** in similar files
9. **Write tests** for new features (unit + E2E)
10. **Handle errors** consistently with AppError from `@/shared/lib`
11. **Don't share components** between web (Shadcn/React DOM) and mobile (NativeWind/RN)
12. **Don't share AuthContext** — web uses cookies, mobile uses SecureStore
13. **Profile API uses upsert** - `ON CONFLICT (user_id) DO UPDATE`
14. **KILO questions** are defined in `packages/shared/src/types/kilo.ts`
