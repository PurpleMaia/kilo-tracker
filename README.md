# KILO Tracker

A React Native mobile app built with **Expo** for recording daily KILO observations — a Hawaiian-inspired holistic approach to environmental and community observation. Users record observations through structured questions, voice transcription, and photos.

## Features

- **Daily KILO Observations** - Multi-step voice-first entry wizard
- **Voice-to-Text** - Speech recognition for hands-free KILO entry
- **Photo Capture** - Camera/gallery support for attaching photos
- **Multi-Tenant** - Organizations with role-based access (admin/worker)
- **Secure Auth** - Token-based sessions stored in SecureStore + Google OAuth

## Prerequisites

- Node.js v20+
- pnpm
- [Expo Go](https://expo.dev/go) on your iOS or Android device (for development)
- [EAS CLI](https://docs.expo.dev/build/setup/) for builds (`npm install -g eas-cli`)
- Apple Developer Account with Purple Maiʻa Foundation Team
- EAS Account
- Admin Privileges to Team

## Quick Start

```bash
pnpm install
npx expo start
```

Scan the QR code with Expo Go on your phone.

### Environment Variables

Create a `.env` file at the repo root:

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL (e.g. `https://your-backend.com`) |
| `IDENTIFIER` | App bundle identifier (e.g. `com.yourorg.kilotracker`) |

## Build Commands

This builds the application for iOS and submits to TestFlight

```bash
eas build --platform ios --local --auto-submit
```

1. Copy the `.ipa` file path generated in this project root
2. Select the `Provide a local binary file` option
2. Paste into the prompt
3. When done, put that file into the `build` folder

## Project Structure

```
kilo-tracker/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Login & register screens
│   ├── (protected)/        # Authenticated screens
│   │   ├── index.tsx       # Dashboard
│   │   ├── profile.tsx     # Edit profile
│   │   └── kilo/           # KILO entry wizard + edit
│   ├── _layout.tsx         # Root layout
│   └── index.tsx           # Entry redirect
├── src/
│   ├── components/         # React Native components
│   ├── contexts/           # AuthContext (SecureStore-based)
│   ├── lib/                # apiFetch helper with token auth
│   ├── shared/             # Types & schemas copied from backend (see below)
│   └── types/              # App-level type re-exports
├── assets/                 # Icons, splash screen, images
├── app.config.ts           # Expo config
├── eas.json                # EAS Build profiles
├── tailwind.config.js      # NativeWind config
└── package.json
```

### `src/shared/` — Backend Type Mirror

The `src/shared/` directory contains **types, Zod schemas, and utilities copied from the separate backend repository** to ensure type correctness on both sides. These files are not generated — they are manually kept in sync with the backend.

## Technology Stack

- **Framework:** [Expo](https://expo.dev) SDK 54 + [Expo Router](https://expo.github.io/router)
- **Language:** TypeScript
- **Styling:** [NativeWind](https://www.nativewind.dev) v4 (Tailwind CSS for React Native)
- **Icons:** `@expo/vector-icons` (Ionicons) + `lucide-react-native`
- **Auth:** Token-based sessions via `expo-secure-store`
- **Voice:** `expo-speech-recognition`
- **Camera:** `expo-image-picker`
- **Validation:** Zod
- **Package Manager:** pnpm
