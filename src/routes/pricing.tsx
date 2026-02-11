import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Navigation } from "@/components/marketing/navigation";
import { Pricing as PricingSection } from "@/components/marketing/sections/pricing";
import { Footer } from "@/components/marketing/sections";
import { useActiveOrganization } from "@/hooks/use-organizations";
import { useOpenPanelClient } from "@/lib/openpanel/client-provider";
import { getPublicPricing } from "@/server/functions/pricing";
import { getSessionFn } from "@/server/functions/auth";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  loader: async () => {
    const pricing = await getPublicPricing();
    const session = await getSessionFn();
    return { pricing, session };
  },
  head: () => ({
    meta: [
      { title: "Pricing - STL Shelf" },
      {
        name: "description",
        content:
          "Simple, transparent pricing for STL Shelf. Start free, upgrade when you need more.",
      },
      {
        property: "og:title",
        content: "STL Shelf Pricing",
      },
      {
        property: "og:description",
        content:
          "Simple, transparent pricing for STL Shelf. Start free, upgrade when you need more.",
      },
      {
        property: "og:image",
        content: "https://stl-shelf.com/og-image.svg",
      },
      {
        property: "og:url",
        content: "https://stl-shelf.com/pricing",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:title",
        content: "STL Shelf Pricing",
      },
      {
        name: "twitter:description",
        content:
          "Simple, transparent pricing for STL Shelf. Start free, upgrade when you need more.",
      },
      {
        name: "twitter:image",
        content: "https://stl-shelf.com/og-image.svg",
      },
    ],
    links: [{ rel: "canonical", href: "https://stl-shelf.com/pricing" }],
  }),
});

function PricingPage() {
  const { pricing, session } = Route.useLoaderData();
  const { client } = useOpenPanelClient();
  const { data: activeOrg } = useActiveOrganization();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!client || trackedRef.current) return;

    const currentTier =
      activeOrg?.subscriptionTier === "basic" || activeOrg?.subscriptionTier === "pro"
        ? activeOrg.subscriptionTier
        : "free";

    client.track("pricing_page_viewed", {
      currentTier,
      source: "marketing_pricing",
    });
    trackedRef.current = true;
  }, [client, activeOrg?.subscriptionTier]);

  return (
    <>
      <Navigation session={session} />
      <main className="min-h-screen pt-16">
        <header className="container mx-auto px-4 pt-12 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            STL Shelf Pricing
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Choose a plan for your 3D model library, from free personal collections to team-ready
            storage.
          </p>
        </header>
        <PricingSection pricing={pricing} />
        <Footer />
      </main>
    </>
  );
}
