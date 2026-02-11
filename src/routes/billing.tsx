import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import { PlanSelector } from "@/components/billing/plan-selector";
import { StorageAddonsCard } from "@/components/billing/storage-addons-card";
import { SubscriptionStatusCard } from "@/components/billing/subscription-status-card";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { useOpenPanelClient } from "@/lib/openpanel";
import { getPublicPricing } from "@/server/functions/pricing";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  loader: async () => {
    const pricing = await getPublicPricing();
    return { pricing };
  },
  component: BillingPage,
});

function BillingPage() {
  const { pricing } = Route.useLoaderData();
  const { client } = useOpenPanelClient();
  const { subscription } = useSubscription();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!client || trackedRef.current || !subscription?.tier) return;

    client.track("pricing_page_viewed", {
      currentTier: subscription.tier,
      source: "billing_page",
    });
    trackedRef.current = true;
  }, [client, subscription?.tier]);

  return (
    <div className="bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild className="transition-colors hover:text-brand" size="sm" variant="ghost">
            <Link to="/library">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Link>
          </Button>
        </div>

        <div className="border-border/60 border-b pb-6">
          <div className="text-muted-foreground text-xs uppercase tracking-[0.2em]">Billing</div>
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">Billing & Subscription</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Manage your plan, keep an eye on usage, and scale storage as your library grows.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Current plan</p>
                <p className="text-xs text-muted-foreground">Live usage and limits</p>
              </div>
            </div>
            <SubscriptionStatusCard />
            <StorageAddonsCard />
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Plans</p>
                <p className="text-xs text-muted-foreground">
                  Upgrade or downgrade anytime. Downgrades are confirmed in the billing portal.
                </p>
              </div>
            </div>
            <PlanSelector className="max-w-none mx-0 gap-5 sm:grid-cols-3" pricing={pricing} />
          </section>
        </div>
      </div>
    </div>
  );
}
