"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRight, CircleHelp } from "lucide-react";

const faqs = [
  {
    question: "How do I organize STL, 3MF, and OBJ files without folder chaos?",
    answer:
      "Use STL Shelf as a searchable personal archive with tags, previews, and version history.",
    href: "/organize-stl-files",
    cta: "Read the organize guide",
  },
  {
    question: "Can I self-host STL Shelf with Docker?",
    answer:
      "Yes. STL Shelf can run in your own infrastructure with PostgreSQL and Docker for full data control.",
    href: "/self-hosted-3d-model-library",
    cta: "Read the self-hosted guide",
  },
  {
    question: "Should I choose cloud or self-hosted setup?",
    answer:
      "You can start in the cloud for speed or deploy self-hosted for maximum ownership and internal workflows.",
    href: "/pricing",
    cta: "Compare plans and setups",
  },
  {
    question: "Is STL Shelf a marketplace or social platform?",
    answer:
      "No. STL Shelf focuses on organizing your own 3D models, not importing, selling, or social sharing.",
    href: "/organize-stl-files",
    cta: "See how the library works",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative overflow-hidden py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "16px 16px",
        }}
      />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto mb-12 max-w-3xl text-center animate-fade-in-up">
          <span className="inline-flex items-center gap-2 text-sm font-mono font-medium text-orange-500 mb-4 tracking-wider uppercase">
            <CircleHelp className="h-4 w-4" />
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            Quick answers before you choose your setup
          </h2>
          <p className="mt-4 text-muted-foreground">
            Common questions with direct links to the in-depth pages.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          {faqs.map((faq, index) => (
            <div
              key={faq.question}
              className="animate-fade-in-up h-full rounded-2xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm transition-all duration-300 hover:border-orange-500/40 hover:shadow-[0_0_24px_rgba(249,115,22,0.12)] flex flex-col"
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <h3 className="text-lg font-semibold leading-tight">{faq.question}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
              <Link
                to={faq.href}
                className="mt-auto pt-5 inline-flex items-center gap-2 text-sm font-medium text-orange-500 transition-colors hover:text-orange-400"
              >
                {faq.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
