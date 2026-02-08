# STL Shelf Payments Security Audit (Polar)

Date: 2026-02-06
Scope: Polar checkout creation, subscription lifecycle updates, webhook verification/idempotency/replay, paid-feature authorization, account linkage.

## Executive summary

I found 3 concrete security issues and 2 control gaps. The highest risk is webhook replay/out‑of‑order handling that can silently downgrade or overwrite subscription state. There is also a paid-feature authorization gap for ZIP downloads and a missing uniqueness constraint that can allow cross‑org subscription updates if a Polar customer ID is mis‑linked.

## Findings

### [PAY-001] Webhook replay/out‑of‑order events can overwrite subscription state (no idempotency or staleness guard)

Severity: High

Location:

- `/Users/claudioquaglia/CQ Fabrication/3d-printing-ecosystem/stl-shelf/src/lib/billing/webhook-handlers.ts` (handlers update state directly with no event-id or timestamp checks) lines 165-446

Evidence:

- `handleOrderPaid`, `handleSubscriptionCreated`, `handleSubscriptionCanceled`, `handleSubscriptionRevoked`, `handleCustomerStateChanged` all write subscription state based solely on the payload and `polarCustomerId` with no guard against replay or stale event ordering.

Impact:

- A replayed or delayed webhook (e.g., old `subscription.revoked` after a re‑subscribe) can silently downgrade an active org to free. Replays of `order.paid` can also re‑activate a canceled subscription in app state without a current subscription.

Fix (safe pattern):

- Persist Polar event IDs and timestamps and reject replays. Store `eventId`, `eventType`, `eventTimestamp` and add a unique constraint on `(eventId)` (or `(eventType,eventId)` if needed). If Polar does not send a unique event id, hash the raw payload + timestamp and require monotonic `timestamp` per `customerId`.
- Add a staleness guard: compare incoming event timestamp to a stored `lastBillingEventAt` on the organization; ignore older events.
- Prefer a single "source of truth" sync on `customer.state_changed` and ignore lower‑priority events if a newer state sync has been applied.

Mitigation:

- Keep the `recordWebhookPayload` log, but include event id/timestamp, and log + alert on out‑of‑order events for manual review.

False positive notes:

- If `@polar-sh/better-auth` already enforces idempotency or timestamp replay protection internally, document that and expose the event id/timestamp on callbacks so the app can still guard against out‑of‑order processing.

### [PAY-002] Paid feature (ZIP downloads) lacks server‑side tier authorization

Severity: Medium

Location:

- `/Users/claudioquaglia/CQ Fabrication/3d-printing-ecosystem/stl-shelf/src/routes/api/download/version/$versionId.zip.ts` lines 10-103

Evidence:

- ZIP download endpoint checks auth + org access but does not verify subscription tier even though ZIP downloads are listed as a paid feature (Basic/Pro) in `/Users/claudioquaglia/CQ Fabrication/3d-printing-ecosystem/stl-shelf/src/lib/billing/config.ts` lines 23-57.

Impact:

- Free tier users can call the endpoint directly and download ZIP bundles. This defeats a paid‑feature boundary and can cause revenue loss and abuse.

Fix (safe pattern):

- Add a server‑side gate at the endpoint: load org tier from DB and enforce `tier !== "free"` (or use a capability flag derived from tier config).
- Centralize paid‑feature checks in a billing guard (e.g., `requireTier("basic")`) and reuse for any paid endpoints.

Mitigation:

- If you want to allow ZIP downloads for free tiers during a trial, make the rule explicit and time‑boxed in config + log auditing.

False positive notes:

- If ZIP downloads are intentionally free for now, update the tier config feature list and UI to avoid misleading users.

### [PAY-003] Polar customer linkage can affect multiple orgs (no uniqueness on `polarCustomerId`)

Severity: Medium

Location:

- `/Users/claudioquaglia/CQ Fabrication/3d-printing-ecosystem/stl-shelf/src/lib/db/schema/auth.ts` lines 96-131
- `/Users/claudioquaglia/CQ Fabrication/3d-printing-ecosystem/stl-shelf/src/lib/billing/webhook-handlers.ts` lines 191-205, 234-247, 266-273, 374-387

Evidence:

- `organization.polar_customer_id` has no unique constraint; webhook handlers update by `where(eq(organization.polarCustomerId, customerId))` which can match multiple orgs.

Impact:

- If a Polar customer ID is mistakenly duplicated (migration bug, admin error, or data corruption), subscription updates will apply to multiple organizations, causing cross‑org entitlement leaks and billing confusion.

Fix (safe pattern):

- Add a unique index on `organization.polar_customer_id` and (optionally) `subscription_id`.
- When handling webhooks, verify that the customer’s `externalId` (organization id) matches the targeted org before applying changes.

Mitigation:

- Add runtime checks: if `update` affects more than 1 row, log a high‑severity audit event and stop further processing.

False positive notes:

- If Polar guarantees uniqueness and the app never duplicates, this is still a defense‑in‑depth DB guard worth enforcing.

## Control gaps (not full findings)

### [GAP-001] Webhook verification path not visible in app code

Location:

- `/Users/claudioquaglia/CQ Fabrication/3d-printing-ecosystem/stl-shelf/src/lib/auth.ts` lines 295-303

Note:

- `webhooks({ secret: env.POLAR_WEBHOOK_SECRET, ... })` indicates signature verification by `@polar-sh/better-auth`, but the exact verification (raw body usage, timestamp tolerance) is not visible in this repo. Confirm at runtime or in vendor docs and document expected behavior.

Safe pattern:

- Ensure raw body is used for signature verification, enforce a short timestamp tolerance, and reject unsigned payloads before any side‑effects.

### [GAP-002] Checkout ownership controls are correct but not reused elsewhere

Location:

- `/Users/claudioquaglia/CQ Fabrication/3d-printing-ecosystem/stl-shelf/src/server/functions/billing.ts` lines 243-369

Note:

- `createCheckout` and `getPortalUrl` correctly enforce owner‑only access, but there is no centralized billing authorization guard for other paid endpoints. Consider a shared guard to avoid drift.

Safe pattern:

- Add a `requireBillingOwner(context)` or `requireTier` guard and use it consistently in billing endpoints.

## Next steps

1. Implement idempotency and staleness guards for webhook processing.
2. Add server‑side tier checks for ZIP downloads (and any other paid features).
3. Add unique constraints for `polar_customer_id` (and `subscription_id`) + validation against `externalId`.
