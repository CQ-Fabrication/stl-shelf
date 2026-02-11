import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CreditCard, LifeBuoy, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { FileStackEffect } from "@/components/empty-state/file-stack-effect";
import { Button } from "@/components/ui/button";
import { useRedirectCountdown } from "@/hooks/use-redirect-countdown";
import { trackPricingInteraction } from "@/lib/openpanel/client-events";
import { useOpenPanelClient } from "@/lib/openpanel/client-provider";

const REDIRECT_SECONDS = 5;
const PROGRESS_MAX = 100;
const failureHighlights = [
  {
    title: "No charge made",
    description: "Your payment wasn’t captured.",
    icon: ShieldCheck,
  },
  {
    title: "Try again",
    description: "Pick a different method in billing.",
    icon: CreditCard,
  },
  {
    title: "Need a hand?",
    description: "We’re here if you need support.",
    icon: LifeBuoy,
  },
] as const;

export const Route = createFileRoute("/checkout/failed")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: CheckoutFailedPage,
});

function CheckoutFailedPage() {
  const navigate = useNavigate();
  const { client } = useOpenPanelClient();
  const trackedRef = useRef(false);
  const handleRedirect = useCallback(() => navigate({ to: "/billing" }), [navigate]);
  const { secondsLeft, progress } = useRedirectCountdown({
    seconds: REDIRECT_SECONDS,
    onRedirect: handleRedirect,
  });
  const progressPercent = Math.min(PROGRESS_MAX, Math.max(0, progress * PROGRESS_MAX));

  useEffect(() => {
    if (!client || trackedRef.current) return;
    trackPricingInteraction(client, "checkout_failed_page_viewed");
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
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Payment not completed
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Let&apos;s try that again
              </h1>
              <p className="text-muted-foreground">
                No charge was made. We&apos;ll take you back to billing so you can choose a
                different method or retry.
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {failureHighlights.map((item) => (
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
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
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
          </section>

          <section className="relative flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-amber-500/15 blur-xl motion-safe:animate-pulse" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-amber-500/30 bg-background/80 shadow-lg">
                <AlertTriangle className="h-10 w-10 text-amber-500" />
              </div>
            </div>
            <FileStackEffect className="h-44 w-52" />
            <div className="rounded-full border border-border/50 bg-background/70 px-4 py-2 text-center text-xs text-muted-foreground">
              Your library is safe while we finish the update.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
