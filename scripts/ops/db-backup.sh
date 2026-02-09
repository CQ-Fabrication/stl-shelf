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

checksum_write() {
  local file_path="$1"
  local output_path="$2"

  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file_path" >"$output_path"
    return 0
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file_path" >"$output_path"
    return 0
  fi

  die "Missing checksum utility: sha256sum or shasum"
}

on_error() {
  local exit_code="$1"
  local line_no="$2"
  send_alert "DB backup job failed (exit=${exit_code}, line=${line_no}, host=$(hostname))"
}

cleanup() {
  if [[ "${BACKUP_KEEP_LOCAL:-false}" == "true" ]]; then
    return 0
  fi
  if [[ -n "${WORK_DIR:-}" && -d "${WORK_DIR:-}" ]]; then
    rm -rf "$WORK_DIR"
  fi
}

trap 'on_error $? $LINENO' ERR
trap cleanup EXIT

require_cmd pg_dump
require_cmd psql
require_cmd zstd
require_cmd age
require_cmd aws
require_env DATABASE_URL
require_env BACKUP_S3_ENDPOINT
require_env BACKUP_S3_REGION
require_env BACKUP_S3_BUCKET
require_env BACKUP_S3_ACCESS_KEY
require_env BACKUP_S3_SECRET_KEY
require_env BACKUP_AGE_PUBLIC_KEY

export AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_KEY"
export AWS_EC2_METADATA_DISABLED=true

if [[ -n "${BACKUP_S3_SESSION_TOKEN:-}" ]]; then
  export AWS_SESSION_TOKEN="$BACKUP_S3_SESSION_TOKEN"
fi

APP_NAME="${BACKUP_APP_NAME:-stlshelf}"
ENV_NAME="${BACKUP_ENV:-prod}"
S3_ROOT_PREFIX="${BACKUP_S3_PREFIX:-postgres}"
S3_SSE_ALGORITHM="${BACKUP_S3_SSE_ALGORITHM:-AES256}"
LOCAL_TMP_ROOT="${BACKUP_LOCAL_DIR:-/tmp/stl-shelf-backups}"

TIMESTAMP_UTC="$(date -u +"%Y%m%dT%H%M%SZ")"
DATE_PATH_UTC="$(date -u +"%Y/%m/%d")"
S3_OBJECT_PREFIX="${S3_ROOT_PREFIX%/}/${ENV_NAME}/${DATE_PATH_UTC}"

mkdir -p "$LOCAL_TMP_ROOT"
WORK_DIR="$(mktemp -d "$LOCAL_TMP_ROOT/run.${TIMESTAMP_UTC}.XXXXXX")"

BASENAME="${APP_NAME}_${ENV_NAME}_${TIMESTAMP_UTC}.dump"
DUMP_FILE="${WORK_DIR}/${BASENAME}"
COMPRESSED_FILE="${DUMP_FILE}.zst"
ENCRYPTED_FILE="${COMPRESSED_FILE}.age"
CHECKSUM_FILE="${ENCRYPTED_FILE}.sha256"
METADATA_FILE="${ENCRYPTED_FILE}.json"
RECIPIENT_FILE="${WORK_DIR}/age.recipient.txt"

log "Backup started"

DB_NAME="$(psql "$DATABASE_URL" -tAc "select current_database();" | tr -d '[:space:]')"
DB_VERSION="$(psql "$DATABASE_URL" -tAc "show server_version;" | tr -d '[:space:]')"

log "Running pg_dump (db=${DB_NAME}, format=custom)"
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$DUMP_FILE"

log "Compressing dump with zstd"
zstd -q -T0 --force "$DUMP_FILE" -o "$COMPRESSED_FILE"

log "Encrypting compressed dump with age"
printf "%s\n" "$BACKUP_AGE_PUBLIC_KEY" >"$RECIPIENT_FILE"
chmod 600 "$RECIPIENT_FILE"
age --encrypt --recipient-file "$RECIPIENT_FILE" --output "$ENCRYPTED_FILE" "$COMPRESSED_FILE"

log "Generating SHA256 checksum"
(
  cd "$WORK_DIR"
  checksum_write "$(basename "$ENCRYPTED_FILE")" "$(basename "$CHECKSUM_FILE")"
)
CHECKSUM_VALUE="$(awk '{print $1}' "$CHECKSUM_FILE")"

DUMP_SIZE_BYTES="$(wc -c <"$DUMP_FILE" | tr -d " ")"
ENCRYPTED_SIZE_BYTES="$(wc -c <"$ENCRYPTED_FILE" | tr -d " ")"

cat >"$METADATA_FILE" <<EOF
{
  "app": "${APP_NAME}",
  "environment": "${ENV_NAME}",
  "timestamp_utc": "${TIMESTAMP_UTC}",
  "db_name": "${DB_NAME}",
  "db_version": "${DB_VERSION}",
  "object_prefix": "${S3_OBJECT_PREFIX}",
  "backup_file": "$(basename "$ENCRYPTED_FILE")",
  "checksum_file": "$(basename "$CHECKSUM_FILE")",
  "checksum_sha256": "${CHECKSUM_VALUE}",
  "dump_size_bytes": ${DUMP_SIZE_BYTES},
  "encrypted_size_bytes": ${ENCRYPTED_SIZE_BYTES},
  "status": "success"
}
EOF

upload_object() {
  local source_path="$1"
  local destination_path="$2"
  local target="s3://${BACKUP_S3_BUCKET}/${destination_path}"

  if [[ -n "$S3_SSE_ALGORITHM" ]]; then
    aws --endpoint-url "$BACKUP_S3_ENDPOINT" --region "$BACKUP_S3_REGION" \
      s3 cp "$source_path" "$target" --sse "$S3_SSE_ALGORITHM" >/dev/null
  else
    aws --endpoint-url "$BACKUP_S3_ENDPOINT" --region "$BACKUP_S3_REGION" \
      s3 cp "$source_path" "$target" >/dev/null
  fi
}

log "Uploading encrypted backup to s3://${BACKUP_S3_BUCKET}/${S3_OBJECT_PREFIX}/"
upload_object "$ENCRYPTED_FILE" "${S3_OBJECT_PREFIX}/$(basename "$ENCRYPTED_FILE")"
upload_object "$CHECKSUM_FILE" "${S3_OBJECT_PREFIX}/$(basename "$CHECKSUM_FILE")"
upload_object "$METADATA_FILE" "${S3_OBJECT_PREFIX}/$(basename "$METADATA_FILE")"

log "Backup completed: file=$(basename "$ENCRYPTED_FILE") checksum=${CHECKSUM_VALUE}"
