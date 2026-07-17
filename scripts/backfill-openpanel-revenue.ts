import { Polar } from "@polar-sh/sdk";
import {
  deliverOrderRefund,
  deliverOrderRevenue,
  recordPaidOrder,
  recordRefundedOrder,
} from "@/lib/billing/order-ledger";
import {
  getTierFromProductId,
  getTrackingContextByCustomerId,
} from "@/lib/billing/webhook-handlers";
import { env } from "@/lib/env";
import { isOpenPanelServerEnabled } from "@/lib/openpanel";

// Scripts are standalone entry points: instantiate a private Polar client the
// same way src/server/services/billing/polar.service.ts does.
const polar = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});

const main = async () => {
  // Dry-run is the default; --apply performs DB writes and OpenPanel delivery.
  const apply = process.argv.includes("--apply");
  const mode = apply ? "apply" : "dry-run";

  // A dry run needs no OpenPanel creds, but an --apply run must be able to
  // deliver — fail loudly before touching anything if it can't.
  if (apply && !isOpenPanelServerEnabled()) {
    throw new Error("OpenPanel is not configured; cannot run revenue backfill with --apply.");
  }

  let matchedPaidOrders = 0;
  let appliedOrders = 0;
  let refundedOrders = 0;
  let skippedUnlinkedOrders = 0;
  let skippedUnpaidOrders = 0;
  const totalsByCurrencyMinor: Record<string, number> = {};

  const pages = await polar.orders.list({ limit: 100, sorting: ["created_at"] });

  for await (const page of pages) {
    for (const order of page.result.items) {
      if (!order.paid) {
        skippedUnpaidOrders++;
        continue;
      }

      // Totals accumulate for every paid order regardless of linkage — mirror
      // Tailmux so the dry-run summary reflects all of Polar's revenue.
      matchedPaidOrders++;
      const currency = order.currency.toLowerCase();
      totalsByCurrencyMinor[currency] = (totalsByCurrencyMinor[currency] ?? 0) + order.netAmount;

      const isRefunded = order.refundedAmount + order.refundedTaxAmount > 0;
      if (isRefunded) {
        refundedOrders++;
      }

      const tracking = await getTrackingContextByCustomerId(order.customerId);
      if (!tracking) {
        skippedUnlinkedOrders++;
        continue;
      }

      if (!apply) {
        continue;
      }

      const tier = order.productId ? getTierFromProductId(order.productId) : undefined;
      const ctx = {
        organizationId: tracking.organizationId,
        profileId: tracking.profile.profileId,
        tier: tier ?? null,
      };

      // Sequential awaits are the implicit rate limit — no sleeps.
      await recordPaidOrder(order, ctx, order.createdAt);
      await deliverOrderRevenue(order.id);
      appliedOrders++;

      if (isRefunded) {
        await recordRefundedOrder(order, ctx, order.modifiedAt ?? order.createdAt);
        await deliverOrderRefund(order.id);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        mode,
        polarEnvironment: env.POLAR_SERVER,
        matchedPaidOrders,
        appliedOrders,
        refundedOrders,
        skippedUnlinkedOrders,
        skippedUnpaidOrders,
        totalsByCurrencyMinor,
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log("Dry run only. Re-run with --apply after reviewing the summary.");
  }
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[revenue backfill] failed", error);
    process.exit(1);
  });
