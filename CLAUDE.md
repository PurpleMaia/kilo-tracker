# CLAUDE.md - AI Development Guide for KILO Tracker

## Project Overview

KILO Tracker is a **React Native + Expo** mobile app that calls a **separate backend** API. This repo contains only the Expo frontend.

- **`src/shared/`** — Types, Zod schemas, and utilities **copied from the backend repo** to ensure type correctness on both sides. Keep these in sync manually.
- **`src/components/`** — React Native components (NativeWind styling)
- **`src/contexts/`** — AuthContext using SecureStore for token-based sessions
- **`src/lib/`** — `apiFetch` helper that attaches `x-session-token` header
- **`app/`** — Expo Router screens

There are **no tests** in this repo.

## Preferences

1. **Use `frontend-design-pro` skill** when building new pages/components — apply agency-quality aesthetics
2. **Preserve commented-out legacy code** when rewriting files
3. **No derived fields in DB/types** — derive computed values in code, not in type definitions
4. **NativeWind for styling** — use Tailwind classes via `className`, not inline `style` objects
5. **All data operations go through API calls** to the separate backend
6. **Auth uses SecureStore** — not cookies, not AsyncStorage
7. **Zod schemas live in `src/shared/schemas/`** — validate on the client before sending to API
8. **Types live in `src/shared/types/`** — shared with the backend for type safety

## Import Conventions

```typescript
// Shared types & schemas (mirrored from backend)
import { AuthUser, KiloEntry } from '@/shared/types';
import { kiloEntrySchema } from '@/shared/schemas';
import { AppError } from '@/shared/lib';

// App code
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/apiFetch';
```

## API Reference

The app calls a separate backend. All requests go through `apiFetch` which handles the session token.

### KILO API (`/api/kilo`)

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

### Audio Transcription API (`/api/audio/transcribe`)

```typescript
const formData = new FormData();
formData.append("file", audioBlob);

const response = await fetch("/api/audio/transcribe", {
  method: "POST",
  body: formData,
});

const { text } = await response.json();
```

### Photo Upload API (`/api/photo`)

```typescript
const formData = new FormData();
formData.append("photo", file);

const response = await fetch("/api/photo", {
  method: "POST",
  body: formData,
});

const { path } = await response.json();
// path: "/api/uploads/kilo/{userId}/{timestamp}.jpg"
```

Constraints: max 5MB, images only.

### Profile API (`/api/profile`)

```typescript
// GET - current user's profile
const { profile } = await fetch("/api/profile").then(r => r.json());

// PUT - create or update profile (upsert)
await fetch("/api/profile", {
  method: "PUT",
  body: JSON.stringify({
    first_name: "John",
    last_name: "Doe",
    dob: "1990-01-15",
    mauna: "Mauna Kea",
    aina: "Kailua",
    wai: "Nuʻuanu",
    kula: "Punahou",
    role: "student",
  }),
});
```

## Commands

| Command | Description |
|---------|-------------|
| `npx expo start` | Start Expo dev server |
| `eas build --profile production --platform ios` | Production iOS build |
| `eas build --profile production --platform android` | Production Android build |
| `eas build --platform ios --local` | Local iOS build (no EAS cloud) |

## Environment Variables

Set in `.env` at repo root:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL |
| `IDENTIFIER` | App bundle identifier |

Client-side access uses `EXPO_PUBLIC_` prefix:
```typescript
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
```

## Tips for AI Assistants

1. **This is a frontend-only repo** — no database, no server code, no migrations
2. **`src/shared/` is a copy from the backend** — don't add DB-related code here
3. **Use `apiFetch`** for all API calls — it handles auth tokens
4. **NativeWind components only** — no Shadcn, no React DOM
5. **Follow existing patterns** in similar files
6. **KILO questions** are defined in `src/shared/types/kilo.ts`
