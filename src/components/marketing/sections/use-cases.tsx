'use client'

import { Factory, Lightbulb, Palette, Users } from 'lucide-react'

const useCases = [
  {
    number: '01',
    icon: Lightbulb,
    title: 'Hobbyist Makers',
    description:
      'Personal library for your growing collection of STL files from Printables, Thingiverse, and your own designs.',
    visual: HobbyistVisual,
    accentColor: 'yellow',
    stat: '100+ models',
  },
  {
    number: '02',
    icon: Palette,
    title: 'Design Iterators',
    description:
      'Track every version of your designs. Compare iterations and never lose your progress.',
    visual: IteratorVisual,
    accentColor: 'purple',
    stat: 'v2.1 → v2.2',
  },
  {
    number: '03',
    icon: Factory,
    title: 'Small Print Farms',
    description:
      'Catalog your production models. Quick access to files when customers need reprints.',
    visual: PrintFarmVisual,
    accentColor: 'orange',
    stat: '24/7 access',
  },
  {
    number: '04',
    icon: Users,
    title: 'Digital Hoarders',
    description:
      'Finally tame your 10,000+ model collection. Search, tag, and organize like a pro.',
    visual: HoarderVisual,
    accentColor: 'emerald',
    stat: '10,000+',
  },
]

const accentColors = {
  yellow: {
    border: 'border-yellow-500/40',
    borderHover: 'hover:border-yellow-500/60',
    bg: 'bg-yellow-500/10',
    bgHover: 'group-hover:bg-yellow-500/20',
    text: 'text-yellow-500',
    textMuted: 'text-yellow-400/70',
    glow: 'group-hover:shadow-[0_0_30px_rgba(234,179,8,0.15)]',
    numberBg: 'text-yellow-500/[0.07] group-hover:text-yellow-500/[0.12]',
    badgeBg: 'bg-yellow-500/20',
    badgeBorder: 'border-yellow-500/30',
  },
  purple: {
    border: 'border-purple-500/40',
    borderHover: 'hover:border-purple-500/60',
    bg: 'bg-purple-500/10',
    bgHover: 'group-hover:bg-purple-500/20',
    text: 'text-purple-500',
    textMuted: 'text-purple-400/70',
    glow: 'group-hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]',
    numberBg: 'text-purple-500/[0.07] group-hover:text-purple-500/[0.12]',
    badgeBg: 'bg-purple-500/20',
    badgeBorder: 'border-purple-500/30',
  },
  orange: {
    border: 'border-orange-500/40',
    borderHover: 'hover:border-orange-500/60',
    bg: 'bg-orange-500/10',
    bgHover: 'group-hover:bg-orange-500/20',
    text: 'text-orange-500',
    textMuted: 'text-orange-400/70',
    glow: 'group-hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]',
    numberBg: 'text-orange-500/[0.07] group-hover:text-orange-500/[0.12]',
    badgeBg: 'bg-orange-500/20',
    badgeBorder: 'border-orange-500/30',
  },
  emerald: {
    border: 'border-emerald-500/40',
    borderHover: 'hover:border-emerald-500/60',
    bg: 'bg-emerald-500/10',
    bgHover: 'group-hover:bg-emerald-500/20',
    text: 'text-emerald-500',
    textMuted: 'text-emerald-400/70',
    glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]',
    numberBg: 'text-emerald-500/[0.07] group-hover:text-emerald-500/[0.12]',
    badgeBg: 'bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/30',
  },
}

function HobbyistVisual() {
  return (
    <div className="relative h-20 w-full flex items-center justify-center">
      {/* Floating favorite files */}
      <div className="relative w-24 h-16">
        {/* Main file */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-float-slow">
          <div className="relative">
            <div className="h-10 w-8 rounded border border-yellow-500/40 bg-gradient-to-b from-slate-700/60 to-slate-800/60 flex items-center justify-center">
              <span className="font-mono text-[7px] text-yellow-400/80">
                .stl
              </span>
            </div>
            {/* Heart favorite */}
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500/80 flex items-center justify-center animate-pulse-heart">
              <svg
                viewBox="0 0 24 24"
                className="h-2 w-2 text-white"
                fill="currentColor"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Secondary files */}
        <div
          className="absolute left-0 top-2 animate-float"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="h-7 w-6 rounded border border-orange-500/30 bg-slate-800/50 flex items-center justify-center opacity-70">
            <span className="font-mono text-[6px] text-orange-400/60">.3mf</span>
          </div>
        </div>
        <div
          className="absolute right-0 bottom-0 animate-float"
          style={{ animationDelay: '0.6s' }}
        >
          <div className="h-7 w-6 rounded border border-amber-500/30 bg-slate-800/50 flex items-center justify-center opacity-70">
            <span className="font-mono text-[6px] text-amber-400/60">.obj</span>
          </div>
        </div>

        {/* Star sparkles */}
        <svg
          className="absolute -top-1 right-2 h-3 w-3 text-yellow-400/60 animate-twinkle"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6z" />
        </svg>
      </div>
    </div>
  )
}

