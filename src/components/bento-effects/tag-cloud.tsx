'use client'

import { cn } from '@/lib/utils'

type TagCloudProps = {
  className?: string
}

const TAGS = [
  { label: 'mechanical', color: 'orange', size: 'lg' },
  { label: 'miniature', color: 'purple', size: 'md' },
  { label: 'functional', color: 'emerald', size: 'sm' },
  { label: 'decorative', color: 'amber', size: 'md' },
  { label: 'prototype', color: 'orange', size: 'sm' },
  { label: 'tested', color: 'emerald', size: 'lg' },
  { label: 'v2.1', color: 'purple', size: 'sm' },
  { label: 'PLA', color: 'amber', size: 'md' },
]

const colorMap = {
  orange: {
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/40',
    text: 'text-orange-400',
    glow: 'shadow-[0_0_8px_rgba(249,115,22,0.3)]',
  },
  purple: {
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/40',
    text: 'text-purple-400',
    glow: 'shadow-[0_0_8px_rgba(168,85,247,0.3)]',
  },
  emerald: {
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_8px_rgba(34,197,94,0.3)]',
  },
  amber: {
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    glow: 'shadow-[0_0_8px_rgba(245,158,11,0.3)]',
  },
}

const sizeMap = {
  sm: 'text-[9px] px-1.5 py-0.5',
  md: 'text-[10px] px-2 py-1',
  lg: 'text-xs px-2.5 py-1',
}

export const TagCloud = ({ className }: TagCloudProps) => {
  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      {/* Floating tags */}
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-2 p-6">
        {TAGS.map((tag, index) => {
          const colors = colorMap[tag.color as keyof typeof colorMap]
          const size = sizeMap[tag.size as keyof typeof sizeMap]
          return (
            <div
              key={tag.label}
              className={cn(
                'rounded-full border font-mono backdrop-blur-sm transition-all duration-500',
                'hover:scale-110 group-hover:animate-float-tag',
                colors.bg,
                colors.border,
                colors.text,
                size
              )}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {tag.label}
            </div>
          )
        })}
      </div>

      {/* Search input mockup */}
      <div className="absolute top-4 left-4 right-4">
        <div className="flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-800/60 px-3 py-2 backdrop-blur-sm">
          <svg
            className="h-3.5 w-3.5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <div className="h-1.5 w-16 rounded bg-slate-600/50" />
          <div className="ml-auto flex items-center gap-1">
            <span className="font-mono text-[8px] text-slate-500">K</span>
          </div>
        </div>
      </div>

      {/* Tag count indicator */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
        <span className="font-mono text-[9px] text-slate-400">24 tags</span>
      </div>

      {/* Connection lines (subtle) */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-20">
        <line
          x1="30%"
          y1="40%"
          x2="50%"
          y2="50%"
          stroke="rgb(249, 115, 22)"
          strokeWidth="0.5"
          strokeDasharray="2 4"
        />
        <line
          x1="70%"
          y1="35%"
          x2="50%"
          y2="50%"
          stroke="rgb(168, 85, 247)"
          strokeWidth="0.5"
          strokeDasharray="2 4"
        />
        <line
          x1="40%"
          y1="70%"
          x2="50%"
          y2="50%"
          stroke="rgb(34, 197, 94)"
          strokeWidth="0.5"
          strokeDasharray="2 4"
        />
      </svg>

      {/* Technical grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(249, 115, 22, 1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 1) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-orange-500/5" />

      <style>{`
        @keyframes float-tag {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-4px) rotate(1deg); }
          75% { transform: translateY(2px) rotate(-1deg); }
        }
        .animate-float-tag { animation: float-tag 4s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
