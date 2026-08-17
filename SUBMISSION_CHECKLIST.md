# Me+U — All Things Agentic Completion Checklist

## Product and code

- [x] Rebrand the app as **Me+U — The Reflection Agent**.
- [x] Build the full guided reset: vent → pause → sort control → reframe → choose → reflect.
- [x] Add the built-in five-minute breathing timer.
- [x] Add **Me for me / U for you** ownership and perspective prompts.
- [x] Add the three-good-things / gratitude reframe.
- [x] Add Pause / Talk / Boundary / Let go response choices.
- [x] Keep full journal entries local with AsyncStorage.
- [x] Keep an offline reflection fallback so the app remains useful without cloud access.
- [x] Add a real Plus journal export action behind the RevenueCat `pro` entitlement.
- [x] Add a deterministic direct-harm-language safety guard.

## Mandatory Google hackathon stack

- [x] Use Gemini 3.5 Flash in the server-side agent source.
- [x] Use the Google Gen AI SDK (`@google/genai`).
- [x] Add a deployable Google Cloud Run service.
- [x] Add optional Cloud Firestore pseudonymous pattern memory.
- [x] Keep Gemini credentials server-side.
- [x] Add keyless Vertex AI / Cloud Run deployment instructions.
- [x] Add a reproducible architecture diagram.
- [x] Add local and cloud spin-up instructions for judges.

## Google Cloud deployment

- [ ] Confirm the Google Cloud billing account used by the project is active and valid.
- [ ] Request the hackathon's $150 Google Cloud credits before the credit-request form closes on August 28, 2026 at 12:00 PM PT.
- [x] Use a dedicated Cloud Run runtime service account instead of a Gemini API key.
- [ ] Create Firestore in the contest Google Cloud project if cross-session memory will be demonstrated.
- [ ] Redeploy `agent/` to Cloud Run using `bash deploy.sh bobsome1 us-central1 me-u-agent`.
- [ ] Verify `GET /health` on the deployed Cloud Run service.
- [ ] Verify `POST /reflect` returns a Gemini-backed reflection.
- [ ] Put the deployed `/reflect` URL in `EXPO_PUBLIC_REFLECTION_API_URL`.
- [ ] Rebuild/restart the Expo app and verify the cloud reflection appears in the mobile workflow.
- [ ] Show Cloud Run logs or dashboard activity during the demo video.

## Validation

- [ ] GitHub Actions passes for the mobile TypeScript project and server-side agent.
- [ ] Verify a complete reset survives an app restart.
- [ ] Verify Journal and Insights with several completed resets.
- [ ] Verify offline fallback by running with `EXPO_PUBLIC_REFLECTION_API_URL` blank.
- [ ] Verify cloud reflection with the deployed endpoint enabled.
- [ ] If Firestore memory is enabled, complete multiple resets and verify recent derived pattern memory is used.
- [ ] Verify explicit harm-language input bypasses normal reflection.
- [ ] Verify no Gemini API key or service credential is committed to the repository.
- [x] Pass local mobile typecheck and agent health/validation/safety smoke tests.

## Demo and submission

- [x] Choose **The Collaborative Partner** as the best-fit track in the current draft.
- [x] Prepare final project description in `DEVPOST_DRAFT.md`.
- [x] Prepare judge spin-up instructions in `README.md` and `agent/README.md`.
- [x] Add `docs/ARCHITECTURE.md`.
- [ ] Produce an Android development build or another judge-accessible hosted build.
- [ ] Capture clean screenshots of the five-step reset and Gemini reflection.
- [ ] Record the approximately four-minute demo described in `DEVPOST_DRAFT.md`.
- [ ] Include proof that the backend is running on Google Cloud.
- [ ] Add the hosted/mobile URL, Cloud Run URL, repo URL, and demo-video URL to Devpost.
- [ ] Re-read the live rules before final submission.
- [ ] Submit the final Devpost entry.

## Optional bonus work

- [ ] Publish a public build article or video that explicitly says it was created for the All Things Agentic Hackathon.
- [ ] Post publicly about Me+U with the required hackathon hashtag where applicable.
- [ ] Consider an additional Google AI model only if it improves the product rather than adding technology for its own sake.

## RevenueCat carry-over

RevenueCat is not part of the mandatory Google stack, but the existing integration remains useful for product viability.

- [ ] Configure the RevenueCat Test Store/current offering if it is not already configured.
- [ ] Attach the product to entitlement `pro`.
- [ ] Verify the test purchase activates `pro`.
- [ ] Verify Plus can export the journal after activation.
