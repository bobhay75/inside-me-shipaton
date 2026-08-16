# Me+U Reflection Agent

This folder contains the server-side agent used by the Me+U mobile app for the 2026 All Things Agentic Hackathon.

## Required Google stack

- Gemini 3.5 Flash (`gemini-3.5-flash`)
- Google Gen AI SDK (`@google/genai`)
- Google Cloud Run
- Optional Cloud Firestore pseudonymous memory

The mobile app remains useful without this service. When `EXPO_PUBLIC_REFLECTION_API_URL` is configured, completed resets are sent to this agent for a deeper reflection. The client generates a random device memory ID so the cloud service can recall recent pattern summaries without requiring a name or email address.

## Local run

```bash
cd agent
npm install
export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
npm start
```

Test it:

```bash
curl http://localhost:8080/health
curl -X POST http://localhost:8080/reflect \
  -H 'Content-Type: application/json' \
  -d '{
    "text":"I got defensive when the conversation changed.",
    "mood":2,
    "involvesPerson":true,
    "myPart":"I raised my voice instead of asking a question.",
    "theirSide":"They may have thought I was ignoring them.",
    "gratitudes":["They showed up","They were honest","They care about the outcome"],
    "responseChoice":"talk",
    "nextMove":"Wait until I am calm and ask what they meant.",
    "memoryId":"meu_demo_123456"
  }'
```

## Cloud Run deployment

### 1. Select the Google Cloud project

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

### 3. Store the Gemini API key in Secret Manager

For a new secret:

```bash
printf '%s' "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
```

If the secret already exists:

```bash
printf '%s' "$GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
```

Grant the Cloud Run runtime service account permission to access that secret if your project does not already allow it.

### 4. Optional: create Firestore memory

Create a Firestore database in the Google Cloud/Firebase console. The agent still works if Firestore is unavailable; it simply runs without cross-session cloud memory.

### 5. Deploy

From this `agent` directory:

```bash
bash deploy.sh YOUR_PROJECT_ID us-central1 me-u-agent
```

Or deploy directly:

```bash
gcloud run deploy me-u-agent \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_MODEL=gemini-3.5-flash \
  --update-secrets GEMINI_API_KEY=gemini-api-key:latest
```

Cloud Run returns a service URL such as `https://me-u-agent-xxxxx-uc.a.run.app`.

Set the mobile environment variable to the reflection endpoint:

```bash
EXPO_PUBLIC_REFLECTION_API_URL=https://YOUR_CLOUD_RUN_URL/reflect
```

Then rebuild/restart the Expo app.

## Memory design

Firestore stores only a short derived pattern, mood number, chosen response category, and the user's written next move under a random device ID. The raw vent text is not intentionally persisted by this server.

For a production release, add authentication, rate limiting, an explicit cloud-memory consent control, retention limits, a delete-memory endpoint, abuse monitoring, and stricter access controls before treating this as production infrastructure.
