# KILO Tracker — Apple App Store Submission Data Sheet

> Source material for App Store Connect iOS App Version 1.0.1 submission. Originally gathered from a review of `expo-kilo-tracker-frontend/` and `backend-kilo-tracker/` on **Wednesday, April 22, 2026 at 12:45pm HST**. Status updated **Friday, April 24, 2026**.
>
> This document does **not** attempt to fill out the marketing copy for you — it gives you everything you need to fill it out accurately. Copy sections into the App Store Connect form; refine the tone to taste.

---

## Status — what's done since the original audit (2026-04-22 → 2026-04-24)

All code-level and infrastructure-level blockers identified in §6 are resolved:

- ✅ **Account deletion** — `DELETE /api/account` (backend) + "Delete my account" button in Profile (frontend), with cascade across `users`, `sessions`, `profiles`, `kilo`, `tasks`, `product_events`, `login_attempts`, plus Azure photo blob cleanup.
- ✅ **Camera + Photo Library Info.plist usage strings** — added to `expo-kilo-tracker-frontend/app.config.ts`.
- ✅ **Privacy UI honesty** — sharing card on Profile and Onboarding now reads "Coming in a future version. All entries are encrypted at rest in this release.", removing the misleading opt-out copy.
- ✅ **Version alignment** — App Store Connect record bumped to `1.0.1` to match `app.config.ts` / `package.json`. EAS still uses `appVersionSource: "remote"`, so the EAS-stored version is the source of truth at build time.
- ✅ **Support page** — `/support` published in `backend-kilo-tracker` (`src/app/support/page.tsx`), gated through `<PublicGate>` so it bypasses the coming-soon wall. URL once deployed: `https://<backend-domain>/support`.
- ✅ **Privacy Policy page** — `/privacy` published in `backend-kilo-tracker` (`src/app/privacy/page.tsx`), same gating. URL once deployed: `https://<backend-domain>/privacy`.

**What's left is App Store Connect form-filling and one production-environment confirmation.** See §8 at the bottom for the consolidated remaining checklist.

---

## At-a-Glance Fact Sheet

| Field | Value |
|---|---|
| App name | KILO Tracker |
| Bundle identifier (iOS) | `org.purplemaia.kilotracker` |
| App version | 1.0.1 (per `app.config.ts`, EAS, and App Store Connect — aligned ✅) |
| Slug | `kilo-tracker` |
| URL scheme | `kilo-tracker` |
| Orientation | Portrait |
| iPad support | Yes (`supportsTablet: true`) |
| UI style | Light |
| Organization / Publisher | Purple Maiʻa Foundation |
| EAS project ID | `6edaa094-9c7d-4883-9e17-dbea67e24fa1` |
| Uses non-exempt encryption? | No (`ITSAppUsesNonExemptEncryption: false`) |
| Paid / free | Free (no IAP, no subscriptions, no ads) |
| Suggested age rating | 4+ (no objectionable content; educational / self-reflection) |
| Primary category suggestion | Education |
| Secondary category suggestion | Lifestyle (or Reference) |

Relevant source files:
- `expo-kilo-tracker-frontend/app.config.ts`
- `expo-kilo-tracker-frontend/package.json`
- `expo-kilo-tracker-frontend/README.md`
- `backend-kilo-tracker/CLAUDE.md`

---

## 1. App Product Page Metadata (first screenshot)

### 1.1 App Previews & Screenshots (0 of 3 / 0 of 10)

Not derivable from code. You will need to capture screens yourself. Suggested shot list that reflects actual functionality in the repo:

1. **Login screen** (`app/(auth)/login.tsx`) — shows brand + "Aloha. Pilina. Hulihia." tagline.
2. **Home / dashboard** (`app/(protected)/index.tsx`) — personalized greeting, hero, ʻŌlelo Noʻeau quote.
3. **KILO entry wizard, Q1 (Papahulilani)** — voice-first entry with mic button and guiding prompts.
4. **Live transcription in progress** — recording state with interim text.
5. **Photo capture for a question** — camera preview + "Add a photo" state.
6. **Q4 (Naʻau)** — internal reflection / gratitude question.
7. **History / journal with calendar** (`app/(protected)/history.tsx`) — marked dates, entry list.
8. **Entry detail / edit** (`app/(protected)/kilo/edit.tsx`).
9. **Learn tab — Papakū Makawalu content** (`app/(protected)/learn.tsx`).
10. **Profile + privacy/consent settings** (`app/(protected)/profile.tsx`) — encryption / sharing choice.

