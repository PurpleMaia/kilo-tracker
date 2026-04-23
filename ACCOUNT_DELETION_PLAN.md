# Plan: Implement account deletion for App Store review

## Context

Apple App Review guideline 5.1.1(v) requires apps that support account creation to also offer an in-app account deletion flow that actually removes the user's account and associated data. KILO Tracker v1.0.1 is planned for iOS submission but currently has neither a "Delete Account" UI nor a backend endpoint that accomplishes deletion — confirmed by `INITIAL_APP_STORE_SUBMISSION.md` §6 and by direct grep of `backend-kilo-tracker/src/app/api/`. Without this, the submission will be rejected.

This plan is the **smallest** change that satisfies the guideline end-to-end. Nothing else is in scope here — no rate-limit hardening, no UX polish, no admin tooling, no soft-delete/grace-period. Deletion is immediate and irreversible.

## Approach

Three changes: one new backend route, one new button in the Profile screen, one route-level backend test.

### Change 1 — Backend: `DELETE /api/account`

**New file:** `backend-kilo-tracker/src/app/api/account/route.ts`

Structure it like the existing DELETE handler in `backend-kilo-tracker/src/app/api/kilo/route.ts:274–335`. Reuse patterns, not abstractions:

| Ingredient | Source |
|---|---|
| Session auth | `validateSession(request)` — `backend-kilo-tracker/src/lib/auth/session.ts:102` |
| Session cookie type for response cleanup | `getSessionCookieFromBrowser(request)` — `backend-kilo-tracker/src/lib/auth/browser.ts:16–35` |
| Azure blob cleanup | Duplicate the small `deletePhotoBlob(url)` helper from `backend-kilo-tracker/src/app/api/kilo/route.ts:337–351` for v1.0; defer extraction to follow-up issue [PurpleMaia/kilo-tracker-backend#1](https://github.com/PurpleMaia/kilo-tracker-backend/issues/1) |
| DB transaction | `db.transaction().execute(async (trx) => { ... })` — example at `backend-kilo-tracker/src/app/api/auth/google/callback/route.ts:142–165` |
| Web cookie clear | `deleteSessionCookieInBrowser(sessionCookie.type, res)` — `backend-kilo-tracker/src/lib/auth/browser.ts:63–71` |
| Error-handling shape | Mirror the `try { ... } catch (AppError | else) { ... }` block at `backend-kilo-tracker/src/app/api/kilo/route.ts:321–334` |

**Handler logic, in order:**

1. Read the browser cookie type up front, then authenticate:
   ```ts
   const sessionCookie = getSessionCookieFromBrowser(request);
   const user = await validateSession(request);
   ```
   `validateSession` still handles the 401 path; `sessionCookie` is just for clearing the cookie on the response.
2. Collect all photo URLs **before** the transaction so we can clean Azure after commit:
   ```ts
   const entries = await db
     .selectFrom("kilo")
     .select(["q1_photo_path", "q2_photo_path", "q3_photo_path"])
     .where("user_id", "=", user.id)
     .execute();
   const photoPaths = entries
     .flatMap(e => [e.q1_photo_path, e.q2_photo_path, e.q3_photo_path])
     .filter(Boolean) as string[];
   ```
3. Run the deletes in a single `db.transaction().execute(async (trx) => { ... })`:
   - `trx.deleteFrom("tasks").where("user_id", "=", user.id).execute()` — `tasks.user_id` has no CASCADE.
   - `trx.deleteFrom("kilo").where("user_id", "=", user.id).execute()` — `kilo.user_id` has no CASCADE. Remaining `tasks` rows keyed by `kilo_id` would cascade on their own via the `tasks.kilo_id ON DELETE CASCADE` FK, but step 1 already removed them.
   - `trx.deleteFrom("profiles").where("user_id", "=", user.id).execute()` — `profiles.user_id` has no CASCADE.
   - `trx.deleteFrom("product_events").where("user_id", "=", user.id).execute()` — `user_id` is `TEXT` with no FK, but the app writes `user.id` directly into it, so this is a straight match.
   - `trx.deleteFrom("login_attempts").where("identifier", "in", [user.email, user.username]).execute()` — these are security logs keyed by identifier strings, not by FK. Delete them unless counsel or policy requires retaining them longer.
   - `trx.deleteFrom("users").where("id", "=", user.id).execute()` — this cascades to `sessions`, `oauth_accounts`, and `members` via their existing `ON DELETE CASCADE` FKs (verified in migrations `000001_create_initial_tables.up.sql` and `000002_create_multi_tenant_tables.up.sql`).
4. After the transaction commits, clean Azure blobs using a duplicated local helper in this route — same fan-out pattern as the kilo DELETE:
   ```ts
   await Promise.all(photoPaths.map(p => deletePhotoBlob(p)));
   ```
   Keep the helper behavior identical: swallow "already gone" errors so missing blobs are a no-op. Do **not** widen the scope with a shared-helper refactor in this release; that follow-up is tracked in [PurpleMaia/kilo-tracker-backend#1](https://github.com/PurpleMaia/kilo-tracker-backend/issues/1).
5. Build the response and clear the browser cookie if one was present:
   ```ts
   const res = NextResponse.json({ success: true });
   if (sessionCookie) {
     deleteSessionCookieInBrowser(sessionCookie.type, res);
   }
   return res;
   ```

**Implementation note on auth/session cleanup:** do **not** call `invalidateSession(request)` inside account deletion. Deleting the `users` row already cascades `sessions`, so the only remaining reason to inspect the cookie is to know which cookie name to clear on the response.

**Rate limiting:** skip. The endpoint is auth-gated; volumetric abuse risk is negligible for v1.0.

### Change 2 — Frontend: "Delete my account" button + handler

**Edit:** `expo-kilo-tracker-frontend/app/(protected)/profile.tsx`

Insert a new `TouchableOpacity` immediately **below** the existing Log Out button (currently at lines 354–363). To distinguish it from Log Out (which uses a red-outline-on-white style), use a stronger destructive treatment — solid red background with white text and a `trash-outline` Ionicon. Stay inside the same FadeIn wrapper.

**Handler flow:**

1. On press, show a confirmation `Alert.alert` using the same shape as the KILO entry delete in `expo-kilo-tracker-frontend/app/(protected)/history.tsx:107–129`:
   ```ts
   Alert.alert(
     "Delete Account",
     "This will permanently delete your account, all KILO entries, photos, and profile data. This cannot be undone.",
     [
       { text: "Cancel", style: "cancel" },
       { text: "Delete Account", style: "destructive", onPress: handleDeleteAccount },
     ]
   );
   ```
2. Inside `handleDeleteAccount`:
   - `await apiFetch("/api/account", { method: "DELETE" })` — reuse the existing mobile API wrapper in `expo-kilo-tracker-frontend/src/lib/api.ts:55–124` so the delete request goes through the same authenticated client path the app already uses elsewhere.
   - `await logout()` — reuses `logout` from `useAuth()` in `expo-kilo-tracker-frontend/src/contexts/AuthContext.tsx:94–103`, but treat it as **client cleanup**, not as part of backend deletion. It clears both SecureStore keys (`session_token`, `session_token_type`) and zeros `user` / `profile` state. Its internal `/api/auth/logout` call is already wrapped in `try/catch`, so it can no-op or fail safely after the account and session rows are gone.
   - `router.replace("/(auth)/login")` — same call already used post-logout at `profile.tsx:165`.
3. On error, `Alert.alert("Error", "Failed to delete account. Please try again.")` — matches history.tsx's fallback at `history.tsx:124`.

No changes needed to `AuthContext`, `apiFetch`, routing, or any other screen.

### Change 3 — One route-level backend test (recommended)

**New file:** `backend-kilo-tracker/src/tests/lib/account/AccountDeletion.test.ts`

Follow the existing route-test pattern in `backend-kilo-tracker/src/tests/lib/kilo/Kilo.test.ts` and the request helpers in `backend-kilo-tracker/src/tests/helpers.ts`:

- `beforeAll`: insert a throwaway user + profile + one kilo entry + one task + one `product_events` row + one `login_attempts` row + a session row.
- One happy-path test: import `DELETE` from the route, create an authenticated `NextRequest`, call `DELETE /api/account`, assert 200, then assert zero rows in `users`, `profiles`, `kilo`, `tasks`, `sessions`, `product_events`, and `login_attempts` for that user.
- `afterAll`: idempotent cleanup.

This is smaller and less brittle than adding a Playwright path for the release-critical change. Skip frontend automation — the Expo repo has no test harness (its `CLAUDE.md` explicitly says "There are no tests in this repo"). Verify the button via the manual steps below.

## Files touched

| File | Change |
|---|---|
| `backend-kilo-tracker/src/app/api/account/route.ts` | **New** — DELETE handler |
| `expo-kilo-tracker-frontend/app/(protected)/profile.tsx` | **Edit** — add button + handler below Log Out at lines 354–363 |
| `backend-kilo-tracker/src/tests/lib/account/AccountDeletion.test.ts` | **New** — one route-level happy-path test |

No schema migrations. No new dependencies. No changes to auth plumbing, rate-limiting, other API routes, or other screens.

## Verification

1. **Automated (backend):** `cd backend-kilo-tracker && pnpm test:unit -- --runInBand src/tests/lib/account/AccountDeletion.test.ts` — new route test passes.
2. **Manual (backend via curl):**
   - `pnpm dev` in the backend.
   - Log in as a seeded user and capture the session cookie from devtools.
   - `curl -i -X DELETE http://localhost:3000/api/account -H "Cookie: <cookie>"` → expect `{ success: true }`.
   - `psql $DATABASE_URL -c "SELECT count(*) FROM users WHERE id = '<user-id>'"` → 0. Same for `profiles`, `kilo`, `sessions`, `oauth_accounts` (if any existed), `members` (if any), `tasks`, `product_events`, and `login_attempts` (using `email` / `username` as the identifiers).
   - Spot-check Azure Blob container — the user's photos should be gone, or the backend log should show `deletePhotoBlob` attempts with swallowed "already gone" errors.
3. **Manual (iOS simulator):**
   - `cd expo-kilo-tracker-frontend && npx expo run:ios`.
   - Log in as a test user who has at least one KILO entry with a photo.
   - Profile → "Delete my account" → tap Cancel in the alert → confirm the user is still signed in.
   - Tap again → tap "Delete Account" → expect redirect to the login screen, and back-swipe does not return to the app.
   - Attempt to log in with the deleted credentials → expect auth failure.
4. **Reviewer dry run:** Before submitting the TestFlight build, run the full flow once on a physical device to confirm no residual state (photos, entries, profile) survives.

## Follow-up after initial release

- Extract the duplicated `deletePhotoBlob` helper from `backend-kilo-tracker/src/app/api/kilo/route.ts` and `backend-kilo-tracker/src/app/api/account/route.ts` into a shared server utility. Tracked in [PurpleMaia/kilo-tracker-backend#1](https://github.com/PurpleMaia/kilo-tracker-backend/issues/1).
