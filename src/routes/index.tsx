import { createFileRoute } from "@tanstack/react-router";
import { Navigation } from "@/components/marketing/navigation";
import {
  HeroSection,
  SemanticOverview,
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
import { createJsonLdHeadScript } from "@/lib/seo/json-ld";
import { OG_IMAGE_URL, siteUrl } from "@/lib/site";
import { getPublicPricing } from "@/server/functions/pricing";
import { getSessionFn } from "@/server/functions/auth";

const homeTitle = "Private 3D Model Library Software for STL Files | STL Shelf";
const homeDescription =
  "Private 3D model library software for organizing, cataloging, versioning, and managing STL, 3MF, OBJ, and PLY files. Hosted by us or self-hosted because STL Shelf is open source.";

const softwareApplicationStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "STL Shelf",
  description:
    "Software for organizing, cataloging, versioning, and managing private 3D printing model libraries.",
  applicationCategory: "STL file management software",
  featureList: [
    "STL file organization",
    "3D print file library management",
    "tagging and categorization",
    "version history",
    "browser 3D preview",
    "open-source private archive",
    "self-hostable deployment",
    "hosted version managed by us",
  ],
  operatingSystem: "Web",
  url: siteUrl("/"),
};

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
        content: OG_IMAGE_URL,
      },
      {
        property: "og:url",
        content: siteUrl("/"),
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
        content: OG_IMAGE_URL,
      },
    ],
    scripts: [
      createJsonLdHeadScript(faqStructuredData),
      createJsonLdHeadScript(softwareApplicationStructuredData),
    ],
    links: [{ rel: "canonical", href: siteUrl("/") }],
  }),
});

function LandingPage() {
  const { pricing, session } = Route.useLoaderData();
  return (
    <>
      <Navigation session={session} />
      <main className="min-h-screen">
        <HeroSection />
        <SemanticOverview />
        <TextRevealSection />
        <Features />
        <HowItWorks />
        <UseCases />
        <Resources />
        <Testimonials />
        <FAQ />
        <Pricing pricing={pricing} />
        <FinalCTA />
        <Footer />
      </main>
    </>
  );
}
