# Inside Me — Shipaton 2026 Next Gen MVP

Inside Me is a privacy-first reflection app that combines a fast mood check-in, local journaling, simple pattern review, and optional AI-assisted reflection.

This public repository is the contest edition for RevenueCat Shipaton 2026.

## Current MVP

- 1–5 mood check-in
- Local journal persistence with AsyncStorage
- Journal history
- Basic pattern/insight view
- Local reflection fallback plus optional remote reflection endpoint
- RevenueCat `pro` entitlement integration
- Premium scope built around longer history, exports, and deeper pattern tools

## Stack

- Expo / React Native
- Android-first development build
- AsyncStorage
- `react-native-purchases`
- Optional server-side AI endpoint; provider secret keys never belong in the mobile bundle

## Quick start

```bash
cp .env.example .env
npm install
npx expo install --fix
npx expo-doctor
```

RevenueCat uses native code, so test this app with an Expo development build rather than Expo Go.

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile development --platform android
```

## Fastest RevenueCat setup: Test Store

For the Shipaton demo, start with RevenueCat Test Store. It lets us configure and test the purchase flow before connecting Google Play.

1. Create a RevenueCat project named `Inside Me`.
2. Use the project's Test Store.
3. Create a product such as `inside_me_plus_monthly`.
4. Create an entitlement with identifier `pro`.
5. Attach the product to `pro`.
6. Create a current Offering and add the product as a package.
7. Copy the app-specific public SDK key into local `.env`:

```bash
EXPO_PUBLIC_REVENUECAT_API_KEY=your_public_sdk_key_here
```

Do not commit `.env` or secret provider keys.

## Android identity

The Expo Android package identifier is:

`com.bobsome1.insideme`

We can connect Google Play later when we need a real store release. The Test Store is the faster path for the contest build and demo.

## Optional AI endpoint

Set `EXPO_PUBLIC_REFLECTION_API_URL` to an HTTPS endpoint that accepts:

```json
{"text":"...","mood":3}
```

and returns:

```json
{"reflection":"..."}
```

If the endpoint is missing or unavailable, Inside Me uses its local reflection fallback.

## Product principle

The free tier keeps check-ins, private journaling, and basic reflection useful. Plus adds depth and convenience: longer history, personal export, richer pattern tools, and customization.

## Devpost assets in this repo

- `DEVPOST_DRAFT.md` — submission copy
- `SUBMISSION_CHECKLIST.md` — remaining contest work
- `SAFETY_AND_PRIVACY.md` — prototype privacy boundaries
- `LICENSE` — MIT open-source license

## Demo sequence

1. Open Today.
2. Start a check-in.
3. Choose a mood and write a short entry.
4. Save and show the reflection.
5. Open Journal to show persistence.
6. Open Insights to show the pattern summary.
7. Open Plus to show the RevenueCat entitlement/offering state.

Keep the final Devpost demo tight and focused on the working product loop.
