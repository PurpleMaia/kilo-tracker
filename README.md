# KILO Tracker

A web-based observation and reflection application built on the **Kilo** framework - a Hawaiian-inspired holistic approach to environmental and community observation. Users record daily observations about their environment through structured questions, audio recordings (with speech-to-text), and photos.

## Features

- **Daily KILO Observations** - Multi-step form with configurable questions for structured environmental observations
- **Voice-to-Text** - Audio recording with automatic transcription via OpenAI Whisper API
- **Photo Capture** - In-app camera support for attaching photos to KILO entries
- **Multi-Tenant Support** - Organizations with role-based access (admin, member)
- **Secure Authentication** - Password-based login with argon2 hashing + Google OAuth 2.0 with PKCE
- **Role-Based Dashboards** - Different views for sysadmin, org admin, member, and guest users
- **Survey Module** - Weather observations, activity tracking, and photo uploads
- **Progressive Web App (PWA)** - Installable on iOS, Android, and desktop with offline support
- **React Native Mobile App** - Native iOS/Android app built with Expo (see `mobile/`)

## Prerequisites

Install these tools globally before getting started:

### Node.js (v20+)

**macOS (using Homebrew):**
```bash
brew install node
```

**Windows (using winget):**
```bash
winget install OpenJS.NodeJS.LTS
```

**Linux (using nvm):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 20
```

### pnpm

**All platforms (after Node.js is installed):**
```bash
npm install -g pnpm
```

### golang-migrate

Required for database migrations.

**macOS:**
```bash
brew install golang-migrate
```

**Windows:**
```bash
scoop install migrate
```

**Linux:**
```bash
curl -L https://github.com/golang-migrate/migrate/releases/download/v4.18.1/migrate.linux-amd64.tar.gz | tar xvz
sudo mv migrate /usr/local/bin/migrate
```

### Verify Installation

```bash
node --version    # Should be v20+
pnpm --version    # Should be v8+
migrate -version  # Should show version
```

### Github CLI

Required for github workflows and actions for Continuous Development

**macOS:**
```bash
brew install gh
```

**Windows:**
```bash
scoop install gh
```

**Linux:**
See https://github.com/cli/cli/blob/trunk/docs/install_linux.md

## Quick Start

### 1. Initialize the Project

Run the initialization script to set up your development and production environments:

```bash
pnpm run init
```

This will:
- Set up SSH access to the Dokku host
- Create Dokku applications (dev & prod)
- Set up Postgres databases
- Run database migrations
- Create your admin user account
- Seed test data

**Note:** You'll need the PMF Dokku host address from your PMF Builder admin.

For detailed information about the initialization process, see [scripts/init/README.md](scripts/init/README.md).

### 2. Start Development

Once initialization is complete, start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## Repository Structure

```
.
├── scripts/
│   ├── init/              # Project initialization scripts
│   ├── migrate/           # Database migration scripts
│   └── destroy/           # Cleanup scripts
├── src/
│   ├── app/               # Next.js App Router pages and API routes
│   │   ├── (auth)/        # Auth pages (login, register)
│   │   ├── dashboard/     # Role-based dashboard pages
│   │   ├── kilo/          # KILO entry form page
│   │   └── api/           # API routes (auth, kilo, audio, profile, photo)
│   ├── components/        # Reusable UI components
│   │   ├── ui/            # Shadcn UI primitives
│   │   ├── kilo/          # KILO-specific components
│   │   ├── dashboard/     # Dashboard views by role
│   │   ├── pwa/           # PWA install prompt components
│   │   └── auth/          # Authentication UI
│   ├── db/                # Database layer
│   │   ├── migrations/    # SQL migrations (golang-migrate)
│   │   ├── kysely/        # Kysely client and driver
│   │   └── types.ts       # Auto-generated DB types
│   ├── hooks/             # React hooks and context
│   ├── lib/               # Core utilities (auth, errors)
│   ├── tests/             # Unit and E2E tests
│   └── types/             # TypeScript type definitions
├── mobile/                # React Native + Expo mobile app
│   ├── app/               # Expo Router screens
│   │   ├── (auth)/        # Login and register screens
│   │   └── (protected)/   # Authenticated screens
│   │       ├── index.tsx  # Dashboard
│   │       ├── profile.tsx # Edit profile
│   │       └── kilo/      # KILO entry wizard + edit screen
│   ├── src/
│   │   ├── contexts/      # AuthContext (SecureStore session management)
│   │   └── lib/           # apiFetch helper with token auth
│   └── .env.local         # Mobile env (EXPO_PUBLIC_API_URL)
├── public/
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker
│   └── icons/             # PWA icons
├── .env                   # Environment variables (never commit)
└── package.json
```

## Development Workflow

### Local Development

1. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```
2. Make your changes and test locally with `pnpm dev`
3. Create database migrations if needed (`pnpm migrate:create <name>`)
4. Run tests: `pnpm test:unit` (Jest) or `pnpm test:e2e` (Playwright)
5. Commit your changes

### Deploying to Dev

Push your branch to the **dev** environment for testing:

```bash
git push dokku-dev my-branch:master
```

