-   Basic data storage for responses (no full admin UI yet)
-   Hard‑coded initial daily questions
-   Simple sign-in (Google OAuth) and profile setup
-   Photo upload + speech‑to‑text implemented for the daily questions
-   List of onboarding steps for pilot users (what to do, when, where)

UI/UX Must Haves:
- workflow to get application to homescreen
- app icon? (PMF logo)
- Daily ʻŌlelo Noʻeau & Mahina Phase

**Hybrid Approach: LocalStorage + Postgres**

| Data Type | LocalStorage | Postgres |
|-----------|--------------|----------|
| Raw transcriptions | ✓ (full text) | - |
| Audio/Image files | ✓ (base64 or blob URL) | Aggregated/summary only |
| Kilo responses | ✓ (detailed) | Aggregated text (privacy) |
| Profile data | - | ✓ (full) |
| Daily questions | - | ✓ (hard-coded seed) |

**Rationale**: Sensitive user reflections stay on-device. Postgres stores anonymized/aggregated versions for research insights without exposing personal content.

---

## Feature 1: Simple Sign-in (Google OAuth) + Profile Setup

### Flow
```
Google OAuth → Create/fetch user → Auto-join default org → Profile setup
```

### MVP Simplification
- Single default organization (e.g., "Kilo Pilot")
- On first sign-in, auto-create `members` record with `role: 'member'`
- Skip org selection UI entirely

### Tables Involved
- `users` (from migration 000001)
- `tenants` / `members` (from migration 000002)
- `profiles` (from migration 000003)

### Implementation
1. **OAuth callback** (`src/lib/auth/oauth.ts`)
   - Check if user exists → create if not
   - Check if member of default org → add if not
   - Redirect to profile setup if `profiles` record missing

2. **Profile setup page** (`/onboarding/profile`)
   - Collect: first_name, last_name, dob, mokupuni, mauna, aina, wai, kula
   - Insert into `profiles` table
   - Redirect to home/dashboard

### Seed Data Needed
```sql
INSERT INTO tenants (name, slug) VALUES ('Kilo Pilot', 'kilo-pilot');
```

---

## Feature 2: Hard-coded Daily Questions

### Storage
- Questions defined in code

### MVP Questions (Hard-coded)
```typescript
const DAILY_QUESTIONS = {
  q1: "",
  q2: "",
  q3: ""
}
```

### Implementation
1. **Daily question component** - reads from constant or fetches from `olelo_noeau`

---

## Feature 3: Photo Upload + Speech-to-Text

### Storage Strategy
| Content | LocalStorage | Postgres |
|---------|--------------|----------|
| Raw audio blob | - | ✓ |
| Raw image blob | ✓ | ✓ |
| Full transcription | ✓ | - |
| Summary/keywords | - | ✓ (aggregated) |

### Implementation

1. **Photo capture/upload**
   - Use `<input type="file" capture="environment">` for mobile camera
   - Store as base64 in localStorage keyed by date/kilo_id
   - On submit: optionally compress and store reference in `kilo.image` (or skip postgres entirely for MVP)

2. **Speech-to-text**
   - Use Whisper API
   - Store raw transcription in localStorage
   - Extract keywords/summary for postgres `kilo` record

3. **Kilo record structure (localStorage)**
   ```typescript
   interface LocalKilo {
     id: string; // uuid
     date: string;
     location: string;
     q1_response: string;
     q2_response: string;
     q3_response: string;
     audio_blob?: string; // base64
     image_blob?: string; // base64
     transcription?: string;
     synced: boolean;
   }
   ```

4. **Sync to Postgres** (background/on-demand)
   - Aggregate responses into summary text
   - Store in `kilo` table without raw media
   - Mark localStorage record as `synced: true`

---

## Feature 4: Basic Data Storage (No Admin UI)

### What gets stored where

**Postgres (aggregated, privacy-safe)**
- `profiles`: full profile data (user consents to this)
- `kilo`: location, timestamp, aggregated/summarized responses
- `olelo_noeau`: lookup data (not user-generated)

**LocalStorage (raw, on-device)**
- Full transcriptions
- Raw audio/images
- Detailed question responses

### API Routes Needed
- `POST /api/kilo` - create kilo record (aggregated)
- `GET /api/kilo` - fetch user's kilo history (for display)
- `POST /api/profile` - create/update profile
- `GET /api/profile` - fetch user profile

**Note:** Using API routes here, instead of server actions for our eventual Expo refactor (Expo/React Native can't use server actions)

---

## Feature 5: Onboarding Steps for Pilot Users

### Implementation
Static page or component listing:
1. Sign in with Google
2. Complete your profile (mokupuni, mauna, etc.)
3. Daily practice: observe, record, reflect
4. When/where to practice kilo

---

## File Structure (New/Modified)

```
src/
├── app/
│   ├── onboarding/
│   │   ├── profile/page.tsx      # Profile setup form
│   │   └── welcome/page.tsx      # Onboarding steps
│   ├── kilo/
│   │   ├── page.tsx              # Daily kilo entry
│   │   └── history/page.tsx      # Past entries (localStorage)
│   └── api/
│       ├── kilo/route.ts         # Kilo CRUD
│       └── profile/route.ts      # Profile CRUD
├── lib/
│   ├── storage/
│   │   └── local-kilo.ts         # LocalStorage helpers
│   └── speech/
│       └── transcribe.ts         # Speech-to-text wrapper
└── components/
    ├── kilo/
    │   ├── QuestionCard.tsx
    │   ├── AudioRecorder.tsx
    │   └── PhotoCapture.tsx
    └── profile/
        └── ProfileForm.tsx
```

---

## Migration Checklist

- [x] 000001: users table
- [x] 000002: tenants, members (multi-tenant)
- [x] 000003: profiles, kilo, olelo_noeau
- [ ] Seed: default org "Kilo Pilot"
- [ ] Seed: initial olelo_noeau entries