import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Navigation } from "@/components/marketing/navigation";
import { Footer } from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import type { AuthClient } from "@/lib/auth-client";
import { createJsonLdHeadScript } from "@/lib/seo/json-ld";
import { OG_IMAGE_URL, siteUrl } from "@/lib/site";

export type SeoPageLink = {
  href: `/${string}`;
  label: string;
};

export type SeoPageFaq = {
  question: string;
  answer: string;
};

export type SeoPageSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  ordered?: string[];
};

export type SeoPageStep = {
  title: string;
  description: string;
};

export type SeoPageData = {
  id: string;
  path: `/${string}`;
  group: "pillar" | "guide" | "comparison" | "open-source";
  groupLabel: string;
  listTitle: string;
  title: string;
  description: string;
  keywords: string[];
  eyebrow: string;
  h1: string;
  intro: string[];
  semanticStatements: string[];
  featureList: string[];
  workflowTitle: string;
  workflow: SeoPageStep[];
  sections: SeoPageSection[];
  faqs: SeoPageFaq[];
  internalLinks: SeoPageLink[];
  ctaTitle: string;
  ctaDescription: string;
};

type Session = AuthClient["$Infer"]["Session"];

export function createSeoPageHead(page: SeoPageData) {
  const fullUrl = siteUrl(page.path);

  return {
    meta: [
      { title: page.title },
      { name: "robots", content: "index, follow" },
      { name: "description", content: page.description },
      { name: "keywords", content: page.keywords.join(", ") },
      { property: "og:title", content: page.title },
      { property: "og:description", content: page.description },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:url", content: fullUrl },
      { property: "og:type", content: "article" },
      { name: "twitter:title", content: page.title },
      { name: "twitter:description", content: page.description },
      { name: "twitter:image", content: OG_IMAGE_URL },
    ],
    scripts: [
      createJsonLdHeadScript({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }),
    ],
    links: [{ rel: "canonical", href: fullUrl }],
  };
}

export function SeoPage({ page, session }: { page: SeoPageData; session?: Session | null }) {
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
            <div className="max-w-5xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-500">
                {page.eyebrow}
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">{page.h1}</h1>
              <div className="mt-6 space-y-4 text-lg text-muted-foreground">
                {page.intro.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-card/80 p-6">
                <h2 className="text-2xl font-bold">Category definition</h2>
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                  {page.semanticStatements.map((statement) => (
                    <li key={statement} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                      <span>{statement}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/80 p-6">
                <h2 className="text-2xl font-bold">STL Shelf helps you</h2>
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                  {page.featureList.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-3xl font-bold">{page.workflowTitle}</h2>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {page.workflow.map((step, index) => (
                  <article
                    key={step.title}
                    className="rounded-2xl border border-border/60 bg-card/80 p-6"
                  >
                    <div className="font-mono text-xs uppercase tracking-wide text-orange-500">
                      Step {index + 1}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl space-y-10">
              {page.sections.map((section) => (
                <article
                  key={section.title}
                  className="rounded-2xl border border-border/60 bg-card/80 p-6 md:p-8"
                >
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                  {section.paragraphs ? (
                    <div className="mt-4 space-y-4 text-muted-foreground">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  ) : null}
                  {section.bullets ? (
                    <ul className="mt-5 space-y-3 text-muted-foreground">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {section.ordered ? (
                    <ol className="mt-5 space-y-3 text-muted-foreground">
                      {section.ordered.map((item, index) => (
                        <li key={item} className="flex gap-3">
                          <span className="font-medium text-foreground">{index + 1}.</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-3xl font-bold">Frequently asked questions</h2>
              <div className="mt-8 space-y-4">
                {page.faqs.map((faq) => (
                  <details
                    key={faq.question}
                    className="rounded-2xl border border-border/60 bg-card/80 p-5"
                  >
                    <summary className="cursor-pointer font-semibold">{faq.question}</summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl rounded-2xl border border-border/60 bg-card/80 p-8">
              <h2 className="text-3xl font-bold">Related pages</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {page.internalLinks.map((link) => (
                  <a
                    className="group rounded-xl border border-border/60 bg-muted/30 p-4 transition-colors hover:border-orange-500/40"
                    href={link.href}
                    key={link.href}
                  >
                    <span className="flex items-center justify-between gap-4 font-medium">
                      {link.label}
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card/80 p-8 text-center md:p-10">
              <h2 className="text-3xl font-bold md:text-4xl">{page.ctaTitle}</h2>
              <p className="mt-4 text-muted-foreground">{page.ctaDescription}</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/signup">
                  <ShimmerButton className="shadow-2xl">
                    <span className="flex items-center gap-2 whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white lg:text-lg">
                      Start Free <ArrowRight className="h-4 w-4" />
                    </span>
                  </ShimmerButton>
                </Link>
                <Button asChild size="lg" variant="outline">
                  <Link to="/pricing">View Pricing</Link>
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
