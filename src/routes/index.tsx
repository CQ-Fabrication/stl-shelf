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
    ],
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
        <FinalCTA />
        <Footer />
      </main>
    </>
  );
}
