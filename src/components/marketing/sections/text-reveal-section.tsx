"use client";

import { TextReveal } from "@/components/marketing/magicui/text-reveal";

export function TextRevealSection() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Technical grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <TextReveal
            text="Stop losing track of your 3D printing files. STL Shelf is a private 3D model library for makers, design iterators, digital hoarders, and small print farms that need tags, version history, and browser preview instead of folder chaos."
            className="text-center"
          />
        </div>
      </div>
    </section>
  );
}
