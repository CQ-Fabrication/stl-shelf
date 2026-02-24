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
import { marketingFaqs } from "@/components/marketing/sections/faq.data";
import { getPublicPricing } from "@/server/functions/pricing";
import { getSessionFn } from "@/server/functions/auth";

const homeTitle = "STL Shelf - STL File Organizer & 3D Model Library";
const homeDescription =
  "STL file organizer and 3D model library for makers. Organize, tag, preview, and version STL, 3MF, OBJ, and PLY files in cloud or self-hosted mode.";

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: marketingFaqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

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
        title: homeTitle,
      },
      {
        name: "robots",
        content: "index, follow",
      },
      {
        name: "description",
        content: homeDescription,
      },
      {
        name: "keywords",
        content:
          "stl file organizer, stl file manager, 3d model library, stl management software, 3d printing file organization",
      },
      {
        property: "og:title",
        content: homeTitle,
      },
      {
        property: "og:description",
        content: homeDescription,
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
        content: homeTitle,
      },
      {
        name: "twitter:description",
        content: homeDescription,
      },
      {
        name: "twitter:image",
        content: "https://stl-shelf.com/og-image.svg",
      },
      {
        "script:ld+json": faqStructuredData,
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