function IteratorVisual() {
  return (
    <div className="relative h-20 w-full flex items-center justify-center">
      {/* Version branch visualization */}
      <svg viewBox="0 0 80 50" className="h-16 w-20">
        {/* Main branch */}
        <line
          x1="10"
          y1="25"
          x2="70"
          y2="25"
          stroke="rgb(168, 85, 247)"
          strokeWidth="2"
          strokeOpacity="0.5"
        />

        {/* Branch off */}
        <path
          d="M 30 25 Q 40 25 45 15"
          fill="none"
          stroke="rgb(168, 85, 247)"
          strokeWidth="1.5"
          strokeOpacity="0.4"
          strokeDasharray="3 2"
        />

        {/* Merge back */}
        <path
          d="M 45 15 Q 50 15 55 25"
          fill="none"
          stroke="rgb(168, 85, 247)"
          strokeWidth="1.5"
          strokeOpacity="0.4"
          strokeDasharray="3 2"
        />

        {/* Version commits */}
        <g className="animate-pulse-commit">
          <circle cx="15" cy="25" r="4" fill="rgb(168, 85, 247)" fillOpacity="0.8" />
          <text
            x="15"
            y="38"
            fontSize="6"
            fill="rgb(148, 163, 184)"
            fontFamily="monospace"
            textAnchor="middle"
          >
            v1.0
          </text>
        </g>
        <g className="animate-pulse-commit" style={{ animationDelay: '0.2s' }}>
          <circle cx="30" cy="25" r="4" fill="rgb(168, 85, 247)" fillOpacity="0.6" />
        </g>
        <g className="animate-pulse-commit" style={{ animationDelay: '0.4s' }}>
          <circle cx="45" cy="15" r="3" fill="rgb(236, 72, 153)" fillOpacity="0.6" />
          <text
            x="45"
            y="8"
            fontSize="5"
            fill="rgb(148, 163, 184)"
            fontFamily="monospace"
            textAnchor="middle"
          >
            fix
          </text>
        </g>
        <g className="animate-pulse-commit" style={{ animationDelay: '0.6s' }}>
          <circle cx="55" cy="25" r="4" fill="rgb(168, 85, 247)" fillOpacity="0.7" />
        </g>
        <g className="animate-pulse-commit" style={{ animationDelay: '0.8s' }}>
          <circle
            cx="70"
            cy="25"
            r="5"
            fill="rgb(34, 197, 94)"
            fillOpacity="0.9"
            className="animate-glow-green"
          />
          <text
            x="70"
            y="38"
            fontSize="6"
            fill="rgb(148, 163, 184)"
            fontFamily="monospace"
            textAnchor="middle"
          >
            v2.0
          </text>
        </g>
      </svg>
    </div>
  )
}

