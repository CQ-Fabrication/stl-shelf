# Storage & egress metering

STL Shelf measures its own object-storage footprint (Hetzner Object Storage)
and the bytes it delivers, attributes both to organizations where possible,
and estimates the monthly infrastructure cost. Measurement never blocks users:
the enforcement counters (bandwidth soft/hard limits) are a separate,
unchanged system.

## Data model

| Table                      | Contents                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage_objects`          | Application ledger: one row per storage key, soft-deleted on removal. Maintained at the storage choke point (`StorageService.uploadFile` / `deleteFile(s)`), best-effort but awaited. |
| `storage_hourly_snapshots` | Hourly per-org storage state. `source = "ledger"` rows come from the ledger; `source = "reconciliation"` rows from a bucket sweep. Comparing the two exposes drift.                   |
| `egress_daily_rollups`     | Daily per-org, per-delivery-kind, per-path byte/request counters, incremented atomically at request end. Delivery paths are distinct network segments and are never summed.           |
| `metering_runs`            | One row per job run (`running` → `completed`/`failed`) with a summary in `details`. Gap detection reads this table.                                                                   |

`object_storage_direct` rows (presigned URLs handed to API clients) are
**issuance-time estimates**: the provider exposes no per-bucket access logs, so
a direct transfer cannot be verified. All other paths are measured on the wire.

## Commands

### `bun metering:backfill-ledger` (one-off / recovery)

Pages the whole bucket and upserts ledger rows from object metadata.
**Dry-run by default; `--apply` to write.** Idempotent — re-running upserts the
same rows. Use once per environment before the first snapshot, or to rebuild
the ledger after data loss.

### `bun metering:snapshot` (hourly)

Writes one `storage_hourly_snapshots` row per organization (plus one
unattributed row) for the current UTC hour, from the live ledger.

- **Idempotency**: re-running within the same hour upserts the same rows.
- **Skipped run**: the hour stays missing — storage state is point-in-time and
  cannot be reconstructed afterwards. Nothing to recover; the monthly report
  scales from sampled hours and prints the coverage ratio ("N/M hours
  sampled"), and `metering:verify` flags months with poor coverage.

### `bun metering:reconcile` (daily)

Diffs the bucket (ListObjects) against the ledger.
**Dry-run by default; `--apply` to write.** With `--apply` it:

- inserts ledger rows for objects the ledger missed (unknown key layouts
  become _unattributed_),
- soft-deletes ledger rows whose object is gone,
- fixes size mismatches,
- writes a `source = "reconciliation"` snapshot for the current hour,
- records a `metering_runs` row with the drift summary.

Drift beyond `--drift-threshold-bytes` (default 100 MiB) is logged as
`metering.reconciliation.drift`. Skipped runs need no recovery — the next run
reconciles cumulatively. Re-running is idempotent once the ledger converges.

### `bun metering:report` (monthly, after month close)

`--month=YYYY-MM` (default: previous month). Read-only apart from its own run
row. Prints usage, the estimated cost breakdown (base fee, storage overage,
object-egress overage _estimate_, server-egress overage), free traffic
(internal same-zone, ingress), and per-organization attribution — marginal
cost and a pro-rata figure explicitly labeled _analytical allocation, not a
measurement_. Prices are resolved effective-dated per month (a past month
always uses the prices in force back then; mid-month list changes are priced
at the month-end rate, not split).

### `bun metering:verify` (monthly, before invoice comparison)

`--month=YYYY-MM --tolerance=0.02`. Read-only, no side effects. Checks:

1. ledger totals vs the latest reconciliation snapshot (delta %),
2. segment consistency (proxy bytes served must not exceed internal bytes
   read beyond tolerance — more out than in would mean double counting),
3. hourly snapshot coverage for the month.

Exit code 1 when any check is out of tolerance; purely informational.

### `bun metering:alerts` (daily)

Informational month-to-date checks against the current cost config — nothing
blocks users, nothing touches enforcement. Fired alerts go to stdout and to
`metering.alert.<kind>` log events; exit code 1 when any alert fires (a signal
for schedulers). Thresholds live in one config object
(`DEFAULT_ALERT_THRESHOLDS` in `src/server/services/metering/alerts.ts`).

Checks: included-quota consumption at 50/75/90/100% (both raw share of the
monthly allowance and pace against the allowance accrued so far — "on pace to
exceed" vs "already exceeded"); anomalous daily bucket growth (default 3× the
trailing 7-day mean); orgs whose monthly egress exceeds 10× their stored
bytes; unattributed bytes above 5% of the bucket or any unattributed egress;
ledger vs latest reconciliation drift beyond 2%; and — optionally — comparison
with operator-supplied provider figures (`--provider-storage-tbh=`,
`--provider-egress-tb=`, read manually from the invoice/console since no usage
API exists) within the 2% tolerance.

Idempotent and stateless: re-running just re-evaluates. A skipped day needs no
recovery.

## Reconciling a month against the provider invoice

1. Run `metering:reconcile --apply`, then `metering:verify --month=<M>` — fix
   drift before trusting the numbers.
2. Run `metering:report --month=<M>` and compare with the invoice lines.
3. Mind the caveats:
   - **The invoice is per account.** The base fee and the included quotas
     (1 TB-hour/hour storage, 0.0015 TB/hour egress) are shared across _all_
     buckets/projects on the account. This system observes the stl-shelf
     bucket only, so compare bucket-level TB-hours against the invoice's
     _sum_ of bucket lines, and expect the report to under-state account-level
     overage.
   - The invoice bills storage in **TB-hours** — the report already uses the
     same unit (billable bytes, 64 KB per-object floor, 100 MB increments).
   - The provider console's usage stats lag ~15–20 minutes; don't compare
     against the console mid-hour.
   - Direct (presigned) egress in the report is an **estimate**; only proxy
     egress is measured.
4. Tolerance: start at 2% on the bucket-scoped storage figures. Investigate
   beyond that via `metering_runs` details and the reconciliation drift logs.

## Cost configuration

Prices live in code (`src/server/services/billing/metering-costs.ts`) as an
effective-dated list of public list prices. Add a new entry for a price
change — never edit past entries; historical months must keep their era's
prices. `getCostConfigAt(date)` resolves the entry in force at a date.