### 1.2 Promotional Text (170 chars)

Draft options (pick / edit):

- **Option A (88 chars):** "Daily kilo — Hawaiian observation practice with voice, photos, and the Papakū Makawalu framework."
- **Option B (150 chars):** "A voice-first journal for daily kilo — the Hawaiian practice of deep observation of sky, land, living systems, and naʻau. Grounded in Papakū Makawalu."

### 1.3 Description (4,000 chars) — raw material

**One-sentence pitch:** KILO Tracker is a voice-first daily observation journal grounded in the Hawaiian practice of *kilo* (deep, intentional observation) and the *Papakū Makawalu* framework.

**What users do in the app (each is built and working in v1.0.1):**

- Create a daily KILO entry through a 4-step wizard. Each step asks one structured question:
  1. **Papahulilani** — the space above your head to where the stars sit (sky, wind, temperature, air).
  2. **Papahulihonua** — the earth and oceans (ground, water, shoreline, land).
  3. **Papahānaumoku** — all things that give birth, regenerate and procreate (plants, birds, insects, cycles).
  4. **Naʻau** — how you are feeling internally and what you are grateful for today.
- Answer each question by **voice**, by **typing**, or both. Voice uses online transcription when the network is available, and falls back to **on-device speech recognition** when offline.
- **Attach a photo** to Q1, Q2, or Q3 (Q4 is reflective only).
- **Review past entries** in a calendar-backed history view; edit or delete any entry.
- **Learn** the cultural and scientific foundations in an in-app reference section: Papakū Makawalu, the practice of kilo, Kaulana Mahina (lunar calendar) with all 18 moon phases across the three anahulu, and the two primary seasons (Kau Wela, Hoʻoilo).
- **Control your privacy** on a per-account basis: choose between "Keep my KILO private and encrypted at rest" or "Share my KILO with others," and acknowledge how your data is stored before the profile is considered complete.
- **Manage your profile** with place-based identifiers meaningful to the practice: mauna, ʻāina/moku, wai, kula.

**Who it's for:** Students, educators, cultural practitioners, and community members who want to build a daily observation practice rooted in Hawaiian epistemology. Built by the Purple Maiʻa Foundation.

**Acknowledgment already present in the app (Learn screen):** Thanks to the Edith Kanakaʻole Foundation and cultural practitioners whose teachings inform the Papakū Makawalu content shown in-app.

### 1.4 Keywords (100 chars, comma-separated)

Candidate list (pick a subset that totals ≤100 chars including commas; Apple strips spaces):

`kilo, hawaiian, observation, papaku makawalu, journal, voice journal, lunar, kaulana mahina, nature, aina`

Example 96-char packing: `kilo,hawaiian,observation,papaku,makawalu,journal,voice,lunar,kaulana,mahina,nature,aina,naau`

Avoid duplicating words already in the app name ("KILO" / "Tracker" are indexed from the title and should not be repeated in keywords).

### 1.5 Support URL

✅ **Resolved.** A support page is now published in the backend repo at `src/app/support/page.tsx`. Once the backend is deployed, the URL to enter into App Store Connect is:

```
https://<backend-domain>/support
```

The page covers app overview, contact (`kokua@purplemaia.org`), and a small FAQ (account deletion, password reset, voice transcription, permissions, storage, link to privacy).

### 1.6 Marketing URL (optional)

**Not defined in the codebase.** Suggested: a landing page under `https://purplemaia.org/` describing the app. Leave blank if no page yet — this field is optional.

### 1.7 Version

✅ **Resolved.** App Store Connect record bumped to `1.0.1`, matching `app.config.ts`, `package.json`, and (most importantly, since `appVersionSource: "remote"`) the EAS-stored version.

### 1.8 Copyright (200 chars)

Not defined in the codebase. Conventional form:

`© 2026 Purple Maiʻa Foundation`

Confirm the exact legal entity name with the foundation.

### 1.9 Routing App Coverage File

