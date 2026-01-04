"use client";

import { Factory, Lightbulb, Palette, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Testimonial = {
  quote: string;
  author: string;
  role: string;
  roleKey: "hobbyist" | "designer" | "farmOwner";
  initials: string;
  rating: number;
  verified: boolean;
};

const testimonials: Testimonial[] = [
  {
    quote:
      "Finally, a way to organize my 5,000+ STL files. I can actually find what I'm looking for now.",
    author: "Alex Chen",
    role: "Hobbyist Maker",
    roleKey: "hobbyist",
    initials: "AC",
    rating: 5,
    verified: true,
  },
  {
    quote:
      'The version control feature alone is worth it. No more "benchy_v2_final_FINAL.stl" nightmare.',
    author: "Sarah Martinez",
    role: "Product Designer",
    roleKey: "designer",
    initials: "SM",
    rating: 5,
    verified: true,
  },
  {
    quote: "Self-hosting means my designs stay mine. Plus the 3D preview is incredibly fast.",
    author: "Mike Johnson",
    role: "Print Farm Owner",
    roleKey: "farmOwner",
    initials: "MJ",
    rating: 5,
    verified: true,
  },
];

const roleStyles: Record<
  Testimonial["roleKey"],
  {
    icon: LucideIcon;
    borderColor: string;
    bgColor: string;
    textColor: string;
    glowColor: string;
    ringColor: string;
  }
> = {
  hobbyist: {
    icon: Lightbulb,
    borderColor: "border-yellow-500/40",
    bgColor: "bg-yellow-500/10",
    textColor: "text-yellow-500",
    glowColor: "group-hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]",
    ringColor: "rgba(234, 179, 8, 0.4)",
  },
  designer: {
    icon: Palette,
    borderColor: "border-purple-500/40",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-500",
    glowColor: "group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]",
    ringColor: "rgba(168, 85, 247, 0.4)",
  },
  farmOwner: {
    icon: Factory,
    borderColor: "border-orange-500/40",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-500",
    glowColor: "group-hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]",
    ringColor: "rgba(249, 115, 22, 0.4)",
  },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating ? "text-orange-500 fill-orange-500" : "text-slate-600 fill-slate-600/20"
          } ${i < rating ? "animate-star-shimmer" : ""}`}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

function DecorativeQuote() {
  return (
    <svg
      viewBox="0 0 100 80"
      className="absolute top-2 right-2 h-16 w-20 opacity-[0.08] animate-quote-float"
    >
      <defs>
        <linearGradient id="quoteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(249, 115, 22)" />
          <stop offset="100%" stopColor="rgb(234, 179, 8)" />
        </linearGradient>
      </defs>
      <text
        x="50"
        y="65"
        textAnchor="middle"
        fontSize="80"
        fontFamily="Georgia, serif"
        fill="url(#quoteGrad)"
      >
        "
      </text>
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3 text-emerald-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-[9px] font-mono text-emerald-400">Verified</span>
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="relative py-24 overflow-hidden bg-muted/30">
      {/* Blueprint grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(249, 115, 22, 1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Corner markers */}
      <div className="absolute top-8 left-8 w-10 h-10 border-l-2 border-t-2 border-orange-500/15" />
      <div className="absolute top-8 right-8 w-10 h-10 border-r-2 border-t-2 border-orange-500/15" />
      <div className="absolute bottom-8 left-8 w-10 h-10 border-l-2 border-b-2 border-orange-500/15" />
      <div className="absolute bottom-8 right-8 w-10 h-10 border-r-2 border-b-2 border-orange-500/15" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="animate-fade-in-up text-center mb-16">
          <span className="inline-flex items-center gap-2 text-sm font-mono font-medium text-orange-500 mb-4 tracking-wider uppercase">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500/50" />
            Testimonials
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500/50" />
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            Loved by <span className="text-orange-500">Makers</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => {
            const style = roleStyles[testimonial.roleKey];
            const RoleIcon = style.icon;
            return (
              <div
                key={testimonial.author}
                className="animate-fade-in-up relative group"
                style={{ animationDelay: `${0.1 + index * 0.15}s` }}
              >
                <div
                  className={`relative h-full p-6 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-500 hover:border-orange-500/30 ${style.glowColor} overflow-hidden`}
                >
                  {/* Decorative quote mark */}
                  <DecorativeQuote />

                  {/* Star rating */}
                  <div className="relative z-10 mb-4">
                    <StarRating rating={testimonial.rating} />
                  </div>

                  {/* Quote */}
                  <p className="text-foreground mb-6 leading-relaxed relative z-10 text-[15px]">
                    "{testimonial.quote}"
                  </p>

                  {/* Author section */}
                  <div className="relative z-10 flex items-start gap-3">
                    {/* Avatar with pulse ring */}
                    <div className="relative">
                      <div
                        className={`w-11 h-11 rounded-full ${style.bgColor} ${style.borderColor} border-2 flex items-center justify-center transition-all duration-300`}
                      >
                        <span className={`text-sm font-bold ${style.textColor}`}>
                          {testimonial.initials}
                        </span>
                      </div>
                      {/* Pulse ring on hover - uses scale transform for smooth GPU animation */}
                      <div
                        className={`absolute inset-0 rounded-full border-2 ${style.borderColor} opacity-0 group-hover:animate-avatar-ring pointer-events-none`}
                      />
                    </div>

                    {/* Author info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm mb-0.5">{testimonial.author}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                        <RoleIcon className={`h-3 w-3 ${style.textColor}`} />
                        <span>{testimonial.role}</span>
                      </div>
                      {testimonial.verified && <VerifiedBadge />}
                    </div>
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-orange-500/40 transition-all duration-500" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust indicator */}
        <div className="mt-12 text-center animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex -space-x-2">
              {testimonials.map((t, i) => (
                <div
                  key={t.initials}
                  className={`w-7 h-7 rounded-full ${roleStyles[t.roleKey].bgColor} ${roleStyles[t.roleKey].borderColor} border-2 flex items-center justify-center text-[10px] font-bold ${roleStyles[t.roleKey].textColor}`}
                  style={{ zIndex: 3 - i }}
                >
                  {t.initials}
                </div>
              ))}
            </div>
            <div className="h-4 w-px bg-border/50" />
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">Trusted by</span>
              <span className="text-sm font-semibold text-orange-500">500+ makers</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes star-shimmer {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes quote-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(2deg); }
        }
        @keyframes avatar-ring {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
        .animate-star-shimmer { animation: star-shimmer 2s ease-in-out infinite; }
        .animate-quote-float { animation: quote-float 4s ease-in-out infinite; }
        .animate-avatar-ring { animation: avatar-ring 1s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      `}</style>
    </section>
  );
}
