# Disaster Recovery Plan (Production)

## Scope

- Application: STL Shelf (TanStack Start app)
- Environment: `prod`
- Platform: Coolify on Hetzner
- Database: PostgreSQL
- Backup storage: Hetzner Object Storage (S3-compatible), dedicated bucket

## Objectives

- RPO: 12 hours
- RTO: 2 hours
- Backup frequency: 2 times/day
- Retention: 7 days
- DR drill cadence: monthly

## Core Strategy

1. Primary protection: logical PostgreSQL backup (`pg_dump -Fc`), compressed (`zstd`), encrypted (`age`), uploaded to S3.
2. Integrity controls: per-backup SHA256 + metadata file.
3. Alerting:

- immediate alert on backup/restore/stale-check failure (webhook).
- stale backup alert when latest valid backup is older than 13 hours.

4. Validation: monthly restore drill on a new machine with SQL sanity checks and app smoke checks.

## Backup Object Layout

- Bucket: dedicated production backup bucket (example: `stlshelf-prod-db-backups`)
- Prefix pattern: `postgres/prod/YYYY/MM/DD/`
- Backup artifact name: `stlshelf_prod_YYYYMMDDTHHMMSSZ.dump.zst.age`
- Associated files:
- `<file>.sha256`
- `<file>.json`

## Security Controls

- S3 credentials scoped to backup prefix only.
- Separate read-only credential for restore/audit drill.
- SSE enabled at upload (`AES256` by default).
- Client-side encryption with `age`.
- Keep `BACKUP_AGE_PRIVATE_KEY` only in restore/drill contexts.

## Required Runtime Variables

- `DATABASE_URL`
- `BACKUP_S3_ENDPOINT`
- `BACKUP_S3_REGION`
- `BACKUP_S3_BUCKET`
- `BACKUP_S3_ACCESS_KEY`
- `BACKUP_S3_SECRET_KEY`
- `BACKUP_AGE_PUBLIC_KEY`
- `BACKUP_AGE_PRIVATE_KEY` (restore/drill only)

## Coolify Scheduling (Europe/Rome)

- Backup job #1: `0 2 * * *`
- Backup job #2: `0 14 * * *`
- Stale-check job: hourly (`0 * * * *`)

## Scripts

- `scripts/ops/db-backup.sh`
- `scripts/ops/db-backup-stale-check.sh`
- `scripts/ops/db-restore-verify.sh`

## Monthly DR Drill Policy

- Target window: first Tuesday of each month, 10:00 Europe/Rome.
- Execution scope:
- restore latest backup on a freshly provisioned DR stack.
- run SQL sanity checks.
- run application smoke checks.
- Success criteria:
- restore end-to-end within 2 hours.
- no integrity errors.
- smoke checks passed.

## Escalation and Postmortem

- Any backup or drill failure opens an incident ticket.
- Report must include:
- timestamp and duration
- root cause
- corrective actions
- owner and due date
