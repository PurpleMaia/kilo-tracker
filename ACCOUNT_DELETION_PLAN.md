# Plan: Implement account deletion for App Store review

## Context

Apple App Review guideline 5.1.1(v) requires apps that support account creation to also offer an in-app account deletion flow that actually removes the user's account and associated data. KILO Tracker v1.0.1 is planned for iOS submission but currently has neither a "Delete Account" UI nor a backend endpoint that accomplishes deletion — confirmed by `INITIAL_APP_STORE_SUBMISSION.md` §6 and by direct grep of `backend-kilo-tracker/src/app/api/`. Without this, the submission will be rejected.

This plan is the **smallest** change that satisfies the guideline end-to-end. Nothing else is in scope here — no rate-limit hardening, no UX polish, no admin tooling, no soft-delete/grace-period. Deletion is immediate and irreversible.

## Approach

Three changes: one new backend route, one new button in the Profile screen, one integration test.

### Change 1 — Backend: `DELETE /api/account`

**New file:** `backend-kilo-tracker/src/app/api/account/route.ts`

Structure it like the existing DELETE handler in `backend-kilo-tracker/src/app/api/kilo/route.ts:274–335`. Reuse, don't rewrite:

| Ingredient | Source |
|---|---|
| Session auth | `validateSession(request)` — `backend-kilo-tracker/src/lib/auth/session.ts:102` |
| Azure blob cleanup | `deletePhotoBlob(url)` — `backend-kilo-tracker/src/app/api/kilo/route.ts:337–351` (swallows "already gone" errors) |
| DB transaction | `db.transaction().execute(async (trx) => { ... })` — example at `backend-kilo-tracker/src/app/api/auth/google/callback/route.ts:142–165` |
| Web cookie clear | `deleteSessionCookieInBrowser(session, res)` — `backend-kilo-tracker/src/lib/auth/browser.ts:63–71` |
| Error-handling shape | Mirror the `try { ... } catch (AppError | else) { ... }` block at `backend-kilo-tracker/src/app/api/kilo/route.ts:321–334` |

**Handler logic, in order:**

1. `const user = await validateSession(request)` — 401s automatically if no session.
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
   - `trx.deleteFrom("product_events").where("user_id", "=", user.id).execute()` — `user_id` is `TEXT` with no FK. Include this deletion for a clean "all associated data removed" story. Confirm the comparison works (verify the stored format matches `user.id` as a string) during implementation; if the column stores user UUIDs as strings it's a straight match.
   - `trx.deleteFrom("users").where("id", "=", user.id).execute()` — this cascades to `sessions`, `oauth_accounts`, and `members` via their existing `ON DELETE CASCADE` FKs (verified in migrations `000001_create_initial_tables.up.sql` and `000002_create_multi_tenant_tables.up.sql`).
4. After the transaction commits, fire-and-forget blob cleanup — same fan-out pattern as the kilo DELETE:
   ```ts
   await Promise.all(photoPaths.map(p => deletePhotoBlob(p)));
   ```
   `deletePhotoBlob` already swallows errors, so a missing blob is a no-op.
5. Build the response and, if straightforward, clear the web session cookie:
   ```ts
   const res = NextResponse.json({ success: true });
   // If session object is accessible (see note below), also call:
   // deleteSessionCookieInBrowser(session, res);
   return res;
   ```

