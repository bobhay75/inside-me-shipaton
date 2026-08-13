# Inside Me — Shipaton 2026 Next Gen MVP

Inside Me is a privacy-first reflection app for students and everyday users. It helps people record mood, journal privately, notice patterns over time, and receive a short reflection without presenting itself as diagnosis, therapy, or emergency care.

## Why this repository exists

This public repository is the contest edition for RevenueCat Shipaton 2026. The Next Gen Award requires a public open-source repository, working progress, a demo video, and thoughtful use of RevenueCat.

## Current MVP

- 1–5 mood check-in
- Local-device journal persistence with AsyncStorage
- Simple mood-pattern view
- Safe reflection layer with high-risk-language interruption
- Optional remote AI reflection endpoint, with local fallback
- RevenueCat entitlement/offering integration for `pro`
- Premium scope designed around deeper history/exports, not basic emotional support

## Architecture

- Expo SDK 57 / React Native
- Android-first demo build
- AsyncStorage for the hackathon prototype
- `react-native-purchases` for RevenueCat
- Optional server endpoint for AI reflection; secrets never belong in the mobile bundle

## Setup

Requirements: Node.js 22.13+ for Expo SDK 57, npm, an Expo account for EAS Build, and an Android device.

```bash
cp .env.example .env
npm install
npx expo install --fix
npx expo-doctor
```

Create a RevenueCat project and Android app using package id:

`com.bobsome1.insideme`

Create an entitlement named:

`pro`

Create an offering and attach at least one package/product. Put the public RevenueCat Android SDK key in `.env`:

```bash
EXPO_PUBLIC_REVENUECAT_API_KEY=goog_your_public_key_here
```

RevenueCat requires native code, so use an Expo development build instead of Expo Go:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile development --platform android
```

Install the generated APK on the Android phone, then run:

```bash
npm start
```

## Optional AI endpoint

Set `EXPO_PUBLIC_REFLECTION_API_URL` to an HTTPS endpoint that accepts:

```json
{"text":"...","mood":3}
```

and returns:

```json
{"reflection":"..."}
```

Keep provider secrets such as OpenAI or Gemini API keys on the server. If no endpoint is configured or the network fails, the app uses a local non-diagnostic reflection prompt.

## Product principle

The free tier keeps check-ins, private journaling, basic reflections, and safety interruption available. Plus can sell deeper history, exports, richer pattern summaries, and custom reflection paths. The monetization layer should add depth and convenience rather than gate essential support.

## Contest targets

Primary: RevenueCat Shipaton 2026 Next Gen Award.
Secondary positioning: RevenueCat Peace Prize, subject to final eligibility/submission configuration.

## Demo sequence

1. Open Today screen.
2. Start a check-in.
3. Choose mood and write a short entry.
4. Save and show the reflection.
5. Show the Journal entry persisted.
6. Show Insights pattern bars.
7. Open Inside Me Plus and show RevenueCat offering/entitlement state.

Keep the final Devpost video under two minutes.
