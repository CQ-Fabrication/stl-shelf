import { PricingCards } from "@/components/pricing/pricing-cards";
import type { PublicPricingResponse } from "@/server/functions/pricing";

type PricingProps = {
  pricing?: PublicPricingResponse | null;
};

export function Pricing({ pricing }: PricingProps) {
  return (
    <section id="pricing" className="relative py-24 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(30deg, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(150deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="animate-fade-in-up text-center mb-16">
          <span className="inline-flex items-center gap-2 text-sm font-mono font-medium text-orange-500 mb-4 tracking-wider uppercase">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500/50" />
            Pricing
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500/50" />
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            Simple, <span className="text-orange-500">Transparent</span> Pricing
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Start free, upgrade when you need more. No hidden fees.
          </p>
        </div>

        <PricingCards pricing={pricing} />

        <div className="animate-fade-in-up text-center mt-12 text-sm text-muted-foreground space-y-3">
          <div>All plans include 3D model preview, file organization, and secure storage.</div>
          <div>Fair‑use bandwidth included (up to 3× stored data per month).</div>
        </div>
      </div>
    </section>
  );
}
