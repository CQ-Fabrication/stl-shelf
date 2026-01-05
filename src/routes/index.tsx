import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/marketing/navigation";
import {
  HeroSection,
  TextRevealSection,
  Features,
  HowItWorks,
  UseCases,
  Pricing,
  Testimonials,
  FinalCTA,
  Footer,
} from "@/components/marketing/sections";

export const Route = createFileRoute("/")({
  component: LandingPage,
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
  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        <HeroSection />
        <TextRevealSection />
        <Features />
        <HowItWorks />
        <UseCases />
        <Pricing />
        <Testimonials />
        <FinalCTA />
        <Footer />
      </main>
    </>
  );
}
