import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, CircleHelp } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Navigation } from "@/components/marketing/navigation";
import { Footer } from "@/components/marketing/sections";
import { marketingFaqs } from "@/components/marketing/sections/faq.data";
import type { AuthClient } from "@/lib/auth-client";
import { siteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getSessionFn } from "@/server/functions/auth";

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

export const Route = createFileRoute("/faqs")({
  component: FaqsPage,
  validateSearch: z.object({
    item: z.string().optional(),
  }),
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => ({
    meta: [
      { title: "FAQs - STL Shelf" },
      {
        name: "robots",
        content: "index, follow",
      },
      {
        name: "description",
        content:
          "Frequently asked questions about STL Shelf, including self-hosting prerequisites, pricing limits, and product positioning.",
      },
      {
        "script:ld+json": faqStructuredData,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: siteUrl("/faqs"),
      },
    ],
  }),
});

function FaqsPage() {
  const { session } = Route.useLoaderData();
  const { item } = Route.useSearch();

  return (
    <FaqsPageContent
      initialItem={item && marketingFaqs.some((faq) => faq.id === item) ? item : undefined}
      key={item ?? "all"}
      session={session}
    />
  );
}

function FaqsPageContent({
  initialItem,
  session,
}: {
  initialItem?: string;
  session?: AuthClient["$Infer"]["Session"] | null;
}) {
  const [openItem, setOpenItem] = useState<string | null>(initialItem ?? null);

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
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-500">
                <CircleHelp className="h-4 w-4" />
                FAQs
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
                Frequently asked questions
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Clear answers about STL Shelf, including self-hosting prerequisites, cloud limits,
                and how the product is positioned.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl space-y-4">
              {marketingFaqs.map((faq) => {
                const isOpen = openItem === faq.id;

                return (
                  <div
                    className="rounded-2xl border border-border/60 bg-card/80"
                    id={faq.id}
                    key={faq.id}
                  >
                    <button
                      aria-controls={`${faq.id}-content`}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                      onClick={() => setOpenItem((current) => (current === faq.id ? null : faq.id))}
                      type="button"
                    >
                      <span className="font-semibold text-lg leading-tight">{faq.question}</span>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>
                    {isOpen ? (
                      <div
                        className="border-border/60 border-t px-6 py-5 text-sm leading-relaxed text-muted-foreground"
                        id={`${faq.id}-content`}
                      >
                        {faq.answer}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
