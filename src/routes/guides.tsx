import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Navigation } from "@/components/marketing/navigation";
import { Footer } from "@/components/marketing/sections";
import { Button } from "@/components/ui/button";
import { createMarketingHead } from "@/components/marketing/guides/guide-page";
import { guideList } from "@/components/marketing/guides/guides-data";
import { getSessionFn } from "@/server/functions/auth";

const pageTitle = "Guides — Organize Your STL Library";
const pageDescription =
  "Practical STL Shelf guides to organize STL, 3MF, and OBJ files with tags, preview, and version history.";

export const Route = createFileRoute("/guides")({
  component: GuidesPage,
  loader: async () => {
    const session = await getSessionFn();
    return { session };
  },
  head: () =>
    createMarketingHead({
      path: "/guides",
      title: pageTitle,
      description: pageDescription,
    }),
});

function GuidesPage() {
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
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Guides — Organize Your STL Library
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Browse practical guides for organizing STL, 3MF, and OBJ files with a simple private
                library workflow.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <ul className="space-y-4">
                {guideList.map((guide) => (
                  <li key={guide.path}>
                    <Link
                      className="group flex items-start justify-between gap-4 rounded-xl border border-border/50 bg-card/80 p-6 transition-colors hover:border-orange-500/40"
                      to={guide.path}
                    >
                      <div>
                        <h2 className="text-xl font-semibold">{guide.listTitle}</h2>
                        <p className="mt-2 text-sm text-muted-foreground">{guide.description}</p>
                      </div>
                      <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold">Start organizing today</h2>
              <p className="mt-4 text-muted-foreground">
                Build a private model library that stays clean as your collection grows.
              </p>
              <div className="mt-8 flex items-center justify-center">
                <Button asChild size="lg">
                  <Link to="/signup">Create Free Account</Link>
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
