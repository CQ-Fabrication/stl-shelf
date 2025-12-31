'use client'

import { cn } from '@/lib/utils'

type ModelPreviewProps = {
  className?: string
}

export const ModelPreview = ({ className }: ModelPreviewProps) => {
  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      {/* 3D Model wireframe visualization */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-32 w-32">
          {/* Rotating cube wireframe */}
          <svg
            viewBox="0 0 100 100"
            className="h-full w-full animate-rotate-slow"
          >
            <defs>
              <linearGradient
                id="cubeGrad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor="rgb(249, 115, 22)"
                  stopOpacity="0.8"
                />
                <stop
                  offset="100%"
                  stopColor="rgb(168, 85, 247)"
                  stopOpacity="0.4"
                />
              </linearGradient>
            </defs>

            {/* Front face */}
            <polygon
              points="30,35 70,35 70,75 30,75"
              fill="none"
              stroke="url(#cubeGrad)"
              strokeWidth="1.5"
              className="animate-pulse-soft"
            />

            {/* Back face */}
            <polygon
              points="40,25 80,25 80,65 40,65"
              fill="none"
              stroke="rgba(249, 115, 22, 0.3)"
              strokeWidth="1"
            />

            {/* Connecting edges */}
            <line
              x1="30"
              y1="35"
              x2="40"
              y2="25"
              stroke="rgba(249, 115, 22, 0.5)"
              strokeWidth="1"
            />
            <line
              x1="70"
              y1="35"
              x2="80"
              y2="25"
              stroke="rgba(249, 115, 22, 0.5)"
              strokeWidth="1"
            />
            <line
              x1="70"
              y1="75"
              x2="80"
              y2="65"
              stroke="rgba(249, 115, 22, 0.5)"
              strokeWidth="1"
            />
            <line
              x1="30"
              y1="75"
              x2="40"
              y2="65"
              stroke="rgba(249, 115, 22, 0.3)"
              strokeWidth="1"
              strokeDasharray="3 2"
            />

            {/* Center cross for depth */}
            <line
              x1="50"
              y1="30"
              x2="50"
              y2="70"
              stroke="rgba(249, 115, 22, 0.15)"
              strokeWidth="0.5"
            />
            <line
              x1="35"
              y1="50"
              x2="75"
              y2="50"
              stroke="rgba(249, 115, 22, 0.15)"
              strokeWidth="0.5"
            />
          </svg>

          {/* Glow effect behind cube */}
          <div className="absolute inset-0 rounded-full bg-orange-500/10 blur-xl animate-pulse-soft" />
        </div>
      </div>

      {/* Axis indicators */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className="h-4 w-0.5 bg-red-500/60" />
          <span className="font-mono text-[9px] text-red-400/60">X</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-0.5 w-4 bg-green-500/60" />
          <span className="font-mono text-[9px] text-green-400/60">Y</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 border-l border-b border-blue-500/60 -rotate-45" />
          <span className="font-mono text-[9px] text-blue-400/60">Z</span>
        </div>
      </div>

      {/* Model info badge */}
      <div className="absolute top-4 right-4 rounded border border-orange-500/30 bg-slate-800/70 px-2 py-1 backdrop-blur-sm">
        <div className="font-mono text-[9px] text-orange-400/80">
          12,847 triangles
        </div>
      </div>

      {/* Rotation indicator */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
        <svg viewBox="0 0 20 20" className="h-4 w-4 animate-spin-slow">
          <circle
            cx="10"
            cy="10"
            r="7"
            fill="none"
            stroke="rgba(249, 115, 22, 0.3)"
            strokeWidth="1.5"
          />
          <path
            d="M 10 3 A 7 7 0 0 1 17 10"
            fill="none"
            stroke="rgb(249, 115, 22)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="font-mono text-[9px] text-slate-400">360</span>
      </div>

      {/* Technical grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(249, 115, 22, 0.5) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-purple-500/10" />

      <style>{`
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-rotate-slow { animation: rotate-slow 20s linear infinite; }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
        .animate-pulse-soft { animation: pulse-soft 3s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
