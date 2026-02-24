"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRight, CircleHelp } from "lucide-react";
import { marketingFaqs } from "@/components/marketing/sections/faq.data";

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
          {marketingFaqs.map((faq, index) => (
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
