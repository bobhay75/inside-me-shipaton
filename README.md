# Me+U — The Reflection Agent

Me+U is a local-first emotional reset and communication app that helps a person move from reaction to deliberate action:

**vent → pause → sort control → reframe → choose the next move → reflect**

The mobile app is built with Expo/React Native. Its optional cloud agent uses **Gemini 3.5 Flash**, the **Google Gen AI SDK**, **Cloud Run**, and optional **Cloud Firestore** pseudonymous memory.

This repository is the working contest build for the 2026 **All Things Agentic Hackathon**, while retaining RevenueCat integration from the earlier Shipaton build.

## Why Me+U

Most tools either let someone vent or tell them what to do. Me+U inserts a structured reset between emotion and action.

The core principle is simple:

> I can work on me. You can work on you.

That means the user can own their reaction, tone, assumptions, choices, and boundaries without pretending they control another person.

## Working mobile flow

1. **Vent:** rate the moment and write what happened without polishing it.
2. **Pause:** use the built-in five-minute breathing timer to interrupt the immediate reaction.
3. **Sort:** identify what is actually yours to own or change and, when another person is involved, consider a possible perspective without declaring it fact.
4. **Reframe:** name three good or grateful things so one bad moment does not become the entire story.
5. **Choose:** select Pause, Talk, Boundary, or Let go, then write one concrete next move.
6. **Reflect:** save locally and receive either the Gemini-backed Me+U reflection or an offline fallback.
7. **Review:** use Journal and Insights to notice patterns across resets.

## Agentic Google stack

The optional `agent/` service makes Me+U a cloud-backed collaborative partner rather than a chat wrapper.

- **Model:** Gemini 3.5 Flash (`gemini-3.5-flash`)
- **Agent framework:** Google Gen AI SDK (`@google/genai`)
- **Google Cloud:** Cloud Run
- **Memory:** optional Cloud Firestore
- **Client:** Expo / React Native
- **Local persistence:** AsyncStorage

The cloud agent receives a structured completed reset, can review recent pseudonymous pattern summaries, generates a grounded reflection plus a future question, and stores only a short derived pattern/mood/response summary when Firestore is available. The raw vent text is not intentionally persisted by the server.

## Repository structure

```text
App.tsx                     # Me+U mobile UI and 5-step reset
src/
  storage.ts                # local journal + pseudonymous memory ID
  types.ts                  # reset/journal data model
  services/
    reflection.ts           # cloud-agent call + offline fallback
    revenuecat.ts           # optional Plus entitlement
agent/
  index.js                  # Gemini 3.5 reflection agent
  package.json              # Google Gen AI SDK + Cloud Run dependencies
  Dockerfile                # deployable container
  deploy.sh                 # source deployment helper
  README.md                 # agent setup/deploy instructions
docs/
  ARCHITECTURE.md           # architecture diagram
```

## Mobile quick start

Requirements: Node.js 22+, npm, Expo tooling, and Android tooling or an EAS development build.

```bash
cp .env.example .env
npm install
npx expo install --fix
npm run typecheck
npx expo-doctor
```

Start the app:

```bash
npm start
```

Because RevenueCat uses native code, test purchases with an Expo development build rather than Expo Go.

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile development --platform android
```

## Run the cloud agent locally

```bash
cd agent
npm install
export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
npm start
```

Health check:

```bash
curl http://localhost:8080/health
```

Then set the mobile app to the local or deployed reflection endpoint:

```bash
EXPO_PUBLIC_REFLECTION_API_URL=http://YOUR_REACHABLE_HOST:8080/reflect
```

The app remains usable when that variable is blank; it falls back to a local reflection engine.

## Deploy to Google Cloud Run

The detailed procedure is in `agent/README.md`. The short path is:

```bash
cd agent
bash deploy.sh YOUR_GOOGLE_CLOUD_PROJECT_ID us-central1 me-u-agent
```

The deployment expects a Secret Manager secret named `gemini-api-key`. When Cloud Run returns a service URL, append `/reflect` and place it in the mobile `.env` file:

```bash
EXPO_PUBLIC_REFLECTION_API_URL=https://YOUR_CLOUD_RUN_SERVICE_URL/reflect
```

Restart/rebuild the mobile app after changing Expo public environment variables.

## Optional Firestore memory

Create a Firestore database in the same Google Cloud project. When available, the agent stores short derived pattern summaries under a random device memory ID. If Firestore is unavailable, the agent still returns Gemini reflections without cross-session cloud memory.

For production, this needs explicit cloud-memory consent, authentication, rate limiting, retention/deletion controls, and a delete-memory endpoint. The hackathon implementation is intentionally narrow.

## RevenueCat / Me+U Plus

RevenueCat remains integrated through the `pro` entitlement. The free tier contains the complete useful reset loop. Plus currently unlocks a real journal export action, with deeper pattern summaries and custom reflection paths reserved for later expansion.

Configure:

```bash
EXPO_PUBLIC_REVENUECAT_API_KEY=your_public_sdk_key_here
```

Never commit `.env`, Gemini keys, store secrets, or service-account credentials.

## Safety and privacy

- Journal entries persist locally on the device with AsyncStorage.
- Cloud reflection is only used when `EXPO_PUBLIC_REFLECTION_API_URL` is configured.
- A random device memory ID is used instead of a name/email for optional cloud memory.
- The server is instructed not to diagnose or pretend to know another person's thoughts.
- A deterministic urgent-risk guard bypasses normal reflection when common direct harm language is detected.
- Me+U is not medical, emergency, legal, or crisis care.

See `SAFETY_AND_PRIVACY.md` for prototype boundaries.

## CI

GitHub Actions checks the Expo TypeScript project and the server-side agent on every pull request and main-branch push.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Suggested hackathon track

**The Collaborative Partner** — Me+U guides a person through a complex emotional/communication challenge, asks structured questions, uses pseudonymous memory when enabled, and turns a raw emotional moment into a concrete next action.

## Demo sequence

1. Open Me+U and explain the problem: people often react before they have separated emotion from action.
2. Enter a realistic conflict in **Reset**.
3. Show the five-minute pause timer.
4. Complete **Me for me / U for you**.
5. Enter three good things/gratitudes.
6. Choose a response and next move.
7. Save and show the Gemini-backed reflection.
8. Open Journal and Insights.
9. Show the Cloud Run service/dashboard or logs proving the backend is running on Google Cloud.
10. Briefly show the architecture diagram and public GitHub repository.

## Submission files

- `DEVPOST_DRAFT.md` — current All Things Agentic submission copy
- `SUBMISSION_CHECKLIST.md` — remaining deploy/demo/submission steps
- `docs/ARCHITECTURE.md` — judge-facing system diagram
- `SAFETY_AND_PRIVACY.md` — prototype privacy and safety boundaries
- `LICENSE` — MIT open-source license
