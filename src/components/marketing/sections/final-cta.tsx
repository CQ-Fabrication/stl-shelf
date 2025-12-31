'use client'

import { ArrowRight, Github } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Particles } from '@/components/ui/particles'
import { AuroraText } from '@/components/marketing/magicui/aurora-text'

export function FinalCTA() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Particle background - same as hero for visual continuity */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <Particles
          className="absolute inset-0"
          quantity={80}
          ease={80}
          color="#000000"
          refresh
        />
      </div>

      {/* Isometric grid overlay - matching hero */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(30deg, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(150deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Small label */}
          <div
            className="animate-fade-in-up flex justify-center"
            style={{ animationDelay: '0.1s' }}
          >
            <span className="text-sm font-medium text-muted-foreground tracking-wider uppercase">
              Start Your Journey
            </span>
          </div>

          {/* Main headline with AuroraText */}
          <h2
            className="animate-fade-in-up text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight"
            style={{ animationDelay: '0.2s' }}
          >
            Ready to Organize Your{' '}
            <AuroraText className="font-bold">Collection?</AuroraText>
          </h2>

          {/* Subtext */}
          <p
            className="animate-fade-in-up text-lg md:text-xl text-muted-foreground max-w-xl mx-auto"
            style={{ animationDelay: '0.3s' }}
          >
            Start managing your 3D model library today.
            <br />
            Free to try. No credit card required.
          </p>

          {/* CTA Buttons */}
          <div
            className="animate-fade-in-up flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            style={{ animationDelay: '0.4s' }}
          >
            <Link to="/signup">
              <ShimmerButton className="shadow-2xl">
                <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white lg:text-lg flex items-center gap-2">
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </span>
              </ShimmerButton>
            </Link>

            <Button variant="outline" size="lg" asChild>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