**Not applicable.** KILO Tracker is not a mapping / routing app. Leave empty.

---

## 2. App Review Information (second screenshot)

### 2.1 Sign-In Required — test credentials

Sign-in **is** required. The app is unusable without an account — the login screen is the first screen after launch, and the protected routes cover all substantive functionality.

Auth flow (frontend — `src/contexts/AuthContext.tsx`, `src/lib/api.ts`):
- Email-or-username + password login. **Google Sign-In is not exposed in the iOS client** — a grep of `app/` and `src/` for "google" / "oauth" returns only the `@expo-google-fonts/newsreader` font package. The backend has Google OAuth endpoints, but the mobile app does not call them in v1.0.
- Session token stored in iOS Keychain via `expo-secure-store`, sent as `x-session-token` header.

Backend (`backend-kilo-tracker/src/app/api/auth/`):
- `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `GET /api/auth/session`.
- Argon2id password hashing; 24-hour session expiration; rate limiting on login (5 / 15 min) and registration (5 / 60 min).
- Google OAuth endpoints (`/api/auth/google/authorize`, `/api/auth/google/callback`) exist server-side via the Arctic library with PKCE, but are not wired into the Expo client; they will not be exercised by the iOS build Apple reviews.

**What to provide to Apple:**
- A production-reachable test account that is already **through onboarding** (so the reviewer does not have to fill in profile fields or choose a privacy option to reach the main flow).
- That account should have at least one existing KILO entry so the reviewer can exercise edit/delete and the history calendar without first making an entry.

The backend seed script (`scripts/init/helpers/seed.ts`) creates demo accounts `jdoe` / `jsmith` / `ajohnson` with password `password123!`. **Do not hand these to Apple as-is** — they are development seeds and their passwords are committed in source. Create a dedicated reviewer account on the production backend with a fresh password, and record it here before submitting.

Fields to populate in App Store Connect:
- **User name:** `<create a fresh reviewer account — e.g. apple_reviewer>`
- **Password:** `<strong unique password, not the seed password>`

### 2.2 Contact Information

Not derivable from code. Provide a real human who can respond to App Review within 24 hours (typically you):

- First name / Last name: _your name_
- Phone: _your phone, in international format with `+1`_
- Email: `dpickett@purplemaia.org` (the email on record for this session — confirm this is the right address for App Review correspondence)

### 2.3 Notes for the reviewer (4,000 chars) — draft

Paste and adapt:

> **What the app does.** KILO Tracker is a voice-first daily observation journal grounded in the Hawaiian practice of *kilo* and the *Papakū Makawalu* framework. Users answer four structured observation questions per day (sky, earth/ocean, living systems, and inner state), optionally attaching a photo to the first three, and can review past entries on a calendar. An in-app "Learn" section explains the cultural context.
>
> **Test account.** Sign in with the credentials provided in the Sign-In Information section. The account is pre-onboarded and already has several historical KILO entries so you can immediately exercise the main flows. Sign-in uses email/username + password; no third-party sign-in is offered in this release.
>
> **Main flows to exercise.**
> 1. After sign-in, you land on the home dashboard. The "Start your KILO" CTA opens the 4-step entry wizard.
> 2. On each wizard step, tap the microphone to record — the app transcribes your voice and appends the text to the answer. You may also type by tapping "Prefer to type instead?". Q1–Q3 also allow attaching a photo.
> 3. On the final step, tap "Save Entry" to submit. The entry appears in History.
> 4. "History" shows a calendar of days with entries. Tapping an entry lets you edit or delete it.
> 5. "Learn" contains four tabbed reference sections (Papakū Makawalu, Kilo, Kaulana Mahina, Kau). This is static educational content.
> 6. "Profile" lets you update your information, change the privacy setting (private & encrypted vs. shared), and sign out.
>
> **Permissions the app requests, and why.**
> - **Microphone** (`NSMicrophoneUsageDescription`): required to record voice observations that are then transcribed into the answer text. Users can always bypass the microphone by typing instead.
> - **Speech Recognition** (`NSSpeechRecognitionUsageDescription`): required so the app can transcribe recordings on-device when there is no network. Online transcription uses the server-side transcription endpoint instead.
> - **Camera / Photo Library** (via `expo-image-picker`): required when the user chooses to attach a photo to an observation question. Optional — every KILO can be saved without photos.
> - **Network** — required: this is a client app that reads and writes to a backend API.
> No location, contacts, calendar, health, or motion data is accessed.
>
> **What data we collect and where it goes.**
> - Account: email, username, password hash (Argon2id, server-side only).
> - Profile: first/last name, date of birth, and Hawaiian place-based identifiers (mauna, ʻāina/moku, wai, kula) — all optional except first name, last name, DOB, and ʻāina.
> - KILO entries: the user's text answers and optional photos.
> - Text answers are encrypted at rest on the server using AES-256-GCM before being stored.
> - Photos are stored in Azure Blob Storage via the backend.
> - Voice audio is sent to a backend transcription endpoint (self-hosted OpenAI-compatible Whisper model) and returned as text; audio is not persisted in KILO's database.
> - The app does not use any third-party analytics, advertising, or attribution SDKs.
>
> **Account deletion.** The app includes a "Delete my account" flow in Profile, which permanently removes the user record, profile, KILO entries, photos, and sessions.
>
> **Backend / infrastructure.** The iOS client talks to a Next.js backend operated by the Purple Maiʻa Foundation over HTTPS. No third-party analytics or ad networks.
>
> **Contact.** If anything is unclear, please contact <name>, <email>, <phone>. We are happy to hop on a call.

### 2.4 Attachment

Optional. If you attach anything, the obvious candidates are:
- A one-page PDF walk-through of the main flows with screenshots (especially the voice-recording path, since it is the app's most distinctive behavior).
- A short demo video showing a full KILO entry being created via voice, saved, and re-opened from History.

---

## 3. Privacy / Nutrition Label prep (Apple asks separately)

App Store Connect will also prompt you for a Privacy "Nutrition Label" in the App Privacy section. Here is the ground truth for those answers based on the codebase.

### 3.1 Data collected and linked to the user

| Data type | Source | Purpose | Linked to user? | Used for tracking? |
|---|---|---|---|---|
| Email address | Registration / Google OAuth | Authentication, account recovery | Yes | No |
| Name (first, last) | Profile | App functionality (personalization) | Yes | No |
| Username | Registration | Authentication, personalization | Yes | No |
| Date of birth | Profile | App functionality | Yes | No |
| Other user content — text (KILO answers q1–q4) | KILO entry wizard | App functionality (core product); stored AES-256-GCM encrypted at rest | Yes | No |
| Photos (q1–q3 attachments) | Camera / Photo Library | App functionality (core product); stored in Azure Blob Storage | Yes | No |
| Audio data (transient) | Microphone → transcription endpoint | App functionality (voice transcription); **not persisted** in KILO's database, only the returned text | Yes (during processing) | No |
| Place / location identifiers (mauna, ʻāina, wai, kula — user-entered strings, not GPS) | Profile | App functionality (cultural context) | Yes | No |
| User ID | Server-assigned | Authentication, analytics | Yes | No |
| Product interaction / analytics events (e.g., `kilo.created`, `photo.uploaded`) | Backend server-side logs | Internal analytics | Yes | No |
| IP address, user agent, login timestamp | Backend `login_attempts` table | Security / abuse prevention | Yes (to the attempt record) | No |

**Precise geolocation:** Not collected. The app never requests location permission; "place" fields are self-described, not GPS.

**Contacts, health, financial, browsing history, search history, sensitive info:** Not collected.

**Tracking (as Apple defines it — linking with third-party data or for advertising):** No. No ad networks, no third-party analytics SDK, no attribution SDK, no IDFA access. You should answer "No" to the "Does this app track users?" question.

### 3.2 Third-party data flows

| Service | Data sent | Notes |
|---|---|---|
| Backend (Purple Maiʻa-operated Next.js) | Everything in the table above | First-party from a privacy-label perspective. |
| Azure Blob Storage | KILO photos | Used as storage; accessed via backend signed URLs. |
| OpenAI-compatible Whisper transcription (self-hosted by default — `MODEL_BASE_URL` env var) | Audio | Returns text; audio not retained by KILO. Confirm with your Speaches/self-host config what the retention is on that provider. |
| Google (OAuth) | Auth code exchange for email + Google user ID | Only if the user chooses Google Sign-In. |
| No analytics / ad / attribution SDKs are present in the client. | — | Confirmed by inspection of `package.json`. |

### 3.3 Encryption posture

- KILO text answers (`q1`–`q4`) are encrypted at rest with AES-256-GCM in the `kilo` table (`backend-kilo-tracker/src/lib/crypto.ts`), using the `KILO_ENCRYPTION_KEY` environment variable (64-hex-char / 256-bit key). Format stored: `iv:authTag:ciphertext`.
- Session tokens are stored hashed in the database; the raw token lives only in the iOS Keychain via `expo-secure-store` on the client and in an httpOnly cookie on the web.
- Passwords are hashed with Argon2id.
- `ITSAppUsesNonExemptEncryption: false` is already declared in `app.config.ts`, meaning you are claiming the encryption-exemption status. This is correct provided you only use standard TLS + OS-provided crypto + this AES-GCM of user content — all of which are exempt. No export-compliance documentation required.

---

## 4. Permissions the app requests (App Review reads these strings)

From `app.config.ts` → `expo.ios.infoPlist`:

- `NSSpeechRecognitionUsageDescription`: **"KILO uses speech recognition to transcribe your voice observations."**
- `NSMicrophoneUsageDescription`: **"KILO needs microphone access to record your voice observations."**

Camera / Photo Library access is requested at runtime by `expo-image-picker`. The Expo plugin supplies default usage strings. **Recommendation:** explicitly set `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` in `app.config.ts` with KILO-specific wording before submitting (e.g. "KILO uses the camera to attach a photo to your observation."). Reviewers flag generic strings.

---

## 5. Feature inventory (authoritative list for the Description field)

Cross-reference map of every user-facing feature to where it lives in the codebase. Useful if Apple asks about a specific capability.

| Feature | Code location |
|---|---|
| Email/username + password login | `app/(auth)/login.tsx`, backend `src/app/api/auth/login` |
| Registration | `app/(auth)/register.tsx`, backend `src/app/api/auth/register` |
| Google OAuth | backend `src/app/api/auth/google/authorize`, `.../callback`; uses Arctic lib |
| 3-step onboarding (About You, Place, Consent) | `app/(protected)/onboarding.tsx` |
| Home dashboard with greeting, ʻŌlelo Noʻeau, today summary | `app/(protected)/index.tsx` |
| 4-step KILO entry wizard | `app/(protected)/kilo/index.tsx` |
| Voice recording + online transcription | Same file, uses `expo-av` + `/api/audio/transcribe` |
| Offline fallback via on-device speech recognition | Same file, uses `expo-speech-recognition` |
| Typing input alternative to voice | Same file, "Prefer to type instead?" toggle |
| Photo attachment per question (Q1–Q3) | Same file, uses `expo-image-picker` |
| Edit existing entry | `app/(protected)/kilo/edit.tsx` |
| History calendar + entry list | `app/(protected)/history.tsx` |
| Delete entry (with confirm) | Same file, DELETE `/api/kilo` |
| Learn section (Papakū Makawalu, Kilo, Kaulana Mahina, Kau) | `app/(protected)/learn.tsx` |
| Profile edit | `app/(protected)/profile.tsx` |
| Privacy choice: private-and-encrypted vs shared | Same file; stored in `profiles.encrypt_kilo_entries` / `profiles.share_kilo_entries` |
| Consent acknowledgment gate | Same file; `profiles.consent_privacy_ack` must be true |
| Sign out | Same file |

No feature is present that is **not** on this list. In particular, the v1.0.1 app has:

- ❌ No in-app purchases, no subscriptions, no ads.
- ❌ No social feed, no sharing, no comments, no messaging.
- ❌ No location services.
- ❌ No HealthKit, no Sign in with Apple, no Google Sign-In in the iOS client (email/password only).

---

## 6. Action items — status as of 2026-04-24

Original list of things likely to block review or invite rejection, with current status. Ordered: hard blockers first, then metadata-required, then nice-to-haves.

### Hard blockers (will cause rejection)

1. ✅ **Account deletion flow.** Done. `DELETE /api/account` (`backend-kilo-tracker/src/app/api/account/route.ts`) cascades across `tasks`, `kilo`, `profiles`, `product_events`, `login_attempts`, and `users` in a single transaction, then deletes Azure photo blobs. Frontend "Delete my account" button is in `expo-kilo-tracker-frontend/app/(protected)/profile.tsx` with a confirmation alert; on success it calls `logout()` and routes back to `/login`.

### Required by the submission form or adjacent Apple sections

2. ✅ **Support URL.** Done in code. `backend-kilo-tracker/src/app/support/page.tsx` is published and routed through `<PublicGate>` so it bypasses the coming-soon wall. Enter `https://<backend-domain>/support` in App Store Connect after the backend is deployed.
3. ✅ **Privacy Policy URL.** Done in code. `backend-kilo-tracker/src/app/privacy/page.tsx` covers everything in §3 of this document — what's collected, how it's used, encryption posture, third-party services (Azure, transcription endpoint), no tracking, account deletion, contact (`kokua@purplemaia.org`). Enter `https://<backend-domain>/privacy` in App Store Connect after deployment.
4. ✅ **Version number alignment.** Done. App Store Connect record is now `1.0.1`, matching `app.config.ts`, `package.json`, and the EAS-stored version (which is the source of truth at build time given `appVersionSource: "remote"`).
5. ✅ **Camera / photo library usage descriptions.** Done. `expo-kilo-tracker-frontend/app.config.ts` now declares both `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` with KILO-specific copy.
6. ⏳ **Reviewer test account.** Still required. Create a fresh production account specifically for Apple review — do **not** hand over the seed-script demo credentials (`jdoe` / `password123!`) since those are in source control. Pre-onboard it and add at least one historical KILO entry so the reviewer can immediately exercise edit/delete and the calendar.
7. ⏳ **Production backend URL.** Still required. Confirm the `EXPO_PUBLIC_API_URL` in your EAS production environment points to the public production deployment, not a LAN/dev host. Run `eas env:list --environment production` to verify before the next build.

