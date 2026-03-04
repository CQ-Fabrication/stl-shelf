import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Navigation } from "@/components/marketing/navigation";
import { Footer } from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import type { AuthClient } from "@/lib/auth-client";
import { OG_IMAGE_URL, siteUrl } from "@/lib/site";
import type { GuideFaq, GuidePageData } from "./guides-data";

type Session = AuthClient["$Infer"]["Session"];

type HeadInput = {
  path: string;
  title: string;
  description: string;
  faqs?: readonly GuideFaq[];
};

export function createMarketingHead({ path, title, description, faqs }: HeadInput) {
  const fullUrl = siteUrl(path);
  const meta: Array<Record<string, unknown>> = [
    { title },
    {
      name: "robots",
      content: "index, follow",
    },
    {
      name: "description",
      content: description,
    },
    {
      property: "og:title",
      content: title,
    },
    {
      property: "og:description",
      content: description,
    },
    {
      property: "og:image",
      content: OG_IMAGE_URL,
    },
    {
      property: "og:url",
      content: fullUrl,
    },
    {
      property: "og:type",
      content: "website",
    },
    {
      name: "twitter:title",
      content: title,
    },
    {
      name: "twitter:description",
      content: description,
    },
    {
      name: "twitter:image",
      content: OG_IMAGE_URL,
    },
  ];

  if (faqs && faqs.length > 0) {
    meta.push({
      "script:ld+json": {
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
      },
    });
  }

  return {
    meta,
    links: [
      {
        rel: "canonical",
        href: fullUrl,
      },
    ],
  };
}

type GuidePageProps = {
  guide: GuidePageData;
  session?: Session | null;
};

export function GuidePage({ guide, session }: GuidePageProps) {
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
                Guide
              </div>
              <h1 className="mt-6 text-4xl md:text-5xl font-bold tracking-tight">{guide.h1}</h1>
              <p className="mt-6 text-lg text-muted-foreground">{guide.intro}</p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">The problem</h2>
              <div className="space-y-4 text-muted-foreground">
                {guide.problem.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-8">Simple workflow</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {guide.steps.map((step, index) => (
                  <div
                    key={step.title}
                    className="rounded-xl border border-border/50 bg-card/80 p-6"
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

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">What STL Shelf is / is not</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-border/50 bg-card/80 p-6">
                  <h3 className="text-lg font-semibold">STL Shelf is</h3>
                  <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                    {guide.isItems.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-orange-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/80 p-6">
                  <h3 className="text-lg font-semibold">STL Shelf is not</h3>
                  <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                    {guide.isNotItems.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-orange-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-8">FAQ</h2>
              <div className="space-y-4">
                {guide.faqs.map((faq) => (
                  <details
                    key={faq.question}
                    className="rounded-xl border border-border/50 bg-card/80 p-5"
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
            <div className="max-w-3xl mx-auto rounded-2xl border border-border/50 bg-card/80 p-8 text-center md:p-10">
              <h2 className="text-3xl md:text-4xl font-bold">{guide.ctaTitle}</h2>
              <p className="mt-4 text-muted-foreground">{guide.ctaDescription}</p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup">
                  <ShimmerButton className="shadow-2xl">
                    <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white lg:text-lg flex items-center gap-2">
                      Start Free <ArrowRight className="w-4 h-4" />
                    </span>
                  </ShimmerButton>
                </Link>
                <Button variant="outline" size="lg" asChild>
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
