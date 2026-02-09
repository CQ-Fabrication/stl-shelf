# DR Drill Checklist (Monthly)

## Cadence

- Frequency: monthly
- Suggested slot: first Tuesday, 10:00 Europe/Rome
- Target: prove RPO 12h and RTO <= 2h

## Pre-Drill

- Confirm latest production backup timestamp (< 13h old).
- Confirm drill owner + note taker assigned.
- Prepare fresh Hetzner VM (or isolated Coolify environment).
- Ensure restore credentials and `BACKUP_AGE_PRIVATE_KEY` are available.

## Execution Steps

1. Provision new machine/environment for drill.
2. Deploy base stack:

- PostgreSQL same major version as production.
- STL Shelf same production tag/commit.

3. Run restore script:

```bash
bash scripts/ops/db-restore-verify.sh
```

4. Confirm SQL sanity results:

- DB connectivity OK
- `organization`, `"user"`, `models` tables exist
- minimum row counts passed

5. Run app smoke checks:

- homepage reachable
- login page reachable
- login with test account (manual)
- models list visible (manual)
- at least one file download works (manual or `DR_SMOKE_DOWNLOAD_URL`)

6. Record total drill time end-to-end.

## Pass/Fail Criteria

- PASS if:
- restore completed successfully.
- no checksum/decryption/restore errors.
- smoke checks successful.
- duration <= 2 hours.
- FAIL otherwise.

## Post-Drill Report Template

- Date/time:
- Environment:
- Backup object used:
- Duration:
- Result: PASS/FAIL
- Issues found:
- Root cause(s):
- Corrective action(s):
- Owner(s):
- Due date(s):

## Mandatory Follow-Up

- Create a ticket for each gap found.
- Link report + logs in ticket.
- Track remediation until completed before next drill.