### Nice-to-haves (won't block review, but worth doing)

8. ⏳ **Seed script in production.** Verify `scripts/init/helpers/seed.ts` is not run against the production database, and that the three demo accounts (`jdoe`, `jsmith`, `ajohnson`) do not exist on the production backend the App Store build talks to.
9. ✅ **Encryption-toggle UI honesty.** Done as a copy-only fix. The "Share my KILO with others" card on both Profile and Onboarding now reads "Coming in a future version. All entries are encrypted at rest in this release.", removing the misleading opt-out implication. Backend behavior (always encrypt) is unchanged. If sharing ever ships for real, the card copy and backend behavior need to be wired together at that point.
10. ⏳ **Accessibility pass.** Still open. Most custom buttons (mic, next/back, calendar cells) lack explicit `accessibilityLabel` / `accessibilityRole`. Apple does not usually reject for this, but VoiceOver usability on a voice-heavy app is the kind of thing reviewers notice.

### Deliberately deferred — not a v1.0 blocker

- **Sign in with Apple** is **not required** for this submission. Apple guideline 4.8 only applies if the app offers a third-party sign-in (Google, Facebook, etc.) in the client UI. A grep of `expo-kilo-tracker-frontend/app` and `expo-kilo-tracker-frontend/src` for "google" / "oauth" returns only the `@expo-google-fonts/newsreader` font package — the iOS client offers email/password only. The backend's Google OAuth endpoints exist but are unreachable from the mobile app and will not trigger 4.8. When a future release adds Google Sign-In to the iOS client, Sign in with Apple must ship alongside it. **Make sure your App Store description and screenshots don't advertise Google Sign-In** (that would be a 2.3.1 metadata-accuracy issue).

