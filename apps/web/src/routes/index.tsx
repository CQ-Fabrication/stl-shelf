import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/hero";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <>
      <Hero />

      {/* Placeholder for future sections */}
      <section id="features" className="container mx-auto px-4 py-24">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-xl font-semibold">Organized Library</h3>
            <p className="mt-2 text-muted-foreground">
              Keep all your STL, OBJ, and 3MF files in one place
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-xl font-semibold">Version Control</h3>
            <p className="mt-2 text-muted-foreground">
              Track changes and iterations of your 3D models
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-xl font-semibold">Self-Hosted</h3>
            <p className="mt-2 text-muted-foreground">
              Complete control over your data and privacy
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