function PrintFarmVisual() {
  return (
    <div className="relative h-20 w-full flex items-center justify-center">
      {/* Mini printer farm */}
      <div className="flex items-end gap-2">
        {[
          { status: 'printing', progress: 75 },
          { status: 'printing', progress: 30 },
          { status: 'idle', progress: 0 },
        ].map((printer, i) => (
          <div
            key={i}
            className="relative"
            style={{ animationDelay: `${i * 0.2}s` }}
          >
            {/* Printer body */}
            <div className="h-10 w-8 rounded border border-slate-600/50 bg-gradient-to-b from-slate-700/60 to-slate-800/80">
              {/* Build plate */}
              <div className="absolute bottom-1 left-1 right-1 h-1 bg-slate-600/50 rounded-sm" />

              {/* Print head */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-3 h-1 bg-slate-500/60 rounded-sm transition-all"
                style={{
                  top:
                    printer.status === 'printing'
                      ? `${100 - printer.progress}%`
                      : '20%',
                }}
              />

              {/* Status LED */}
              <div
                className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${
                  printer.status === 'printing'
                    ? 'bg-emerald-500 shadow-[0_0_4px_rgba(34,197,94,0.8)] animate-blink'
                    : 'bg-orange-500/60'
                }`}
              />
            </div>

            {/* Progress indicator */}
            {printer.status === 'printing' && (
              <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500/80 rounded-full animate-progress"
                  style={{ width: `${printer.progress}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Production stats badge */}
      <div className="absolute -top-1 right-2 px-1.5 py-0.5 rounded text-[7px] font-mono bg-orange-500/20 text-orange-400 border border-orange-500/30">
        3 units
      </div>
    </div>
  )
}

function HoarderVisual() {
  return (
    <div className="relative h-20 w-full flex items-center justify-center">
      {/* Towering stack of folders */}
      <div className="relative">
        {/* Folder stack */}
        <div className="relative">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute animate-stack-float"
              style={{
                bottom: `${i * 6}px`,
                left: `${i * 2}px`,
                zIndex: 5 - i,
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <div
                className={`h-5 w-10 rounded-t-sm rounded-b border ${
                  i === 4
                    ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-500/30 to-emerald-500/20'
                    : 'border-slate-600/40 bg-gradient-to-b from-slate-700/40 to-slate-800/40'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Search magnifier */}
        <div className="absolute -right-6 top-0 animate-search-bounce">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-400/80">
            <circle
              cx="10"
              cy="10"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="14"
              y1="14"
              x2="20"
              y2="20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Highlight effect */}
            <circle cx="10" cy="10" r="3" fill="rgba(16, 185, 129, 0.2)" />
          </svg>
        </div>

        {/* Count badge */}
        <div className="absolute -top-3 -right-2 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
          10K+
        </div>

        {/* Scattered small files */}
        <div className="absolute -left-4 bottom-2 h-3 w-2 rounded-sm border border-slate-600/30 bg-slate-700/30 rotate-12 opacity-50" />
        <div className="absolute -left-2 -bottom-1 h-2 w-3 rounded-sm border border-slate-600/30 bg-slate-700/30 -rotate-6 opacity-40" />
      </div>
    </div>
  )
}

export function UseCases() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Technical blueprint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(249, 115, 22, 1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 1) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Corner markers - blueprint style */}
      <div className="absolute top-8 left-8 w-10 h-10 border-l-2 border-t-2 border-orange-500/15" />
      <div className="absolute top-8 right-8 w-10 h-10 border-r-2 border-t-2 border-orange-500/15" />
      <div className="absolute bottom-8 left-8 w-10 h-10 border-l-2 border-b-2 border-orange-500/15" />
      <div className="absolute bottom-8 right-8 w-10 h-10 border-r-2 border-b-2 border-orange-500/15" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="animate-fade-in-up text-center mb-16">
          <span className="inline-flex items-center gap-2 text-sm font-mono font-medium text-orange-500 mb-4 tracking-wider uppercase">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500/50" />
            Who It's For
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500/50" />
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Built for <span className="text-orange-500">Makers</span> Like You
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you're organizing your first 100 models or your 10,000th,
            STL Shelf grows with you.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {useCases.map((useCase, index) => {
            const colors =
              accentColors[useCase.accentColor as keyof typeof accentColors]
            return (
              <div
                key={useCase.title}
                className="animate-fade-in-up relative group"
                style={{ animationDelay: `${0.1 + index * 0.1}s` }}
              >
                <div
                  className={`relative h-full p-5 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-500 ${colors.borderHover} ${colors.glow} overflow-hidden`}
                >
                  {/* Large number background */}
                  <div
                    className={`absolute -top-2 -right-1 font-mono text-[64px] font-bold leading-none select-none transition-colors duration-500 ${colors.numberBg}`}
                  >
                    {useCase.number}
                  </div>

                  {/* Hover gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10">
                    {/* Icon with glow */}
                    <div
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border ${colors.border} ${colors.bg} ${colors.bgHover} mb-3 transition-all duration-300`}
                    >
                      <useCase.icon className={`w-5 h-5 ${colors.text}`} />
                    </div>

                    {/* Visual illustration */}
                    <useCase.visual />

                    {/* Content */}
                    <h3 className="text-lg font-semibold mb-1.5 mt-3">
                      {useCase.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {useCase.description}
                    </p>

                    {/* Stat badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-mono ${colors.badgeBg} ${colors.textMuted} border ${colors.badgeBorder}`}
                    >
                      <span
                        className={`h-1 w-1 rounded-full ${colors.bg.replace('/10', '')} animate-pulse`}
                      />
                      {useCase.stat}
                    </div>
                  </div>

                  {/* Bottom accent line */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-current transition-all duration-500 ${colors.textMuted}`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(2deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-4px); }
        }
        @keyframes pulse-heart {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes pulse-commit {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes glow-green {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(34, 197, 94, 0.4)); }
          50% { filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.8)); }
        }
        @keyframes blink {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0.3; }
        }
        @keyframes stack-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes search-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(5deg); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 4s ease-in-out infinite; }
        .animate-pulse-heart { animation: pulse-heart 1.5s ease-in-out infinite; }
        .animate-twinkle { animation: twinkle 2s ease-in-out infinite; }
        .animate-pulse-commit { animation: pulse-commit 3s ease-in-out infinite; }
        .animate-glow-green { animation: glow-green 2s ease-in-out infinite; }
        .animate-blink { animation: blink 1s ease-in-out infinite; }
        .animate-stack-float { animation: stack-float 3s ease-in-out infinite; }
        .animate-search-bounce { animation: search-bounce 2s ease-in-out infinite; }
      `}</style>
    </section>
  )
}
