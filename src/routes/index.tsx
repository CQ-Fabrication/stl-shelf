import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/marketing/navigation";
import {
  HeroSection,
  TextRevealSection,
  Features,
  HowItWorks,
  UseCases,
  Resources,
  Pricing,
  Testimonials,
  FAQ,
  FinalCTA,
  Footer,
} from "@/components/marketing/sections";
import { getPublicPricing } from "@/server/functions/pricing";
import { getSessionFn } from "@/server/functions/auth";

export const Route = createFileRoute("/")({
  component: LandingPage,
  loader: async () => {
    const pricing = await getPublicPricing();
    const session = await getSessionFn();
    return { pricing, session };
  },
  head: () => ({
    meta: [
      {
        title: "STL Shelf - 3D Model Library for Makers",
      },
      {
        name: "description",
        content:
          "Organize, version, and share your 3D printable models. Cloud or self-hosted for makers and teams.",
      },
      {
        property: "og:title",
        content: "STL Shelf - 3D Model Library for Makers",
      },
      {
        property: "og:description",
        content:
          "Organize, version, and share your 3D printable models. Cloud or self-hosted for makers and teams.",
      },
      {
        property: "og:image",
        content: "https://stl-shelf.com/og-image.svg",
      },
      {
        property: "og:url",
        content: "https://stl-shelf.com/",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:title",
        content: "STL Shelf - 3D Model Library for Makers",
      },
      {
        name: "twitter:description",
        content:
          "Organize, version, and share your 3D printable models. Cloud or self-hosted for makers and teams.",
      },
      {
        name: "twitter:image",
        content: "https://stl-shelf.com/og-image.svg",
      },
    ],
    links: [{ rel: "canonical", href: "https://stl-shelf.com/" }],
  }),
});

function LandingPage() {
  const { pricing, session } = Route.useLoaderData();
  return (
    <>
      <Navigation session={session} />
      <main className="min-h-screen">
        <HeroSection />
        <TextRevealSection />
        <Features />
        <HowItWorks />
        <UseCases />
        <Resources />
        <Pricing pricing={pricing} />
        <Testimonials />
        <FAQ />
        <FinalCTA />
        <Footer />
      </main>
    </>
  );
}
