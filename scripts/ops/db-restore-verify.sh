#!/usr/bin/env bash
set -euo pipefail

log() {
  printf "[%s] %s\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

send_alert() {
  local message="$1"
  local webhook="${DR_ALERT_WEBHOOK_URL:-${BACKUP_ALERT_WEBHOOK_URL:-}}"

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

hash_file_sha256() {
  local file_path="$1"

  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file_path" | awk '{print $1}'
    return 0
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file_path" | awk '{print $1}'
    return 0
  fi

  die "Missing checksum utility: sha256sum or shasum"
}

verify_checksum_file() {
  local checksum_file_path="$1"
  local encrypted_file_path="$2"

  local expected_hash
  local actual_hash

  expected_hash="$(awk '{print $1}' "$checksum_file_path" | tr -d '[:space:]')"
  [[ -n "$expected_hash" ]] || die "Checksum file is empty: $checksum_file_path"

  actual_hash="$(hash_file_sha256 "$encrypted_file_path" | tr -d '[:space:]')"

  if [[ "$expected_hash" != "$actual_hash" ]]; then
    die "Checksum mismatch: expected=${expected_hash} actual=${actual_hash}"
  fi
}

cleanup() {
  if [[ "${DR_KEEP_LOCAL:-false}" == "true" ]]; then
    return 0
  fi
  if [[ -n "${WORK_DIR:-}" && -d "${WORK_DIR:-}" ]]; then
    rm -rf "$WORK_DIR"
  fi
}

on_error() {
  local exit_code="$1"
  local line_no="$2"
  send_alert "DB restore/verify failed (exit=${exit_code}, line=${line_no}, host=$(hostname))"
}

trap 'on_error $? $LINENO' ERR
trap cleanup EXIT

require_cmd aws
require_cmd age
require_cmd zstd
require_cmd pg_restore
require_cmd psql

require_env BACKUP_S3_ENDPOINT
require_env BACKUP_S3_REGION
require_env BACKUP_S3_BUCKET
require_env BACKUP_S3_ACCESS_KEY
require_env BACKUP_S3_SECRET_KEY
require_env BACKUP_AGE_PRIVATE_KEY
require_env RESTORE_DATABASE_URL

export AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_KEY"
export AWS_EC2_METADATA_DISABLED=true

if [[ -n "${BACKUP_S3_SESSION_TOKEN:-}" ]]; then
  export AWS_SESSION_TOKEN="$BACKUP_S3_SESSION_TOKEN"
fi

ENV_NAME="${BACKUP_ENV:-prod}"
S3_ROOT_PREFIX="${BACKUP_S3_PREFIX:-postgres}"
S3_PREFIX="${S3_ROOT_PREFIX%/}/${ENV_NAME}/"
LOCAL_TMP_ROOT="${DR_LOCAL_DIR:-/tmp/stl-shelf-restore}"

DR_MIN_ORGANIZATIONS="${DR_MIN_ORGANIZATIONS:-1}"
DR_MIN_USERS="${DR_MIN_USERS:-1}"
DR_MIN_MODELS="${DR_MIN_MODELS:-1}"

mkdir -p "$LOCAL_TMP_ROOT"
WORK_DIR="$(mktemp -d "$LOCAL_TMP_ROOT/run.$(date -u +"%Y%m%dT%H%M%SZ").XXXXXX")"

resolve_latest_backup_key() {
  aws --endpoint-url "$BACKUP_S3_ENDPOINT" --region "$BACKUP_S3_REGION" \
    s3api list-objects-v2 \
    --bucket "$BACKUP_S3_BUCKET" \
    --prefix "$S3_PREFIX" \
    --query 'sort_by(Contents[?ends_with(Key, `.dump.zst.age`)], &LastModified)[-1].Key' \
    --output text
}

BACKUP_OBJECT_KEY="${RESTORE_BACKUP_OBJECT_KEY:-}"
if [[ -z "$BACKUP_OBJECT_KEY" ]]; then
  BACKUP_OBJECT_KEY="$(resolve_latest_backup_key)"
fi

if [[ -z "$BACKUP_OBJECT_KEY" || "$BACKUP_OBJECT_KEY" == "None" ]]; then
  die "No backup object found in s3://${BACKUP_S3_BUCKET}/${S3_PREFIX}"
fi

CHECKSUM_OBJECT_KEY="${BACKUP_OBJECT_KEY}.sha256"
METADATA_OBJECT_KEY="${BACKUP_OBJECT_KEY}.json"

ENCRYPTED_FILE="${WORK_DIR}/$(basename "$BACKUP_OBJECT_KEY")"
CHECKSUM_FILE="${WORK_DIR}/$(basename "$CHECKSUM_OBJECT_KEY")"
METADATA_FILE="${WORK_DIR}/$(basename "$METADATA_OBJECT_KEY")"
COMPRESSED_FILE="${WORK_DIR}/restore.dump.zst"
DUMP_FILE="${WORK_DIR}/restore.dump"
AGE_IDENTITY_FILE="${WORK_DIR}/age.identity.txt"

START_EPOCH="$(date -u +%s)"

log "Downloading backup artifacts from S3"
aws --endpoint-url "$BACKUP_S3_ENDPOINT" --region "$BACKUP_S3_REGION" \
  s3 cp "s3://${BACKUP_S3_BUCKET}/${BACKUP_OBJECT_KEY}" "$ENCRYPTED_FILE" >/dev/null
aws --endpoint-url "$BACKUP_S3_ENDPOINT" --region "$BACKUP_S3_REGION" \
  s3 cp "s3://${BACKUP_S3_BUCKET}/${CHECKSUM_OBJECT_KEY}" "$CHECKSUM_FILE" >/dev/null
aws --endpoint-url "$BACKUP_S3_ENDPOINT" --region "$BACKUP_S3_REGION" \
  s3 cp "s3://${BACKUP_S3_BUCKET}/${METADATA_OBJECT_KEY}" "$METADATA_FILE" >/dev/null

log "Verifying checksum"
verify_checksum_file "$CHECKSUM_FILE" "$ENCRYPTED_FILE"

log "Decrypting backup with age"
printf "%s\n" "$BACKUP_AGE_PRIVATE_KEY" >"$AGE_IDENTITY_FILE"
chmod 600 "$AGE_IDENTITY_FILE"
age --decrypt --identity "$AGE_IDENTITY_FILE" --output "$COMPRESSED_FILE" "$ENCRYPTED_FILE"

log "Decompressing dump"
zstd -q -d --force "$COMPRESSED_FILE" -o "$DUMP_FILE"

log "Running pg_restore"
pg_restore --dbname="$RESTORE_DATABASE_URL" --clean --if-exists --no-owner --no-privileges --exit-on-error "$DUMP_FILE"

log "Running SQL sanity checks"
psql "$RESTORE_DATABASE_URL" -tAc "select 1;" | grep -q "1" || die "Database connectivity check failed"

org_table_exists="$(psql "$RESTORE_DATABASE_URL" -tAc "select to_regclass('public.organization') is not null; " | tr -d '[:space:]')"
user_table_exists="$(psql "$RESTORE_DATABASE_URL" -tAc "select to_regclass('public.\"user\"') is not null; " | tr -d '[:space:]')"
models_table_exists="$(psql "$RESTORE_DATABASE_URL" -tAc "select to_regclass('public.models') is not null; " | tr -d '[:space:]')"

[[ "$org_table_exists" == "t" ]] || die "Missing required table: public.organization"
[[ "$user_table_exists" == "t" ]] || die "Missing required table: public.\"user\""
[[ "$models_table_exists" == "t" ]] || die "Missing required table: public.models"

org_count="$(psql "$RESTORE_DATABASE_URL" -tAc "select count(*) from organization;" | tr -d '[:space:]')"
user_count="$(psql "$RESTORE_DATABASE_URL" -tAc "select count(*) from \"user\";" | tr -d '[:space:]')"
model_count="$(psql "$RESTORE_DATABASE_URL" -tAc "select count(*) from models;" | tr -d '[:space:]')"

if (( org_count < DR_MIN_ORGANIZATIONS )); then
  die "Organization count check failed: got=${org_count} expected>=${DR_MIN_ORGANIZATIONS}"
fi
if (( user_count < DR_MIN_USERS )); then
  die "User count check failed: got=${user_count} expected>=${DR_MIN_USERS}"
fi
if (( model_count < DR_MIN_MODELS )); then
  die "Model count check failed: got=${model_count} expected>=${DR_MIN_MODELS}"
fi

if [[ -n "${DR_SMOKE_BASE_URL:-}" ]]; then
  require_cmd curl
  local_base="${DR_SMOKE_BASE_URL%/}"
  log "Running HTTP smoke checks against ${local_base}"
  curl -fsS --max-time 15 "${local_base}/" >/dev/null
  curl -fsS --max-time 15 "${local_base}/login" >/dev/null

  if [[ -n "${DR_SMOKE_DOWNLOAD_URL:-}" ]]; then
    curl -fsSIL --max-time 20 "${DR_SMOKE_DOWNLOAD_URL}" >/dev/null
  fi
fi

END_EPOCH="$(date -u +%s)"
DURATION_SECONDS="$((END_EPOCH - START_EPOCH))"

log "Restore verification completed"
log "backup_object=${BACKUP_OBJECT_KEY}"
log "duration_seconds=${DURATION_SECONDS}"
log "sanity_counts=organization:${org_count},user:${user_count},models:${model_count}"
