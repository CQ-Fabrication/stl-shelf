#!/usr/bin/env bash
set -euo pipefail

log() {
  printf "[%s] %s\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

send_alert() {
  local message="$1"
  local webhook="${BACKUP_ALERT_WEBHOOK_URL:-}"

  if [[ -z "$webhook" ]]; then
    return 0
  fi

  if ! command -v curl >/dev/null 2>&1; then
    log "WARN: curl not found, cannot send alert webhook"
    return 0
  fi

  local payload
  payload=$(printf '{"text":"%s"}' "$(printf "%s" "$message" | sed 's/"/\\"/g')")
  curl -fsS -X POST "$webhook" -H "Content-Type: application/json" -d "$payload" >/dev/null || true
}

die() {
  local message="$1"
  send_alert "$message"
  log "ERROR: $message"
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

require_env() {
  local name="$1"
  [[ -n "${!name:-}" ]] || die "Missing required environment variable: $name"
}

require_cmd aws
require_cmd date

require_env BACKUP_S3_ENDPOINT
require_env BACKUP_S3_REGION
require_env BACKUP_S3_BUCKET
require_env BACKUP_S3_ACCESS_KEY
require_env BACKUP_S3_SECRET_KEY

if ! date -u -d "1970-01-01T00:00:00Z" +%s >/dev/null 2>&1; then
  die "GNU date is required (date -d support missing)"
fi

export AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_KEY"
export AWS_EC2_METADATA_DISABLED=true

if [[ -n "${BACKUP_S3_SESSION_TOKEN:-}" ]]; then
  export AWS_SESSION_TOKEN="$BACKUP_S3_SESSION_TOKEN"
fi

ENV_NAME="${BACKUP_ENV:-prod}"
S3_ROOT_PREFIX="${BACKUP_S3_PREFIX:-postgres}"
S3_PREFIX="${S3_ROOT_PREFIX%/}/${ENV_NAME}/"
STALE_MAX_HOURS="${BACKUP_STALE_MAX_HOURS:-13}"
STALE_MAX_SECONDS="$((STALE_MAX_HOURS * 3600))"

read -r latest_key latest_modified < <(
  aws --endpoint-url "$BACKUP_S3_ENDPOINT" --region "$BACKUP_S3_REGION" \
    s3api list-objects-v2 \
    --bucket "$BACKUP_S3_BUCKET" \
    --prefix "$S3_PREFIX" \
    --query 'sort_by(Contents[?ends_with(Key, `.dump.zst.age.json`)], &LastModified)[-1].[Key,LastModified]' \
    --output text
)

if [[ -z "${latest_key:-}" || "$latest_key" == "None" || -z "${latest_modified:-}" || "$latest_modified" == "None" ]]; then
  die "No backup metadata found in s3://${BACKUP_S3_BUCKET}/${S3_PREFIX}"
fi

last_epoch="$(date -u -d "$latest_modified" +%s)"
now_epoch="$(date -u +%s)"
age_seconds="$((now_epoch - last_epoch))"

if (( age_seconds > STALE_MAX_SECONDS )); then
  die "Stale backup detected: latest=${latest_key} age_seconds=${age_seconds} threshold_seconds=${STALE_MAX_SECONDS}"
fi

log "Backup freshness OK: latest=${latest_key} age_seconds=${age_seconds} threshold_seconds=${STALE_MAX_SECONDS}"
