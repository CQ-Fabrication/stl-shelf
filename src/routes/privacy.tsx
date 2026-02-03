import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import Markdown from "react-markdown";
import { Navigation } from "@/components/marketing/navigation";
import { Footer } from "@/components/marketing/sections";
import { getDocumentByTypeFn } from "@/server/functions/consent";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy - STL Shelf" },
      {
        name: "description",
        content: "Privacy policy for STL Shelf - how we handle your data.",
      },
      {
        property: "og:title",
        content: "STL Shelf Privacy Policy",
      },
      {
        property: "og:description",
        content: "Privacy policy for STL Shelf - how we handle your data.",
      },
      {
        property: "og:image",
        content: "https://stl-shelf.com/og-image.svg",
      },
      {
        property: "og:url",
        content: "https://stl-shelf.com/privacy",
      },
      {
        property: "og:type",
        content: "article",
      },
      {
        name: "twitter:title",
        content: "STL Shelf Privacy Policy",
      },
      {
        name: "twitter:description",
        content: "Privacy policy for STL Shelf - how we handle your data.",
      },
      {
        name: "twitter:image",
        content: "https://stl-shelf.com/og-image.svg",
      },
    ],
    links: [{ rel: "canonical", href: "https://stl-shelf.com/privacy" }],
  }),
});

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function PrivacyPage() {
  const { data: document } = useSuspenseQuery({
    queryKey: ["legal-document", "privacy_policy"],
    queryFn: () => getDocumentByTypeFn({ data: { type: "privacy_policy" } }),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1 pt-24">
        {/* Hero */}
        <section className="relative py-16 overflow-hidden">
          {/* Isometric grid */}
          <div
            className="pointer-events-none absolute inset-0 z-[1] opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(30deg, hsl(var(--foreground)) 1px, transparent 1px),
                linear-gradient(150deg, hsl(var(--foreground)) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />

          <div className="container mx-auto px-4 relative z-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>

            <div className="max-w-3xl">
              <div className="animate-fade-in-up">
                <span className="inline-flex items-center gap-2 text-sm font-mono font-medium text-orange-500 mb-4 tracking-wider uppercase">
                  <span className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500/50" />
                  Legal
                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500/50" />
                </span>
              </div>

              <h1
                className="animate-fade-in-up text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
                style={{ animationDelay: "0.1s" }}
              >
                Privacy <span className="text-orange-500">Policy</span>
              </h1>

              <p
                className="animate-fade-in-up text-muted-foreground"
                style={{ animationDelay: "0.2s" }}
              >
                {document?.publishedAt
                  ? `Last updated: ${formatDate(document.publishedAt)}`
                  : "Loading..."}
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-p:text-muted-foreground prose-li:text-muted-foreground">
              <Markdown>{document!.content}</Markdown>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
