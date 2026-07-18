import { useSubscription } from "@/hooks/use-subscription";

export const ActiveAddonsCard = () => {
  const { subscription } = useSubscription();
  const addons = subscription?.addons ?? [];
  if (addons.length === 0) return null;

  return (
    <section className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
      <p className="text-brand text-xs font-semibold uppercase tracking-[0.2em]">Active add-ons</p>
      <ul className="mt-3 flex flex-col gap-2">
        {addons.map((addon) => (
          <li
            className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm"
            key={addon.id}
          >
            <span className="font-medium">{addon.label}</span>
            <span className="text-muted-foreground">
              {addon.status === "canceled" ? "Cancels at period end" : "Active"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
