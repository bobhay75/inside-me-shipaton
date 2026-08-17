# Me+U Safety and Privacy Notes

## Prototype boundaries

Me+U is a reflection and communication product. It does not present reflections, mood summaries, pattern labels, or next-step prompts as professional conclusions, diagnoses, therapy, legal advice, or emergency care.

## Local data handling

The mobile MVP stores full reset/journal entries locally on the device using AsyncStorage. No analytics SDK is intentionally included in this contest build.

A random device memory ID is also stored locally. It is not derived from a name, email address, phone number, or account identifier.

## Optional cloud reflection

Cloud reflection is disabled when `EXPO_PUBLIC_REFLECTION_API_URL` is blank. When that endpoint is configured, the completed structured reset and random device memory ID are sent to the Me+U Cloud Run service.

The app asks the user to confirm this cloud processing and the possibility of pseudonymous pattern memory before Cloud AI is enabled. Local-only remains the default.

The server uses Gemini through the Google Gen AI SDK. Gemini/provider credentials remain server-side and must never be placed in the mobile bundle.

## Optional Firestore memory

When Firestore is available, the server intentionally stores only a short derived pattern label, mood number, chosen response category, and the user's written next move under the random device memory ID. The server does not intentionally persist the raw vent text.

This is hackathon memory, not a finished production privacy architecture. The prototype includes consent copy, an in-memory request limit, and a delete-memory endpoint. Before a public release, add authentication, durable distributed limits, a documented retention policy, stronger access controls, monitoring, and a full privacy policy.

## Safety behavior

Both the mobile fallback and cloud service contain a deterministic direct-harm-language guard. When common explicit language about imminent self-harm or harming another person is detected, normal reflection is bypassed and the user is directed toward immediate local help and a trusted person nearby.

The Gemini system instruction also prohibits diagnosis, pretending to know another person's thoughts, and treating journal text as instructions that override the agent's role.

## User control

The useful reset loop works without the cloud endpoint. That allows a local-only configuration. Users should be able to understand which features are local, which use cloud processing, and what cloud memory stores before this becomes a production service.

## Monetization

Core resets, local journaling, and basic reflections remain free. RevenueCat Plus currently unlocks personal journal export. Future paid features should add depth or convenience without withholding the core emotional reset loop.
