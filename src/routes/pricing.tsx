import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/marketing/navigation";
import { Pricing as PricingSection } from "@/components/marketing/sections/pricing";
import { Footer } from "@/components/marketing/sections";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
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
  return (
    <>
      <Navigation />
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
        <PricingSection />
        <Footer />
      </main>
    </>
  );
}
