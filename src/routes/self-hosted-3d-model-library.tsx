import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Navigation } from "@/components/marketing/navigation";
import { Footer } from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";
import { siteUrl } from "@/lib/site";
import { getSessionFn } from "@/server/functions/auth";

const prerequisites = [
  "PostgreSQL",
  "S3-compatible storage",
  "Resend",
  "Cloudflare Turnstile",
  "OpenPanel",
  "Polar",
] as const;

const deploymentFlow = [
  "Clone the repository.",
  "Provision the required services.",
  "Set the environment variables.",
  "Run the app.",
] as const;

const serviceResponsibilities = [
  "PostgreSQL stores users, organizations, metadata, tags, and version history.",
  "S3-compatible storage stores uploaded files and downloads.",
  "Resend handles email verification, magic links, password reset, and invitation emails.",
  "Cloudflare Turnstile protects signup and auth flows with CAPTCHA.",
  "OpenPanel powers analytics and event tracking.",
  "Polar powers billing, subscriptions, checkout, and customer portal flows.",
] as const;

export const Route = createFileRoute("/self-hosted-3d-model-library")({
  component: SelfHostedLibraryPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () => ({
    meta: [
      { title: "Self-Host STL Shelf" },
      {
        name: "robots",
        content: "index, follow",
      },
      {
        name: "description",
        content:
          "Self-host STL Shelf on your own infrastructure with PostgreSQL, S3-compatible storage, Resend, Cloudflare Turnstile, OpenPanel, and Polar.",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: siteUrl("/self-hosted-3d-model-library"),
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
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-500">
                Self-hosting
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
                Self-host STL Shelf
              </h1>
              <p className="mt-6 max-w-3xl text-lg text-muted-foreground">
                STL Shelf can run on your own infrastructure. A supported self-hosted deployment
                requires the same core services used by the hosted app.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold md:text-3xl">Prerequisites</h2>
              <ul className="mt-6 space-y-3 text-muted-foreground">
                {prerequisites.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-border/60 bg-card/80 px-5 py-4"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold md:text-3xl">Deployment flow</h2>
              <ol className="mt-6 space-y-4">
                {deploymentFlow.map((step, index) => (
                  <li
                    key={step}
                    className="rounded-2xl border border-border/60 bg-card/80 px-5 py-4 text-muted-foreground"
                  >
                    <span className="mr-3 font-medium text-foreground">{index + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold md:text-3xl">What each service does</h2>
              <ul className="mt-6 space-y-4 text-muted-foreground">
                {serviceResponsibilities.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-border/60 bg-card/80 px-5 py-4"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold md:text-3xl">Need the full setup?</h2>
              <p className="mt-4 text-muted-foreground">
                Use the repository as the source of truth for the complete setup.
              </p>
              <div className="mt-8">
                <Button size="lg" variant="outline" asChild>
                  <a
                    href="https://github.com/CQ-Fabrication/stl-shelf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on GitHub
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
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
