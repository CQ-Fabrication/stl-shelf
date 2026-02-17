import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Database, HardDrive, Server } from "lucide-react";
import { Navigation } from "@/components/marketing/navigation";
import { Footer } from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { getSessionFn } from "@/server/functions/auth";

const pillars = [
  {
    title: "Docker-only",
    description: "Run the app, database, and storage in containers for a clean stack.",
    icon: Server,
  },
  {
    title: "PostgreSQL required",
    description: "Reliable metadata and version history with a real database.",
    icon: Database,
  },
  {
    title: "Your files stay local",
    description: "No sharing or social. Keep everything on your own server.",
    icon: HardDrive,
  },
];

const requirements = [
  "Docker and Docker Compose",
  "PostgreSQL database (container or external)",
  "S3-compatible storage (MinIO, R2, S3)",
];

const faqs = [
  {
    question: "Can I self-host without Docker?",
    answer:
      "No. STL Shelf is designed to run via Docker to support PostgreSQL and future Redis requirements.",
  },
  {
    question: "Does self-hosting include sharing or public links?",
    answer: "No. STL Shelf is a private archive for your files only.",
  },
  {
    question: "Can I import from other services?",
    answer: "No. You upload and manage your own files only.",
  },
  {
    question: "Which file types are supported?",
    answer: "STL, 3MF, OBJ, and PLY are supported.",
  },
];

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export const Route = createFileRoute("/self-hosted-3d-model-library")({
  component: SelfHostedLibraryPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => ({
    meta: [
      { title: "Self-Hosted 3D Model Library - STL Shelf" },
      {
        name: "robots",
        content: "index, follow",
      },
      {
        name: "description",
        content:
          "Self-host STL Shelf with Docker and PostgreSQL. Keep STL, 3MF, OBJ, and PLY files on your server with a private 3D model library.",
      },
      {
        "script:ld+json": faqStructuredData,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://stl-shelf.com/self-hosted-3d-model-library",
      },
    ],
  }),
});

function SelfHostedLibraryPage() {
  const { session } = Route.useLoaderData();
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation session={session} />
      <main className="flex-1 pt-20">
        <section className="relative overflow-hidden py-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(30deg, hsl(var(--foreground)) 1px, transparent 1px),
                linear-gradient(150deg, hsl(var(--foreground)) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />

          <div className="container relative mx-auto px-4">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-500">
                Docker-first
              </div>
              <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Self-hosted 3D model library for private archives
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Run STL Shelf on your own infrastructure with Docker. Keep your STL, 3MF, OBJ, and
                PLY files on your server with a clean, private library. No sharing, no social, no
                marketplace.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/signup">
                  <ShimmerButton className="shadow-2xl">
                    <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white lg:text-lg flex items-center gap-2">
                      Start Free <ArrowRight className="w-4 h-4" />
                    </span>
                  </ShimmerButton>
                </Link>
                <Button variant="outline" size="lg" asChild>
                  <a
                    href="https://github.com/CQ-Fabrication/stl-shelf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Docker Setup
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {pillars.map((item, index) => (
                <div
                  key={item.title}
                  className="animate-fade-in-up rounded-xl border border-border/50 bg-card/80 p-6"
                  style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">Requirements</h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {requirements.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-orange-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">What you get</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  "A private 3D model library with searchable metadata",
                  "Fast 3D previews for quick validation",
                  "Version history for every model iteration",
                  "Tags and categories to keep projects clean",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-border/50 bg-card/80 p-6 text-sm text-muted-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-8">FAQ</h2>
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <details
                    key={faq.question}
                    className="rounded-xl border border-border/50 bg-card/70 p-5"
                  >
                    <summary className="cursor-pointer font-medium">{faq.question}</summary>
                    <p className="mt-3 text-sm text-muted-foreground">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold">Run your own 3D model library</h2>
              <p className="mt-4 text-muted-foreground">
                Docker-first, private, and built for your personal archive.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup">
                  <ShimmerButton className="shadow-2xl">
                    <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white lg:text-lg flex items-center gap-2">
                      Get Started <ArrowRight className="w-4 h-4" />
                    </span>
                  </ShimmerButton>
                </Link>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/organize-stl-files">Organize STL Files</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
