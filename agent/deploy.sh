#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:?Usage: bash deploy.sh PROJECT_ID [REGION] [SERVICE]}"
REGION="${2:-us-central1}"
SERVICE="${3:-me-u-agent}"

command -v gcloud >/dev/null || { echo "gcloud CLI is required" >&2; exit 1; }

gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com firestore.googleapis.com

gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_MODEL=gemini-3.5-flash,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=global"

echo
echo "Cloud Run deployed. Copy the service URL, append /reflect, and set it as EXPO_PUBLIC_REFLECTION_API_URL in the mobile app .env file."