---

## 7. Quick answers for common App Review follow-up questions

| Question Apple sometimes asks | Answer / where to look |
|---|---|
| "Does your app access the microphone? For what purpose?" | Yes — to record voice observations that are transcribed to text as the content of a KILO entry. User can always type instead. |
| "Does your app use speech recognition?" | Yes — on-device fallback when offline, via `expo-speech-recognition`; online path sends audio to our own backend transcription endpoint. |
| "Is user-generated content shown to other users?" | No. Entries are visible only to the authoring user. There is no feed, no social, no sharing in v1.0. |
| "Does the app require an account?" | Yes — all functionality beyond the login screen requires authentication. |
| "Do you offer Sign in with Apple?" | No. Not required for this release — the iOS client offers email/password only, so Apple guideline 4.8 does not apply. If a future release adds Google or another third-party sign-in, Sign in with Apple will ship alongside it. |
| "Is there a subscription or IAP?" | No. Free app. |
| "Do you have a privacy policy?" | Yes — `https://<backend-domain>/privacy` (see §1.5 / §6 #3). |
| "Where are user photos stored?" | Azure Blob Storage, accessed via our backend API. |
| "Is audio retained?" | No — audio is streamed to the transcription endpoint for processing and is not persisted in our database. |
| "Encryption?" | AES-256-GCM for KILO text content at rest; Argon2id for passwords; iOS Keychain via `expo-secure-store` for the session token on-device. `ITSAppUsesNonExemptEncryption: false`. |

---

## 8. Remaining work before "Submit for Review"

All code and infra changes are landed. Everything below is either App Store Connect form-filling, asset creation, or a one-time production environment confirmation.

### A. App Store Connect — text fields you still need to write or paste

Use §1 of this document as raw material; refine to taste.

- [ ] **Promotional Text** (≤170 chars) — pick / edit one of the drafts in §1.2.
- [ ] **Description** (≤4,000 chars) — assemble from §1.3 raw material into final marketing copy.
- [ ] **Keywords** (≤100 chars, comma-separated, no spaces) — pick a subset from §1.4.
- [ ] **Marketing URL** *(optional)* — leave blank unless you publish a landing page on `purplemaia.org`.
- [ ] **Support URL** — paste `https://<backend-domain>/support` once the backend is deployed.
- [ ] **Privacy Policy URL** — paste `https://<backend-domain>/privacy` once the backend is deployed.
- [ ] **Copyright** — `© 2026 Purple Maiʻa Foundation` (confirm exact legal entity name).
- [ ] **Primary / Secondary category** — Education / Lifestyle (or Reference) per §at-a-glance.
- [ ] **Age rating** — answer the questionnaire to land at 4+.
- [ ] **Reviewer notes** (≤4,000 chars) — paste / adapt the draft in §2.3.
- [ ] **Reviewer contact info** (§2.2) — name, phone in international format, email.

### B. App Store Connect — Privacy "Nutrition Label"

Use §3 as the source of truth. Apple asks the questions in App Store Connect → App Privacy.

- [ ] Answer "Does this app collect data?" → **Yes**, then enumerate per §3.1.
- [ ] Answer "Does this app track users?" → **No**.
- [ ] For each data type collected, mark linked-to-user / used-for-tracking per the table.

### C. Assets to create

- [ ] **Screenshots** — 0 of 3 minimum required (6.7" iPhone) and additional sizes per Apple's current matrix. Suggested shot list in §1.1.
- [ ] **Optional attachment** (§2.4) — a short demo video of the voice-recording → save → reopen flow is the most useful single artifact if you want one.

### D. Production environment

- [ ] **Reviewer test account** — create a fresh production account with `kokua@purplemaia.org`-style support visibility, pre-onboarded, with at least one historical KILO entry. Record credentials in App Store Connect → App Review Information → Sign-In Information. **Do not** use seed-script accounts (`jdoe` / `password123!`).
- [ ] **`EXPO_PUBLIC_API_URL` in EAS production** — verify with `eas env:list --environment production`. Should be the public production backend URL, not LAN/dev.
- [ ] **Seed accounts in prod DB** — confirm `jdoe`, `jsmith`, `ajohnson` do not exist on the production database the App Store build talks to.

### E. Build + submit

- [ ] Push the two outstanding commits on `expo-kilo-tracker-frontend@dev` (Info.plist additions + sharing copy clarification) and the one outstanding commit on `backend-kilo-tracker@dev` (support + privacy pages).
- [ ] Deploy the backend so `/support` and `/privacy` return 200 over HTTPS.
- [ ] `eas build --profile production --platform ios` → upload to TestFlight → smoke-test the full account creation, KILO entry (voice + photo), edit, delete, and account-deletion flows.
- [ ] In App Store Connect, attach the new build to the 1.0.1 version record and submit for review.
