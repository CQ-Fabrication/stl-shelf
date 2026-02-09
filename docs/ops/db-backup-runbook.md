# DB Backup Runbook (Coolify + Hetzner S3)

## 1. Prerequisites

- PostgreSQL reachable via `DATABASE_URL`.
- Dedicated Hetzner Object Storage bucket created for production backups.
- S3 credentials ready:
- backup writer: `PutObject/GetObject/ListBucket/DeleteObject` limited to backup prefix.
- restore reader: `GetObject/ListBucket` only.
- `age`, `zstd`, `pg_dump`, `psql`, `aws` CLI available in runtime where jobs execute.

## 2. Generate `age` Key Pair

Run once in a secure shell:

```bash
age-keygen -o age-backup-key.txt
```

- Public key: value after `# public key:`
- Private key: full `AGE-SECRET-KEY-...` line(s)

Store keys in Coolify secrets:

- `BACKUP_AGE_PUBLIC_KEY` in backup job context.
- `BACKUP_AGE_PRIVATE_KEY` only in restore/drill job context.

## 3. Configure Bucket Retention

- Configure lifecycle expiration for `postgres/prod/` prefix with 7-day retention.
- This is enforced at bucket level, not in scripts.

## 4. Coolify Job Setup

Set these environment variables in the scheduled job:

```bash
DATABASE_URL=...
BACKUP_S3_ENDPOINT=...
BACKUP_S3_REGION=...
BACKUP_S3_BUCKET=stlshelf-prod-db-backups
BACKUP_S3_ACCESS_KEY=...
BACKUP_S3_SECRET_KEY=...
BACKUP_AGE_PUBLIC_KEY=age1...
BACKUP_S3_PREFIX=postgres
BACKUP_ENV=prod
BACKUP_S3_SSE_ALGORITHM=AES256
BACKUP_ALERT_WEBHOOK_URL=https://...
TZ=Europe/Rome
```

Backup command:

```bash
bash scripts/ops/db-backup.sh
```

Cron entries:

- `0 2 * * *`
- `0 14 * * *`

## 5. Stale Backup Alert Job

Set same S3 vars and webhook, then run:

```bash
bash scripts/ops/db-backup-stale-check.sh
```

Recommended cron:

- `0 * * * *`

Defaults:

- stale threshold: 13 hours (`BACKUP_STALE_MAX_HOURS=13`)

## 6. Manual Restore Verification

Set restore-specific env vars:

```bash
RESTORE_DATABASE_URL=...
BACKUP_S3_ENDPOINT=...
BACKUP_S3_REGION=...
BACKUP_S3_BUCKET=stlshelf-prod-db-backups
BACKUP_S3_ACCESS_KEY=...
BACKUP_S3_SECRET_KEY=...
BACKUP_AGE_PRIVATE_KEY=AGE-SECRET-KEY-...
BACKUP_S3_PREFIX=postgres
BACKUP_ENV=prod
DR_ALERT_WEBHOOK_URL=https://...
```

Run:

```bash
bash scripts/ops/db-restore-verify.sh
```

Optional:

- `RESTORE_BACKUP_OBJECT_KEY` to force a specific backup object.
- `DR_SMOKE_BASE_URL` to run HTTP smoke checks (`/` and `/login`).
- `DR_SMOKE_DOWNLOAD_URL` to validate one download URL.

## 7. Troubleshooting Quick Notes

- `No backup object found`: verify prefix/env and bucket ACLs.
- `checksum failed`: artifact corruption or mismatch; restore previous backup.
- `Missing required table`: wrong DB target or incomplete restore permissions.
- stale alert firing with valid backups: verify metadata files are uploaded and stale-check prefix matches backup prefix.
