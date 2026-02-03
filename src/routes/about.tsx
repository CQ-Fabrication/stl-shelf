import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Box, Github, Heart, Mail, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/marketing/navigation";
import { Footer } from "@/components/marketing/sections";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About - STL Shelf" },
      {
        name: "description",
        content:
          "Learn about STL Shelf - 3D model library built by makers, for makers. Cloud or self-hosted.",
      },
      {
        property: "og:title",
        content: "About STL Shelf",
      },
      {
        property: "og:description",
        content:
          "Learn about STL Shelf - the 3D model library built by makers, for makers. Cloud or self-hosted.",
      },
      {
        property: "og:image",
        content: "https://stl-shelf.com/og-image.svg",
      },
      {
        property: "og:url",
        content: "https://stl-shelf.com/about",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:title",
        content: "About STL Shelf",
      },
      {
        name: "twitter:description",
        content:
          "Learn about STL Shelf - the 3D model library built by makers, for makers. Cloud or self-hosted.",
      },
      {
        name: "twitter:image",
        content: "https://stl-shelf.com/og-image.svg",
      },
    ],
    links: [{ rel: "canonical", href: "https://stl-shelf.com/about" }],
  }),
});

const values = [
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "Your data belongs to you. Self-host to keep full control, or trust our secure cloud infrastructure.",
  },
  {
    icon: Zap,
    title: "Built for Speed",
    description:
      "Lightning-fast 3D previews and instant search across thousands of models. No waiting around.",
  },
  {
    icon: Heart,
    title: "Made for Makers",
    description:
      "Built by makers, for makers. We understand the chaos of managing thousands of STL files.",
  },
];

function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1 pt-24">
        {/* Hero */}
        <section className="relative py-16 overflow-hidden">
          {/* Isometric grid */}
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
                  About
                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500/50" />
                </span>
              </div>

              <h1
                className="animate-fade-in-up text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
                style={{ animationDelay: "0.1s" }}
              >
                Organizing the World's <span className="text-orange-500">3D Models</span>
              </h1>

              <p
                className="animate-fade-in-up text-lg md:text-xl text-muted-foreground mb-8"
                style={{ animationDelay: "0.2s" }}
              >
                STL Shelf was born from frustration. After years of downloading models, buying
                bundles, and designing our own files, we ended up with thousands of STLs scattered
                across hard drives, cloud folders, and USB sticks. Sound familiar?
              </p>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Our Story</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We're makers just like you. We've felt the pain of searching through folders named
                "STLs", "Downloads", "Print Later", and "Definitely Print This Time" looking for
                that one perfect model.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                STL Shelf is our answer to the chaos. A solution that puts you in control of your 3D
                model library. Use our cloud for convenience, or self-host for complete data
                ownership. No vendor lock-in, and a free tier to get started.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Whether you're a hobbyist with a growing collection or a print farm managing
                thousands of production files, STL Shelf scales with you.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-12">What We Believe</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {values.map((value, index) => (
                <div
                  key={value.title}
                  className="animate-fade-in-up text-center p-6 rounded-xl border border-border/50 bg-card/50"
                  style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-orange-500/10 text-orange-500 mb-4">
                    <value.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Source */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <Box className="h-12 w-12 mx-auto mb-6 text-orange-500" />
              <h2 className="text-2xl font-bold mb-4">Open Source at Heart</h2>
              <p className="text-muted-foreground mb-8">
                STL Shelf is open source. You can self-host it, contribute to it, or just peek at
                the code to see how it works. We believe in transparency and community-driven
                development.
              </p>
              <Button variant="outline" size="lg" asChild>
                <a
                  href="https://github.com/CQ-Fabrication/stl-shelf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <Mail className="h-12 w-12 mx-auto mb-6 text-orange-500" />
              <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
              <p className="text-muted-foreground mb-8">
                Have questions, feedback, or just want to say hi? We'd love to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="default" size="lg" asChild>
                  <a href="mailto:hello@stl-shelf.com" className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    hello@stl-shelf.com
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="mailto:support@stl-shelf.com" className="inline-flex items-center gap-2">
                    Need help? support@stl-shelf.com
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
