import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, FolderSearch, Layers, Tag } from "lucide-react";
import { Navigation } from "@/components/marketing/navigation";
import { Footer } from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { getSessionFn } from "@/server/functions/auth";

const highlights = [
  {
    title: "Searchable library",
    description: "Find any model by name, tag, or custom metadata in seconds.",
    icon: FolderSearch,
  },
  {
    title: "Version history",
    description: "Track iterations without the final_final_final file mess.",
    icon: Layers,
  },
  {
    title: "Tagging system",
    description: "Keep projects, parts, and kits organized with flexible tags.",
    icon: Tag,
  },
];

const steps = [
  {
    title: "Upload your files",
    description: "Drop in STL, 3MF, OBJ, or PLY files. Your archive stays yours.",
  },
  {
    title: "Organize with tags",
    description: "Group models by project, client, printer, or material.",
  },
  {
    title: "Preview and version",
    description: "See models in 3D and keep every iteration in one place.",
  },
];

const faqs = [
  {
    question: "Does STL Shelf import from Printables or Thingiverse?",
    answer: "No. STL Shelf does not import or sync from other services. You own what you upload.",
  },
  {
    question: "Is there sharing or social features?",
    answer: "No. STL Shelf is a private archive for your files only.",
  },
  {
    question: "Which file types are supported?",
    answer: "STL, 3MF, OBJ, and PLY are supported out of the box.",
  },
  {
    question: "Can I keep versions of the same model?",
    answer: "Yes. STL Shelf tracks versions so you can keep every iteration organized.",
  },
  {
    question: "Is this a marketplace?",
    answer: "No. STL Shelf is not a marketplace. It is your personal 3D model library.",
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

export const Route = createFileRoute("/organize-stl-files")({
  component: OrganizeStlFilesPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => ({
    meta: [
      { title: "Organize STL Files - STL Shelf" },
      {
        name: "description",
        content:
          "Organize STL, 3MF, OBJ, and PLY files in a searchable 3D model library. Tag, preview, and version your personal archive with STL Shelf.",
      },
      {
        "script:ld+json": faqStructuredData,
      },
    ],
    links: [{ rel: "canonical", href: "https://stl-shelf.com/organize-stl-files" }],
  }),
});

function OrganizeStlFilesPage() {
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
                STL File Organizer
              </div>
              <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Organize STL files without the folder chaos
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                STL Shelf is a personal 3D model library. Upload your STL, 3MF, OBJ, and PLY files,
                tag them, preview them in 3D, and keep every version in one private archive. No
                imports, no sharing, no marketplace.
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
                  <Link to="/self-hosted-3d-model-library">Self-host with Docker</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {highlights.map((item, index) => (
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
              <h2 className="text-2xl md:text-3xl font-bold mb-8">A simple workflow</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {steps.map((step, index) => (
                  <div
                    key={step.title}
                    className="rounded-xl border border-border/50 bg-card/70 p-6"
                    style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                  >
                    <div className="text-xs font-mono uppercase text-orange-500">
                      Step {index + 1}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">What STL Shelf is</h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {[
                  "A private archive for your 3D model files",
                  "A searchable library with tags and metadata",
                  "A versioned history of every iteration",
                  "A fast 3D preview for quick inspection",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-orange-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <h3 className="mt-10 text-xl font-semibold">What it is not</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {[
                  "No marketplace",
                  "No sharing or social feed",
                  "No import or sync from other services",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-orange-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
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
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to organize your personal STL archive?
              </h2>
              <p className="mt-4 text-muted-foreground">
                Keep your 3D model library clean, searchable, and versioned.
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
                  <Link to="/pricing">See Pricing</Link>
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
