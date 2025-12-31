"use client"

import { cn } from "@stl-shelf/ui/lib/utils"

type VersionTreeProps = {
  className?: string
}

export const VersionTree = ({ className }: VersionTreeProps) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* Git-like version tree visualization */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <svg viewBox="0 0 120 100" className="h-full w-full max-h-32">
          {/* Main branch line */}
          <line
            x1="20"
            y1="15"
            x2="20"
            y2="85"
            stroke="rgb(249, 115, 22)"
            strokeWidth="2"
            strokeOpacity="0.6"
            className="animate-draw"
          />

          {/* Feature branch */}
          <path
            d="M 20 35 Q 40 35 50 50 Q 60 65 50 80"
            fill="none"
            stroke="rgb(168, 85, 247)"
            strokeWidth="2"
            strokeOpacity="0.5"
            className="animate-draw-delayed"
          />

          {/* Merge back */}
          <path
            d="M 50 80 Q 40 85 20 85"
            fill="none"
            stroke="rgb(168, 85, 247)"
            strokeWidth="2"
            strokeOpacity="0.5"
            strokeDasharray="4 2"
          />

          {/* Commits on main */}
          <g className="animate-pulse-commit">
            <circle cx="20" cy="15" r="5" fill="rgb(249, 115, 22)" className="animate-glow-orange" />
            <text x="28" y="18" fontSize="7" fill="rgb(148, 163, 184)" fontFamily="monospace">v1.0</text>
          </g>
          <g className="animate-pulse-commit" style={{ animationDelay: "0.3s" }}>
            <circle cx="20" cy="35" r="5" fill="rgb(249, 115, 22)" />
            <text x="28" y="38" fontSize="7" fill="rgb(148, 163, 184)" fontFamily="monospace">v1.1</text>
          </g>
          <g className="animate-pulse-commit" style={{ animationDelay: "0.6s" }}>
            <circle cx="20" cy="55" r="4" fill="rgb(249, 115, 22)" fillOpacity="0.7" />
          </g>
          <g className="animate-pulse-commit" style={{ animationDelay: "0.9s" }}>
            <circle cx="20" cy="85" r="6" fill="rgb(34, 197, 94)" className="animate-glow-green" />
            <text x="28" y="88" fontSize="7" fill="rgb(148, 163, 184)" fontFamily="monospace">v2.0</text>
          </g>

          {/* Commits on feature branch */}
          <g className="animate-pulse-commit" style={{ animationDelay: "0.4s" }}>
            <circle cx="50" cy="50" r="4" fill="rgb(168, 85, 247)" fillOpacity="0.8" />
            <text x="56" y="48" fontSize="6" fill="rgb(148, 163, 184)" fontFamily="monospace">fix</text>
          </g>
          <g className="animate-pulse-commit" style={{ animationDelay: "0.7s" }}>
            <circle cx="55" cy="65" r="4" fill="rgb(168, 85, 247)" fillOpacity="0.8" />
          </g>
          <g className="animate-pulse-commit" style={{ animationDelay: "1s" }}>
            <circle cx="50" cy="80" r="4" fill="rgb(168, 85, 247)" fillOpacity="0.6" />
          </g>

          {/* Version labels */}
          <rect x="80" y="10" width="35" height="16" rx="3" fill="rgba(249, 115, 22, 0.15)" stroke="rgba(249, 115, 22, 0.3)" strokeWidth="0.5" />
          <text x="97" y="21" fontSize="8" fill="rgb(249, 115, 22)" fontFamily="monospace" textAnchor="middle">main</text>

          <rect x="75" y="45" width="40" height="16" rx="3" fill="rgba(168, 85, 247, 0.15)" stroke="rgba(168, 85, 247, 0.3)" strokeWidth="0.5" />
          <text x="95" y="56" fontSize="8" fill="rgb(168, 85, 247)" fontFamily="monospace" textAnchor="middle">feature</text>
        </svg>
      </div>

      {/* Pulsing indicator */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        <span className="font-mono text-[10px] text-emerald-400/80">synced</span>
      </div>

      {/* Technical grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(249, 115, 22, 0.3) 1px, transparent 1px)`,
          backgroundSize: '16px 16px'
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-purple-500/10" />

      <style>{`
        @keyframes draw {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes pulse-commit {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes glow-orange {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(249, 115, 22, 0.6)); }
          50% { filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.9)); }
        }
        @keyframes glow-green {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(34, 197, 94, 0.6)); }
          50% { filter: drop-shadow(0 0 10px rgba(34, 197, 94, 0.9)); }
        }
        .animate-draw { stroke-dasharray: 100; animation: draw 2s ease-out forwards; }
        .animate-draw-delayed { stroke-dasharray: 100; animation: draw 2s ease-out 0.5s forwards; stroke-dashoffset: 100; }
        .animate-pulse-commit { animation: pulse-commit 3s ease-in-out infinite; }
        .animate-glow-orange { animation: glow-orange 2s ease-in-out infinite; }
        .animate-glow-green { animation: glow-green 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
