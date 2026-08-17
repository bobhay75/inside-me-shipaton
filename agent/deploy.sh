#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:?Usage: bash deploy.sh PROJECT_ID [REGION] [SERVICE]}"
REGION="${2:-us-central1}"
SERVICE="${3:-me-u-agent}"
RUNTIME_ACCOUNT="${4:-me-u-agent-runtime}"
RUNTIME_EMAIL="${RUNTIME_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"

command -v gcloud >/dev/null || { echo "gcloud CLI is required" >&2; exit 1; }

gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com firestore.googleapis.com

if ! gcloud iam service-accounts describe "$RUNTIME_EMAIL" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$RUNTIME_ACCOUNT" \
    --display-name="Me+U Cloud Run runtime"
fi

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RUNTIME_EMAIL" \
  --role="roles/aiplatform.user" \
  --condition=None >/dev/null

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RUNTIME_EMAIL" \
  --role="roles/datastore.user" \
  --condition=None >/dev/null

gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --service-account "$RUNTIME_EMAIL" \
  --clear-secrets \
  --set-env-vars "GEMINI_MODEL=gemini-3.5-flash,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=global"

echo
echo "Cloud Run deployed. Copy the service URL, append /reflect, and set it as EXPO_PUBLIC_REFLECTION_API_URL in the mobile app .env file."
