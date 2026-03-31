# CLAUDE.md - AI Development Guide for KILO Tracker

This document helps AI assistants understand how to implement features, write tests, make API calls, and work effectively with this codebase.

## Project Overview

KILO Tracker is a Next.js 16 application using the **App Router**. It's a Progressive Web App (PWA) designed for mobile-first usage, with plans to eventually become a React Native + Expo mobile app. All data operations use **API routes** rather than server actions.

### Key Architectural Decisions

1. **API-first approach** - All CRUD operations go through `/api` routes (not server actions) for React Native compatibility
2. **Multi-tenant** - Organizations (tenants) with user roles (admin/member)
3. **Type-safe database** - Kysely ORM with auto-generated TypeScript types
4. **Session-based auth** - Secure sessions with hashed tokens stored in DB
5. **PWA support** - Service worker, manifest, and install prompts for mobile home screen installation
6. **Voice-first input** - Audio transcription via Speaches API for hands-free KILO entry

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (all data operations)
│   │   ├── audio/         # Speech-to-text transcription
│   │   ├── kilo/          # KILO entry CRUD
│   │   ├── photo/         # Photo upload
│   │   ├── profile/       # User profile management
│   │   └── olelo-noeau/   # Daily Hawaiian proverbs
│   ├── (auth)/            # Auth pages (login, register)
│   ├── dashboard/         # Dashboard pages
│   │   └── survey/        # Onboarding survey
│   └── kilo/              # KILO entry pages
├── components/
│   ├── ui/                # Shadcn primitives (don't modify)
│   ├── kilo/              # KILO feature components
│   │   ├── audio-recorder.tsx  # Voice recording component
│   │   ├── photo-taker.tsx     # Camera/photo capture
│   │   └── kilo-entry-form.tsx # Multi-step entry wizard
│   ├── dashboard/         # Dashboard components
│   ├── pwa/               # PWA install prompts
│   ├── shared/            # Shared components (DailyON, etc.)
│   └── auth/              # Auth components
├── db/
│   ├── kysely/            # Database client
│   ├── migrations/        # SQL migration files
│   └── types.ts           # Auto-generated types (don't edit manually)
├── lib/
│   ├── auth/              # Auth utilities
│   ├── data/              # Data access helpers (admin, member, sysadmin, profile)
│   └── errors.ts          # Error classes
├── hooks/
│   ├── contexts/          # React context providers
│   └── use-kilo.tsx       # KILO entries hook
├── types/
│   └── kilo.ts            # KILO types and question definitions
├── tests/
│   ├── e2e/               # Playwright tests
│   ├── lib/               # Unit tests
│   └── helpers.ts         # Shared test utilities
├── public/
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker
│   └── icons/             # PWA icons
└── uploads/               # User file uploads (photos, not in git)
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
- **Org roles** (`role`): `admin` | `member`

### Auto-Generated Types

After modifying migrations, regenerate types:
```bash
pnpm migrate:up d && pnpm codegen
```

Types are in `src/db/types.ts` - never edit manually.

### Recent Migrations

| Migration | Purpose |
|-----------|---------|
| `000004_add_role_to_profiles` | Added `role` column to profiles |
| `000005_add_unique_constraint_profiles_user_id` | Added unique constraint on `profiles.user_id` |
| `000006_add_photo_path_to_kilo` | Added `photo_path` column, removed `image` column |

## Implementing Features

### Creating a New API Route

API routes live in `src/app/api/`. Use this pattern:

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/kysely/client";
import { validateSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

// 1. Define input schema with Zod
const exampleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
});

