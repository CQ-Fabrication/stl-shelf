import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <header className="mb-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight">STL Shelf</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Organize your 3D printing library with ease
        </p>
      </header>

      <main className="grid gap-12">
        <section className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold">
            The modern way to manage your 3D models
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            STL Shelf helps you organize, version, and share your 3D printable
            models with a clean, intuitive interface.
          </p>
        </section>

        <section className="grid gap-8 md:grid-cols-3">
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
        </section>
      </main>
    </div>
  );
}
