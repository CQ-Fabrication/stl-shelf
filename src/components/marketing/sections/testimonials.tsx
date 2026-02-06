"use client";

import { MessageSquareQuote } from "lucide-react";
import { TestimonialCard } from "./testimonial-card";
import { testimonials } from "./testimonials.data";

export function Testimonials() {
  return (
    <section className="relative overflow-hidden bg-muted/30 py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 23px,
            rgba(249, 115, 22, 1) 23px,
            rgba(249, 115, 22, 1) 24px
          )`,
        }}
      />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto mb-14 max-w-3xl text-center animate-fade-in-up">
          <span className="mb-4 inline-flex items-center gap-2 text-sm font-mono font-medium uppercase tracking-wider text-orange-500">
            <MessageSquareQuote className="h-4 w-4" />
            Testimonials
          </span>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Things People Definitely <span className="text-orange-500">Didn't Say</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Quotes from the alternate timeline where file naming chaos finally ends.
          </p>
          <p className="mt-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
            Satirical, fictional testimonials. No endorsements.
          </p>
        </div>

        <div className="mx-auto max-w-6xl columns-1 gap-6 md:columns-2">
          {testimonials.map((item, index) => (
            <TestimonialCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
