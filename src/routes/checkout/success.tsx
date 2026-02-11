import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle, Clock, CreditCard, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { z } from "zod";
import { FileStackEffect } from "@/components/empty-state/file-stack-effect";
import { Button } from "@/components/ui/button";
import { useCheckoutSuccess } from "@/hooks/use-checkout-success";
import { trackPricingInteraction } from "@/lib/openpanel/client-events";
import { useOpenPanelClient } from "@/lib/openpanel/client-provider";

const REDIRECT_SECONDS = 5;
const PROGRESS_MAX = 100;
const successHighlights = [
  {
    title: "Plan activated",
    description: "Your new plan is live and ready to use.",
    icon: Sparkles,
  },
  {
    title: "Billing ready",
    description: "Manage invoices and details anytime.",
    icon: CreditCard,
  },
  {
    title: "Limits updated",
    description: "Your workspace reflects the new tier.",
    icon: CheckCircle,
  },
] as const;

export const Route = createFileRoute("/checkout/success")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: CheckoutSuccessPage,
  validateSearch: z.object({
    checkout_id: z.string().optional(),
  }),
});

function CheckoutSuccessPage() {
  const { checkout_id } = Route.useSearch();
  const navigate = useNavigate();
  const { client } = useOpenPanelClient();
  const trackedRef = useRef(false);
  const handleRedirect = useCallback(() => navigate({ to: "/billing" }), [navigate]);
  const { secondsLeft, progress } = useCheckoutSuccess({
    checkoutId: checkout_id,
    redirectSeconds: REDIRECT_SECONDS,
    onRedirect: handleRedirect,
  });
  const progressPercent = Math.min(PROGRESS_MAX, Math.max(0, progress * PROGRESS_MAX));

  useEffect(() => {
    if (!client || trackedRef.current) return;
    trackPricingInteraction(client, "checkout_success_page_viewed");
    trackedRef.current = true;
  }, [client]);

  return (
    <div className="relative min-h-svh overflow-hidden bg-gradient-to-b from-background via-background to-muted/40">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
        }}
      />
      <div className="pointer-events-none absolute -top-24 right-[-12%] h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <div className="container mx-auto flex min-h-svh items-center justify-center px-4 py-16">
        <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="rounded-2xl border border-border/60 bg-card/80 p-8 shadow-xl backdrop-blur-sm">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary" />
                Payment confirmed
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                You&apos;re all set!
              </h1>
              <p className="text-muted-foreground">
                Thanks for upgrading. We&apos;re updating your workspace now and will take you to
                billing to review your plan details.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {successHighlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border/50 bg-background/70 p-4 text-left"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="font-medium text-sm text-foreground">{item.title}</p>
                  <p className="text-muted-foreground text-xs">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-border/60 bg-muted/40 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="flex items-center gap-2 font-medium text-sm text-foreground">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span aria-live="polite">Redirecting to billing in {secondsLeft}s</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    If the redirect doesn&apos;t happen, use the button.
                  </p>
                </div>
                <Button className="shrink-0" onClick={handleRedirect}>
                  Go to billing now
                </Button>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-background/70">
                <div
                  className="h-full bg-primary transition-[width] duration-150"
                  style={{ width: `${progressPercent.toFixed(2)}%` }}
                />
              </div>
            </div>

            {checkout_id ? (
              <div className="mt-4 rounded-lg border border-border/40 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                Reference ID: <span className="font-mono text-foreground">{checkout_id}</span>
              </div>
            ) : null}
          </section>

          <section className="relative flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl motion-safe:animate-pulse" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-background/80 shadow-lg">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
            </div>
            <FileStackEffect className="h-44 w-52" />
            <div className="rounded-full border border-border/50 bg-background/70 px-4 py-2 text-center text-xs text-muted-foreground">
              Library updates are ready to sync with your new plan.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
