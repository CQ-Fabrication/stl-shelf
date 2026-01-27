import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import { PlanSelector } from "@/components/billing/plan-selector";
import { StorageAddonsCard } from "@/components/billing/storage-addons-card";
import { SubscriptionStatusCard } from "@/components/billing/subscription-status-card";
import { Button } from "@/components/ui/button";
import { useCustomerPortal } from "@/hooks/use-customer-portal";
import { useSubscription } from "@/hooks/use-subscription";
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
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const { openPortal, isLoading: isPortalLoading } = useCustomerPortal();
  const showPortalLink =
    !isSubscriptionLoading && subscription?.isOwner && subscription.tier !== "free";

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

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-6">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Current plan</p>
                  <p className="text-xs text-muted-foreground">Live usage and limits</p>
                </div>
              </div>
              <SubscriptionStatusCard />
            </section>

            <StorageAddonsCard />
          </div>

          <section className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Plans</p>
                <p className="text-xs text-muted-foreground">
                  Upgrade or downgrade anytime. Downgrades are confirmed in the billing portal.
                </p>
              </div>
              {showPortalLink ? (
                <Button
                  className="h-8"
                  disabled={isPortalLoading}
                  onClick={openPortal}
                  size="sm"
                  variant="outline"
                >
                  {isPortalLoading ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-3 w-3" />
                  )}
                  Billing Portal
                </Button>
              ) : null}
            </div>
            <PlanSelector className="max-w-none mx-0 gap-5 sm:grid-cols-2" pricing={pricing} />
          </section>
        </div>
      </div>
    </div>
  );
}
