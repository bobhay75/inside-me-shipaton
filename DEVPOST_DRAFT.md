# Devpost Draft — Me+U: The Reflection Agent

## Track

**The Collaborative Partner**

## One-line pitch

Me+U is a local-first reflection agent that helps people interrupt emotional reactions, separate what they can control from what belongs to someone else, and choose a concrete next move with Gemini-backed pseudonymous memory.

## Inspiration

A lot of conflict becomes destructive before anyone has had time to decide what they actually want to say or do. People bottle things up, react from anger or hurt, argue about what the other person should change, and then deal with the consequences of a moment that moved faster than their judgment.

Me+U was built around a simple rule: **I can work on me. You can work on you.**

The product is not designed to suppress emotion. It gives emotion somewhere to go, then creates enough structure and time for the user to choose what happens next.

## What it does

Me+U guides a user through a five-step reset:

1. **Vent** — name what happened and rate the current mood.
2. **Pause** — use a built-in five-minute breathing timer to interrupt the immediate reaction.
3. **Sort control** — identify what belongs to the user and, when another person is involved, consider a possible perspective without pretending to know their mind.
4. **Reframe** — find three good or grateful things so one painful moment does not become the entire story.
5. **Choose** — select Pause, Talk, Boundary, or Let go and write one concrete next move.

The reset is saved locally. When the cloud agent is configured, the completed structured reset is sent to the Me+U Reflection Agent on Cloud Run. The agent can use recent pseudonymous pattern summaries as tentative context, asks Gemini 3.5 Flash for a concise reflection and future question, then optionally stores a short derived pattern in Firestore.

If the cloud service is unavailable, Me+U still works with an offline fallback reflection.

## Why this is agentic

Me+U is deliberately not a blank chat box. The user completes a structured workflow and the agent performs the heavy interpretation step after the user has slowed down and separated the problem into useful parts.

The cloud agent:

- receives structured state from the full reset rather than a single chat prompt;
- retrieves recent pseudonymous pattern memory when available;
- treats that memory as tentative context rather than identity truth;
- uses Gemini to synthesize the reset into a grounded reflection and a future question;
- writes a short derived memory for later resets;
- falls back safely when the cloud layer is unavailable.

## Google technologies used

- **Gemini 3.5 Flash** (`gemini-3.5-flash`) for the cloud reflection step.
- **Google Gen AI SDK** (`@google/genai`) as the agent framework.
- **Vertex AI** as the authenticated Gemini runtime.
- **Google Cloud Run** to host the Me+U Reflection Agent.
- **Cloud Firestore** for optional pseudonymous cross-session pattern memory.
- **Cloud Run service identity** for keyless server-to-Vertex authentication.

## Other technologies

- Expo / React Native
- TypeScript
- AsyncStorage for the full local journal
- RevenueCat for the optional `pro` entitlement and journal export
- GitHub Actions for automated validation

## Privacy and safety choices

The full journal stays on the device with AsyncStorage. Cloud memory uses a random device ID rather than a name/email and intentionally stores only a short derived pattern, mood, chosen response, and written next move. The server does not intentionally persist the raw vent text.

A deterministic direct-harm-language guard bypasses normal reflection for common explicit self-harm/harm language. The Gemini instruction also prohibits diagnosis, pretending to know another person's thoughts, and treating journal content as instructions that override the agent role.

Me+U is a reflection and communication tool, not medical, emergency, legal, or crisis care.

## How I built it

The first version was a small private mood journal. The product became much stronger when I stopped treating reflection as a single AI response and designed a sequence that does useful work before the model is ever called.

The mobile workflow is local-first so the app remains useful without a network connection or paid model call. The Cloud Run service is a separate boundary so Gemini credentials never ship in the mobile bundle. Firestore memory is deliberately small and pseudonymous rather than copying the entire private journal into the cloud.

## What I learned

The most useful agent is not always the one that talks the most. Me+U works better when the software first changes the shape of the problem: slow down, identify control, consider another perspective, reframe, then choose an action. Gemini is used after that structure exists.

I also learned that memory is a product and privacy decision, not just a technical feature. For this prototype, I kept cloud memory narrow and made the complete reset remain local.

## What's next

- deploy and verify the Cloud Run backend with Gemini 3.5 Flash;
- enable Firestore memory in the contest Google Cloud project;
- redeploy and verify the keyless Vertex AI Cloud Run revision;
- add authenticated user-controlled sync;
- expand long-term pattern analysis without turning tentative patterns into diagnoses;
- add voice-first resets and accessibility improvements;
- test the communication workflow with real users;
- explore additional Google models only where they create real product value.

## Architecture

See `docs/ARCHITECTURE.md` in the repository for the Mermaid architecture diagram and trust boundaries.

## Spin-up instructions

The root `README.md` contains mobile setup. `agent/README.md` contains local and Cloud Run deployment instructions.

## Demo video outline (~4 minutes)

**0:00–0:35 — Problem and value**  
Show the Me+U home screen. Explain that the goal is to create a decision gap between emotional reaction and action.

**0:35–2:20 — Product demo**  
Enter a realistic conflict, show the five-minute reset, complete Me for me / U for you, enter three good things, choose a response, and save.

**2:20–2:55 — Agent result and memory**  
Show the Gemini-backed reflection, Journal, and Insights. Briefly explain that the app can use a random device memory ID for recent derived patterns without requiring a name/email.

**2:55–3:30 — Google Cloud proof**  
Show the Cloud Run service/dashboard or logs and the deployed service URL. Show Firestore memory if enabled.

**3:30–4:00 — Architecture and close**  
Show the architecture diagram and public GitHub repository. Close with: “Me+U does not try to control the other person. It helps you choose who you are going to be in the moment.”

## Submission fields still needing live values

- Hosted/mobile project URL: **TBD after deploy/build**
- Cloud Run service URL: **TBD after deploy**
- Demo video URL: **TBD after recording**
- Public repository: `bobhay75/inside-me-shipaton`
