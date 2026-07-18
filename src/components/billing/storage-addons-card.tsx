import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useCustomerPortal } from "@/hooks/use-customer-portal";
import { useSubscription } from "@/hooks/use-subscription";
import { getAddonPricing } from "@/server/functions/pricing";

const formatPrice = (price: { amount: number; currency: string }) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currency,
  }).format(price.amount / 100);

export const StorageAddonsCard = () => {
  const { subscription, isLoading } = useSubscription();
  const { openPortal, isLoading: isPortalLoading } = useCustomerPortal();
  const { data: addonPricing } = useQuery({
    queryKey: ["billing", "addon-pricing"],
    queryFn: () => getAddonPricing(),
  });
  const isPro = subscription?.tier === "pro";
  if (isLoading || !isPro) return null;
  const isOwner = subscription?.isOwner ?? false;
  const isDisabled = isLoading || isPortalLoading || !isOwner;
  const storagePacks = (addonPricing?.addons ?? []).filter((addon) => addon.kind === "storage");

  return (
    <section className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
      <p className="text-brand text-xs font-semibold uppercase tracking-[0.2em]">Storage add-ons</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Need more space?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add storage packs to your plan. Billed together in the same invoice.
          </p>
        </div>
        <Button disabled={isDisabled} onClick={openPortal} variant="outline">
          {isOwner ? "Manage add-ons" : "Owner only"}
        </Button>
      </div>

      {storagePacks.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {storagePacks.map((addon) => (
            <div
              className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm"
              key={addon.slug}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{addon.label}</span>
                {addon.price && (
                  <span className="text-muted-foreground">{formatPrice(addon.price)}/month</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isOwner && (
        <p className="mt-3 text-xs text-muted-foreground">
          Ask the organization owner to manage storage add-ons.
        </p>
      )}
    </section>
  );
};
