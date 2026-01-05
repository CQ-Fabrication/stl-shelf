"use client";

import { ArrowRight, Box, Download } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AuroraText } from "@/components/marketing/magicui/aurora-text";
import { NumberTicker } from "@/components/marketing/magicui/number-ticker";
import { HeroBackground } from "@/components/marketing/hero-background";

const stats = [
  { value: 10000, suffix: "+", label: "Models Organized" },
  { value: 5, suffix: "", label: "File Formats" },
  { value: 100, suffix: "%", label: "Your Data" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <HeroBackground />

      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(30deg, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(150deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container mx-auto px-4 py-32 relative z-10">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="animate-fade-in-up flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
              <Box className="h-3.5 w-3.5" />
              <span>3D Model Library for Makers</span>
            </div>
          </div>

          <h1 className="animate-fade-in-up text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight">
            Organize Your <AuroraText className="font-bold">3D Printing</AuroraText> Library
          </h1>

          <p className="animate-fade-in-up text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Manage your personal collection of 3D printable models with version control, preview,
            and smart organization. Use our cloud or self-host for complete data ownership.
          </p>

          <div className="animate-fade-in-up flex flex-wrap justify-center gap-2 pt-2">
            {["STL", "OBJ", "3MF", "PLY", "GCODE"].map((format) => (
              <span
                key={format}
                className="inline-flex items-center rounded-md border border-border/50 bg-muted/50 px-3 py-1 font-mono text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/30 hover:text-foreground"
              >
                .{format.toLowerCase()}
              </span>
            ))}
          </div>

          <div className="animate-fade-in-up flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link to="/signup">
              <ShimmerButton className="shadow-2xl">
                <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white lg:text-lg flex items-center gap-2">
                  Get Started <ArrowRight className="w-4 h-4" />
                </span>
              </ShimmerButton>
            </Link>

            <Button variant="outline" size="lg" asChild>
              <a href="#features" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Learn More
              </a>
            </Button>
          </div>

          <div className="animate-fade-in-up grid grid-cols-3 gap-8 pt-16 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground">
                  <NumberTicker value={stat.value} suffix={stat.suffix} delay={0.5 + index * 0.2} />
                </div>
                <div className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="animate-fade-in pt-12 opacity-50">
            <div className="animate-bounce w-6 h-10 border-2 border-muted-foreground rounded-full mx-auto flex items-start justify-center p-2">
              <div className="w-1 h-2 bg-muted-foreground rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