### Deploying to Production

Once changes are validated on dev, push to **production**:

```bash
git push dokku main:master
```

Database migrations run automatically during deployment via the predeploy hook.

### Database Migrations

Create a new migration:
```bash
pnpm migrate:create <migration_name>
```

Run migrations against dev:
```bash
pnpm migrate:up d
```

Run migrations against prod:
```bash
pnpm migrate:up p
```

See [scripts/migrate/README.md](scripts/migrate/README.md) for detailed workflows.

## Technology Stack

### Web (Next.js)
- **Framework:** [Next.js](https://nextjs.org) 16 with App Router
- **Language:** TypeScript
- **Database:** PostgreSQL with [Kysely](https://kysely.dev) query builder
- **UI Components:** [Shadcn UI](https://ui.shadcn.com) + [Radix UI](https://www.radix-ui.com)
- **Styling:** Tailwind CSS 4
- **Authentication:** Custom auth (argon2) + Google OAuth via [Arctic](https://arcticjs.dev)
- **Audio Transcription:** OpenAI Whisper API (`whisper-1`)
- **Validation:** Zod
- **Testing:** Jest (unit) + Playwright (E2E)
- **Migrations:** [golang-migrate](https://github.com/golang-migrate/migrate)
- **Deployment:** [Dokku](https://dokku.com) (PaaS)
- **Package Manager:** pnpm

### Mobile (React Native + Expo)
- **Framework:** [Expo](https://expo.dev) SDK 54 with [Expo Router](https://expo.github.io/router)
- **Language:** TypeScript
- **Styling:** [NativeWind](https://www.nativewind.dev) v4 (Tailwind CSS for React Native)
- **Icons:** `@expo/vector-icons` (Ionicons) + `lucide-react-native`
- **Authentication:** Token-based sessions stored in `expo-secure-store`
- **Audio Recording:** `expo-av` (WAV format for Whisper compatibility)
- **Camera / Photo:** `expo-image-picker`
- **API:** Shared Next.js backend via `apiFetch` with `x-session-token` header auth
- **Package Manager:** npm

## Environment Variables

After initialization, your `.env` file will contain:

| Variable | Description |
|----------|-------------|
| `PMF_DOKKU_HOST` | Dokku host address |
| `DATABASE_URL` | Active database connection |
| `DEV_URL` / `PROD_URL` | Environment-specific DB URLs |
| `PASSWORD_HASH_SECRET` | Pepper for password hashing |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth credentials |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |
| `NEXT_PUBLIC_BASE_URL` | Application base URL |
| `OPENAI_API_KEY` | OpenAI API key for Whisper audio transcription |
| `SPEACHES_BASE_URL` | (Legacy) Speaches audio transcription endpoint |
| `SPEACHES_API_KEY` | (Legacy) Speaches API authentication |
| `SPEACHES_STT_MODEL` | (Legacy) Speech-to-text model name |

**Never commit the `.env` or `.env.local` file to version control.**

### Example `.env.local` (Next.js server)

```bash
# Database
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/kilo_tracker

# Audio transcription (OpenAI Whisper)
OPENAI_API_KEY=sk-...your-openai-key-here...

# Speech-to-text legacy (Speaches — optional, leave blank if using OpenAI)
SPEACHES_BASE_URL=
SPEACHES_API_KEY=
SPEACHES_STT_MODEL=Systran/faster-whisper-large-v3

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Mobile Environment Variables

The mobile app uses a separate `mobile/.env.local` file:

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | URL of the running Next.js backend (e.g. `http://192.168.1.x:3000`) |

## Mobile Development

### Prerequisites

- [Expo Go](https://expo.dev/go) installed on your iOS or Android device
- Both your Mac and phone on the same Wi-Fi network

### Running the Mobile App

1. Start the Next.js backend in HTTP mode (required for Expo Go on a physical device):
   ```bash
   pnpm dev:mobile
   ```

2. In a separate terminal, start Expo:
   ```bash
   cd mobile && npx expo start
   ```

3. Set your machine's local IP in `mobile/.env.local`:
   ```
   EXPO_PUBLIC_API_URL=http://<your-local-ip>:3000
   ```

4. Scan the QR code with Expo Go on your phone.

### Mobile App Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/(auth)/login` | Sign in with username/email + password |
| Register | `/(auth)/register` | Create a new account |
| Dashboard | `/(protected)/` | Profile summary, KILO entries list |
| Edit Profile | `/(protected)/profile` | Update personal profile fields |
| New KILO | `/(protected)/kilo/` | 3-step voice-first entry wizard |
| Edit KILO | `/(protected)/kilo/edit` | Edit an existing KILO entry |

## Need Help?

- **Initialization issues?** See [scripts/init/README.md](scripts/init/README.md)
- **Migration problems?** See [scripts/migrate/README.md](scripts/migrate/README.md)
- **Want to start over?** See [scripts/destroy/README.md](scripts/destroy/README.md)
- **Next.js questions?** Check the [Next.js Documentation](https://nextjs.org/docs)
- **Kysely questions?** Check the [Kysely Documentation](https://kysely.dev)
