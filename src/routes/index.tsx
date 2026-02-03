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
