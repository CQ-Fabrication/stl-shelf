import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/marketing/navigation";
import { Pricing as PricingSection } from "@/components/marketing/sections/pricing";
import { Footer } from "@/components/marketing/sections";
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
    ],
    links: [{ rel: "canonical", href: "https://stl-shelf.com/pricing" }],
  }),
});

function PricingPage() {
  const { pricing, session } = Route.useLoaderData();
  return (
    <>
      <Navigation session={session} />
      <main className="min-h-screen pt-16">
        <PricingSection pricing={pricing} />
        <Footer />
      </main>
    </>
  );
}
