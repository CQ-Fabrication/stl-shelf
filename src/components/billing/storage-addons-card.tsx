import { Button } from "@/components/ui/button";
import { useCustomerPortal } from "@/hooks/use-customer-portal";
import { useSubscription } from "@/hooks/use-subscription";

const STORAGE_ADDONS = [
  { label: "+100 GB", price: "$4.99" },
  { label: "+500 GB", price: "$20.99" },
  { label: "+1 TB", price: "$35.99" },
];

export const StorageAddonsCard = () => {
  const { subscription, isLoading } = useSubscription();
  const { openPortal, isLoading: isPortalLoading } = useCustomerPortal();
  const isPro = subscription?.tier === "pro";
  if (isLoading || !isPro) return null;
  const isOwner = subscription?.isOwner ?? false;
  const isDisabled = isLoading || isPortalLoading || !isOwner;

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

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {STORAGE_ADDONS.map((addon) => (
          <div
            className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm"
            key={addon.label}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{addon.label}</span>
              <span className="text-muted-foreground">{addon.price}/month</span>
            </div>
          </div>
        ))}
      </div>

      {!isOwner && (
        <p className="mt-3 text-xs text-muted-foreground">
          Ask the organization owner to manage storage add-ons.
        </p>
      )}
    </section>
  );
};
