# Me+U — Competitive Master Build

## One-line pitch

Me+U is a local-first reflection agent that helps a person turn an emotionally charged moment into a calmer, more deliberate next action without pretending to diagnose them or read another person's mind.

## Signature experience

**Inner Mirror:** write one honest entry, then separate facts, interpretation, feeling, need, ownership, controllable choice, one difficult question, and one memorable anchor.

The supporting Me×2 principle is:

> I can work on me. You can work on you.

## Master demo path

1. Enter a realistic conflict or emotionally charged moment.
2. Show the pause/breathing step.
3. Separate what is known from what the mind may be adding.
4. Complete Me-for-me / U-for-you ownership prompts.
5. Reframe with three good things or gratitudes.
6. Choose Pause, Talk, Boundary, or Let go.
7. Generate the reflection locally or through the Gemini-backed cloud agent.
8. Save the result and show Journal/Insights.
9. Show the Cloud Run architecture and explain that raw vent text is not intentionally persisted by the server.

## What is real in this repository

- Expo/React Native mobile application.
- Local journal persistence with AsyncStorage.
- Offline/local reflection fallback.
- Inner Mirror and Me×2 guided reflection logic.
- Five-minute pause/breathing timer.
- Journal and Insights flows.
- Deterministic direct-harm-language safety guard.
- Optional Gemini 3.5 Flash agent using the Google Gen AI SDK.
- Cloud Run deployment path with keyless Google Cloud authentication.
- Optional Firestore pseudonymous derived-pattern memory.
- CI for the mobile TypeScript project and agent smoke tests.

## Safety boundary

Me+U is a reflection and communication tool, not medical, emergency, legal, or crisis care. It should not diagnose, claim to know another person's thoughts, or make high-stakes decisions for the user. Direct harm language bypasses normal reflection and is handled by the deterministic urgent-risk guard.

## Competitive differentiation

The product is not a generic chatbot. The useful unit is a structured reset with a beginning, middle, and end. Cloud AI is optional; the experience remains useful offline. The agent augments a deterministic, privacy-conscious workflow instead of replacing it.

## Best initial customer

A person who is likely to text, argue, withdraw, or make a decision while emotionally activated and wants a private tool that helps them sort the moment before acting.

## Productization path

1. Preserve local-first journaling as the default.
2. Add authenticated encrypted sync only as an opt-in feature.
3. Use cloud memory only for short derived patterns, not raw journals by default.
4. Add voice rehearsal and relationship-specific journeys.
5. Add export/share controls that keep the user in charge of disclosure.
6. Harden abuse controls, retention policy, authentication, and privacy disclosures before broad public launch.

## Master-build standard

A release is considered competition-ready when:

- mobile typecheck passes;
- agent checks and smoke tests pass;
- the complete reset works without cloud connectivity;
- the cloud path fails safely back to local reflection;
- no Gemini key or service-account credential is committed;
- direct-harm-language handling is verified;
- README, safety documentation, architecture, and this file match the behavior actually present in the code.

## Historical contest note

The repository originated as a 2026 hackathon build. Expired contest-credit requests, submission deadlines, and one-time Devpost tasks are historical artifacts, not blockers for the current product master. Current work should prioritize reproducible validation, deployability, safety, and a clean judge/customer demo.