// 2. Implement the handler
export async function POST(request: NextRequest) {
  try {
    // 3. Validate session (throws if unauthorized)
    const user = await validateSession(request);

    // 4. Parse and validate input
    const body = await request.json();
    const parsed = exampleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // 5. Perform database operation
    const result = await db
      .insertInto("your_table")
      .values({
        user_id: user.id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      })
      .returning(["id", "name", "created_at"])
      .executeTakeFirst();

    return NextResponse.json({ data: result }, { status: 201 });

  } catch (error) {
    // 6. Handle errors
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("[POST /api/example]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET example with query params
export async function GET(request: NextRequest) {
  try {
    const user = await validateSession(request);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "10");

    const results = await db
      .selectFrom("your_table")
      .selectAll()
      .where("user_id", "=", user.id)
      .limit(limit)
      .execute();

    return NextResponse.json({ data: results });
  } catch (error) {
    // error handling...
  }
}
```

### Creating a New Database Migration

```bash
pnpm migrate:create add_example_table
```

This creates up/down migration files. Edit them:

```sql
-- 000004_add_example_table.up.sql
CREATE TABLE examples (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 000004_add_example_table.down.sql
DROP TABLE IF EXISTS examples;
```

Run migration and regenerate types:
```bash
pnpm migrate:up d && pnpm codegen
```

### KILO Entry API

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

## Writing Tests

### Unit Tests (Jest)

Unit tests go in `src/tests/lib/`. Pattern:

```typescript
// src/tests/lib/example/Example.test.ts
import { POST } from '@/app/api/example/route';
import { NextRequest } from 'next/server';

describe('Example API', () => {
  test('should create example with valid input', async () => {
    const request = new NextRequest('http://localhost:3000/api/example', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.name).toBe('Test');
  });

  test('should return 400 for invalid input', async () => {
    const request = new NextRequest('http://localhost:3000/api/example', {
      method: 'POST',
      body: JSON.stringify({}), // missing required field
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

Run unit tests:
```bash
pnpm test:unit
```

### E2E Tests (Playwright)

E2E tests go in `src/tests/e2e/`. Pattern:

```typescript
// src/tests/e2e/example.spec.ts
import { db } from '@/db/kysely/client';
import { hashPassword } from '@/lib/auth/password';
import { test, expect } from '@playwright/test';
import { testUser } from '../helpers';

test.describe('Example Feature', () => {
  // Setup: create test user
  test.beforeAll(async () => {
    const passwordHash = await hashPassword(testUser.password);
    await db.insertInto('users').values({
      id: testUser.id,
      email: testUser.email,
      username: testUser.username,
      password_hash: passwordHash,
      system_role: 'user',
    }).execute();
  });

  // Cleanup: remove test data
  test.afterAll(async () => {
    await db.deleteFrom('users').where('id', '=', testUser.id).execute();
  });

  test('user can create example', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input#identifier', testUser.email);
    await page.fill('input#password', testUser.password);
    await page.click('button[type="submit"]');

    // Navigate and interact
    await page.goto('/example');
    await page.fill('input[placeholder="Enter name"]', 'My Example');
    await page.click('text=Save');

    // Verify
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

Run E2E tests:
```bash
pnpm test:e2e
```

### Test Helpers

Use `src/tests/helpers.ts` for shared test utilities. The helpers provide factory functions for isolated test data:

```typescript
import {
  createTestUser,
  createTestAdmin,
  createTestOrg,
  createMockRequest,
  createMockGetRequest,
  clearFailedLoginAttempts,
  loginAsUser,
  logout,
  dismissInstallDialog,
} from '../helpers';

// Factory functions generate unique data per test file
const user = createTestUser();
const admin = createTestAdmin();
const org = createTestOrg();

// Mock request helpers for unit tests
const request = createMockRequest(
  { email: 'test@example.com' },         // body
  { 'custom-header': 'value' },          // headers
  { 'session-token': 'abc123' }          // cookies
);

// E2E helpers
await loginAsUser(page);                  // Login with test user
await logout(page);                       // Handle logout
await dismissInstallDialog(page);         // Dismiss PWA install prompt
await clearFailedLoginAttempts();         // Clear rate limiting
```

Static test data (for backwards compatibility):
```typescript
import { testUser, testAdmin, testOrg } from '../helpers';
```

## Authentication

### Protecting API Routes

Always validate sessions in API routes:

```typescript
import { validateSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const user = await validateSession(request); // Throws if unauthorized
  // user.id, user.email, user.system_role available
}
```

### Protecting Pages

For protected pages, check auth in the component:

```typescript
"use client";

import { useAuth } from "@/hooks/contexts/AuthContext";
import { redirect } from "next/navigation";

export default function ProtectedPage() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) redirect("/login");

  return <div>Welcome {user?.email}</div>;
}
```

## Common Patterns

### Error Handling

Use `AppError` for consistent error responses:

```typescript
import { AppError } from "@/lib/errors";

// In API route
if (!resource) {
  throw new AppError("Resource not found", 404);
}
```

### Form Validation

Always use Zod schemas:

```typescript
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().positive().optional(),
});

const parsed = schema.safeParse(data);
if (!parsed.success) {
  // Handle validation errors
}
```

### Database Queries

Use Kysely's fluent API:

```typescript
import { db } from "@/db/kysely/client";

// Insert
const result = await db
  .insertInto("table_name")
  .values({ ... })
  .returning(["id", "created_at"])
  .executeTakeFirst();

// Select
const rows = await db
  .selectFrom("table_name")
  .selectAll()
  .where("user_id", "=", userId)
  .orderBy("created_at", "desc")
  .limit(10)
  .execute();

// Update
await db
  .updateTable("table_name")
  .set({ name: newName })
  .where("id", "=", id)
  .execute();

// Delete
await db
  .deleteFrom("table_name")
  .where("id", "=", id)
  .execute();

// Join
const results = await db
  .selectFrom("members")
  .innerJoin("users", "users.id", "members.user_id")
  .select(["members.id", "users.email", "members.user_role"])
  .where("members.tenant_id", "=", tenantId)
  .execute();
```

## UI Components

### Using Shadcn Components

Import from `@/components/ui/`:

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

### Adding New Shadcn Components

Use the Shadcn CLI:
```bash
npx shadcn@latest add [component-name]
```

## PWA Features

The app is configured as a Progressive Web App with install prompts for iOS, Android, and desktop.

### PWA Components

- `src/components/pwa/pwa-install-prompt.tsx` - Device-specific install instructions
- `src/components/pwa/service-worker-registration.tsx` - SW registration
- `public/manifest.json` - PWA manifest with icons
- `public/sw.js` - Service worker for offline support

### Install Prompt Behavior

- Auto-shows after 2 seconds on first visit
- Dismissible for 7 days with "Don't show again"
- Device detection for iOS (Safari only), Android, Desktop
- Checks if already installed as standalone PWA

## Custom Hooks

### useKiloEntries

Hook for managing KILO entries with delete functionality:

```typescript
import useKiloEntries from "@/hooks/use-kilo";

const {
  entries, setEntries,
  initialLoading, setInitialLoading,
  error,
  deletingId, deleteEntry
} = useKiloEntries();

// Delete an entry
await deleteEntry(entryId);
```

## KILO Questions

Questions are defined in `src/types/kilo.ts`:

```typescript
export const QUESTIONS: Question[] = [
  {
    id: "q1",
    question: "What is your internal weather today?",
    required: true,
  },
  {
    id: "q2",
    question: "What do you see outside today?",
    required: true,
    picture: true,  // Enables photo capture
  },
  {
    id: "q3",
    question: "What are you excited to do today?",
    required: true,
  },
];
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

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `MODEL_BASE_URL` | Speech-to-text API base URL |
| `MODEL_API_KEY` | Speech-to-text API key |
| `SPEACHES_STT_MODEL` | STT model name (optional) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NEXT_PUBLIC_BASE_URL` | App base URL for OAuth callbacks |

## Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (HTTPS) |
| `pnpm build` | Build for production |
| `pnpm test:unit` | Run Jest unit tests |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm test` | Run all tests |
| `pnpm migrate:create <name>` | Create new migration |
| `pnpm migrate:up d` | Run migrations (dev) |
| `pnpm migrate:up p` | Run migrations (prod) |
| `pnpm codegen` | Regenerate DB types |
| `pnpm lint` | Run ESLint |

### Server Scripts (Dokku deployment)

- `server/start.sh` - Production server startup script
- `server/test.sh` - Server health check script

## File Naming Conventions

- **Pages**: `page.tsx` (App Router convention)
- **Layouts**: `layout.tsx`
- **API Routes**: `route.ts`
- **Components**: `kebab-case.tsx` (e.g., `kilo-entry-form.tsx`)
- **Tests**: `*.test.ts` (unit) or `*.spec.ts` (E2E)
- **Types**: `types.ts` or in `src/types/`
- **Hooks**: `use-*.tsx` (e.g., `use-kilo.tsx`)
- **Photo uploads**: `uploads/kilo/{userId}/{timestamp}-{userId.slice(0,8)}.{ext}`

## Tips for AI Assistants

1. **Always use API routes** for data operations, not server actions
2. **Validate sessions** in all protected API routes
3. **Use Zod** for all input validation
4. **Check `src/db/types.ts`** for available database types
5. **Run `pnpm codegen`** after migration changes
6. **Use existing Shadcn components** from `src/components/ui/`
7. **Follow existing patterns** in similar files
8. **Write tests** for new features (unit + E2E)
9. **Handle errors** consistently with AppError
10. **Use test factory functions** (`createTestUser()`, etc.) for isolated test data
11. **Handle PWA install dialog** in E2E tests with `dismissInstallDialog(page)`
12. **Photo paths** must match the validation regex pattern
13. **Profile API uses upsert** - `ON CONFLICT (user_id) DO UPDATE`
14. **KILO questions** are defined in `src/types/kilo.ts` - modify there to change the wizard