**Implementation note on the web cookie:** `validateSession` returns an `AuthUser`, not the `session` shape that `deleteSessionCookieInBrowser` wants. Cleanest path is to mirror how `invalidateSession(request)` in `backend-kilo-tracker/src/lib/auth/session.ts:134–146` obtains the session. If that turns out to be awkward, it's acceptable to skip the explicit cookie clear: the session row is destroyed by the `users` cascade, so the cookie is invalidated on next request. On the mobile app this is moot — the token lives in SecureStore and the frontend clears it (see Change 2).

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
   - `await apiFetch("/api/account", { method: "DELETE" })` — reuses `expo-kilo-tracker-frontend/src/lib/api.ts:55–124`, which injects the `x-session-token` / `x-session-type` headers automatically.
   - `await logout()` — reuses `logout` from `useAuth()` in `expo-kilo-tracker-frontend/src/contexts/AuthContext.tsx:94–103`. It clears both SecureStore keys (`session_token`, `session_token_type`) and zeros `user` / `profile` state. Its internal `/api/auth/logout` call will 401 (the session is already gone) but that call is wrapped in `try/catch`, so it's safe.
   - `router.replace("/(auth)/login")` — same call already used post-logout at `profile.tsx:165`.
3. On error, `Alert.alert("Error", "Failed to delete account. Please try again.")` — matches history.tsx's fallback at `history.tsx:124`.

No changes needed to `AuthContext`, `apiFetch`, routing, or any other screen.

### Change 3 — One integration-style test (recommended)

**New file:** `backend-kilo-tracker/src/tests/e2e/account-deletion.spec.ts`

Follow the structure of `backend-kilo-tracker/src/tests/e2e/auth-flow.spec.ts`:

- `beforeAll`: insert a throwaway user + profile + one kilo entry + a session row.
- One happy-path test: call `DELETE /api/account` with the session cookie, assert 200, then assert zero rows in `users`, `profiles`, `kilo`, `sessions` for that user id.
- `afterAll`: idempotent cleanup.

Skip frontend automation — the Expo repo has no test harness (its `CLAUDE.md` explicitly says "There are no tests in this repo"). Verify the button via the manual steps below.

## Files touched

| File | Change |
|---|---|
| `backend-kilo-tracker/src/app/api/account/route.ts` | **New** — DELETE handler |
| `expo-kilo-tracker-frontend/app/(protected)/profile.tsx` | **Edit** — add button + handler below Log Out at lines 354–363 |
| `backend-kilo-tracker/src/tests/e2e/account-deletion.spec.ts` | **New** — one happy-path test |

No schema migrations. No new dependencies. No changes to auth plumbing, rate-limiting, other API routes, or other screens.

## Verification

1. **Automated (backend):** `cd backend-kilo-tracker && pnpm test:e2e -- account-deletion` — new test passes.
2. **Manual (backend via curl):**
   - `pnpm dev` in the backend.
   - Log in as a seeded user and capture the session cookie from devtools.
   - `curl -i -X DELETE http://localhost:3000/api/account -H "Cookie: <cookie>"` → expect `{ success: true }`.
   - `psql $DATABASE_URL -c "SELECT count(*) FROM users WHERE id = '<user-id>'"` → 0. Same for `profiles`, `kilo`, `sessions`, `oauth_accounts` (if any existed), `members` (if any), `tasks` (if any), `product_events` (if any).
   - Spot-check Azure Blob container — the user's photos should be gone, or the backend log should show `deletePhotoBlob` attempts with swallowed "already gone" errors.
3. **Manual (iOS simulator):**
   - `cd expo-kilo-tracker-frontend && npx expo run:ios`.
   - Log in as a test user who has at least one KILO entry with a photo.
   - Profile → "Delete my account" → tap Cancel in the alert → confirm the user is still signed in.
   - Tap again → tap "Delete Account" → expect redirect to the login screen, and back-swipe does not return to the app.
   - Attempt to log in with the deleted credentials → expect auth failure.
4. **Reviewer dry run:** Before submitting the TestFlight build, run the full flow once on a physical device to confirm no residual state (photos, entries, profile) survives.

## Open questions to resolve during implementation

- Exact storage format of `product_events.user_id` (TEXT) — confirm a Kysely `.where("user_id", "=", user.id)` comparison works with the UUID value. If the column is used inconsistently, skip the delete on that table and note it in the app's privacy policy instead.
- Whether to explicitly clear the web session cookie (Change 1, step 5 note). Immaterial for the iOS-only submission; decide before merging so the web surface stays tidy.
