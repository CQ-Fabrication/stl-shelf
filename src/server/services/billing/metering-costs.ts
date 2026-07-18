/**
 * Effective-dated Hetzner cost configuration (spec Fase 2 / Fase 5).
 *
 * WHY code-versioned (not a DB table): the cost config is a versioned source of
 * truth. Keeping it in Git gives us an auditable, reviewable history of every
 * price change tied to a commit + date, and makes "which prices were in effect
 * on date X" answerable from the repo alone. Prices here are Hetzner PUBLIC
 * list prices (verified against live Hetzner docs + an account invoice), so
 * they are safe to keep in the (public) repo — no customer or revenue data.
 *
 * Price changes are NEVER retroactive by construction: `getCostConfigAt(date)`
 * returns the entry whose `effectiveFrom` is the latest one on or before that
 * date. A new price is added as a NEW entry with a future `effectiveFrom`; past
 * entries are immutable, so recomputing a historical month always uses the
 * prices that were actually in effect then.
 *
 * Units:
 *   - `baseHourly` / `monthlyCap`: EUR (the base fee is billed hourly, capped
 *     monthly at `monthlyCap`).
 *   - `includedStorageTbHourPerHour`: TB-hours of storage included per active
 *     bucket-hour (1 → 1 TB-hour/hour).
 *   - `includedEgressTbPerHour`: TB of object egress included per active hour.
 *   - `extraStoragePerTbHour`: EUR per TB-hour of storage above the included.
 *   - `extraEgressPerTb`: EUR per TB of object egress above the included.
 *   - `billingIncrementBytes`: Hetzner rounds storage AND traffic to this
 *     increment (100 MB).
 *   - `minBillableObjectBytes`: 64 KB per-object floor.
 *   - server.`includedEgressTbPerMonth`: traffic included with the Cloud Server
 *     (per the invoice, 20 TB/month); server.`extraEgressPerTb`: EUR per TB above.
 *
 * NOTE (spec Fase 1 verdict): both the base fee AND the included quotas are
 * per-ACCOUNT and shared across all buckets/projects on the account. Any
 * per-org "overage" derived from these is an analytic allocation, not a
 * measurement — label it as such downstream. This module only holds the rates.
 */

const MB = 1_000_000;

export type ObjectStorageCosts = {
  baseHourly: number;
  monthlyCap: number;
  includedStorageTbHourPerHour: number;
  includedEgressTbPerHour: number;
  extraStoragePerTbHour: number;
  extraEgressPerTb: number;
  billingIncrementBytes: number;
  minBillableObjectBytes: number;
};

export type ServerCosts = {
  includedEgressTbPerMonth: number;
  extraEgressPerTb: number;
};

export type MeteringCostConfig = {
  /** ISO date (YYYY-MM-DD) this config takes effect. */
  effectiveFrom: string;
  objectStorage: ObjectStorageCosts;
  server: ServerCosts;
  networkZone: string;
  /** Same-zone Object-Storage↔server traffic is free (eu-central). */
  internalTrafficFree: boolean;
  currency: string;
  /** VAT treatment of the rates above ("excluded" = net, ex-VAT). */
  vat: "excluded" | "included";
};

/**
 * Ordered oldest→newest. Add new pricing as a new trailing entry; never edit a
 * past entry (that would retroactively change historical months).
 */
export const METERING_COST_CONFIGS: readonly MeteringCostConfig[] = [
  {
    // Legacy Hetzner Object Storage pricing (pre 2026-06-15 list increase).
    effectiveFrom: "1970-01-01",
    objectStorage: {
      baseHourly: 4.99 / 730,
      monthlyCap: 4.99,
      includedStorageTbHourPerHour: 1,
      includedEgressTbPerHour: 0.0015,
      extraStoragePerTbHour: 0.0067,
      extraEgressPerTb: 1.0,
      billingIncrementBytes: 100 * MB,
      minBillableObjectBytes: 65_536,
    },
    server: {
      includedEgressTbPerMonth: 20,
      extraEgressPerTb: 1.0,
    },
    networkZone: "eu-central",
    internalTrafficFree: true,
    currency: "EUR",
    vat: "excluded",
  },
  {
    // Current list prices (verified against live Hetzner docs + invoice).
    effectiveFrom: "2026-06-15",
    objectStorage: {
      baseHourly: 0.0104,
      monthlyCap: 6.49,
      includedStorageTbHourPerHour: 1,
      includedEgressTbPerHour: 0.0015,
      extraStoragePerTbHour: 0.0087,
      extraEgressPerTb: 1.0,
      billingIncrementBytes: 100 * MB,
      minBillableObjectBytes: 65_536,
    },
    server: {
      includedEgressTbPerMonth: 20,
      extraEgressPerTb: 1.0,
    },
    networkZone: "eu-central",
    internalTrafficFree: true,
    currency: "EUR",
    vat: "excluded",
  },
] as const;

/**
 * Resolve the cost config effective at `date`: the entry with the latest
 * `effectiveFrom` on or before `date`. Falls back to the earliest entry for any
 * date before the first `effectiveFrom` (there is always at least one entry).
 */
export function getCostConfigAt(date: Date): MeteringCostConfig {
  const target = date.getTime();
  let resolved: MeteringCostConfig = METERING_COST_CONFIGS[0]!;

  for (const config of METERING_COST_CONFIGS) {
    // Compare at UTC midnight of the effectiveFrom date.
    if (new Date(`${config.effectiveFrom}T00:00:00.000Z`).getTime() <= target) {
      resolved = config;
    }
  }

  return resolved;
}
