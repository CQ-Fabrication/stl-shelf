"use client"

import { cn } from "@stl-shelf/ui/lib/utils"

type FileLibraryProps = {
  className?: string
}

export const FileLibrary = ({ className }: FileLibraryProps) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* Stacked file cards with 3D printing layer aesthetic */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-36 w-44">
          {/* Back file - .obj */}
          <div
            className="absolute inset-0 rounded-lg border border-orange-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/40 shadow-lg transition-all duration-500 group-hover:-translate-y-3 group-hover:rotate-[-10deg]"
            style={{ transform: "rotate(-8deg) translateY(12px)" }}
          >
            <div className="flex items-center gap-2 p-3 border-b border-orange-500/10">
              <div className="h-2 w-2 rounded-sm bg-amber-500/60" />
              <div className="h-1.5 w-14 rounded bg-slate-600/50" />
            </div>
            <div className="absolute bottom-2 right-2 font-mono text-[10px] text-orange-500/40">.obj</div>
          </div>

          {/* Middle file - .3mf */}
          <div
            className="absolute inset-0 rounded-lg border border-orange-500/30 bg-gradient-to-br from-slate-700/70 to-slate-800/50 shadow-xl transition-all duration-500 group-hover:-translate-y-1 group-hover:rotate-[-3deg]"
            style={{ transform: "rotate(-3deg) translateY(6px)" }}
          >
            <div className="flex items-center gap-2 p-3 border-b border-orange-500/15">
              <div className="h-2 w-2 rounded-sm bg-emerald-500/60" />
              <div className="h-1.5 w-18 rounded bg-slate-500/50" />
            </div>
            {/* Layer lines - 3D printing aesthetic */}
            <div className="px-3 pt-2 space-y-1">
              <div className="h-0.5 w-full bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent" />
              <div className="h-0.5 w-4/5 bg-gradient-to-r from-orange-500/15 via-orange-500/8 to-transparent" />
              <div className="h-0.5 w-3/5 bg-gradient-to-r from-orange-500/10 to-transparent" />
            </div>
            <div className="absolute bottom-2 right-2 font-mono text-[10px] text-orange-500/50">.3mf</div>
          </div>

          {/* Front file - .stl (hero) */}
          <div className="absolute inset-0 rounded-lg border border-orange-500/50 bg-gradient-to-br from-slate-600/80 to-slate-700/60 shadow-2xl backdrop-blur-sm transition-all duration-500 group-hover:translate-y-1 group-hover:rotate-[4deg] group-hover:scale-105">
            <div className="flex items-center gap-2 p-3 border-b border-orange-500/20">
              <div className="h-2.5 w-2.5 rounded-sm bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
              <div className="h-2 w-20 rounded bg-slate-400/50" />
            </div>
            {/* Mesh visualization */}
            <div className="p-3">
              <div className="relative h-14 w-full">
                {/* Triangle mesh pattern */}
                <svg viewBox="0 0 100 50" className="h-full w-full opacity-60">
                  <defs>
                    <linearGradient id="meshGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgb(249, 115, 22)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="rgb(249, 115, 22)" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                  <polygon points="50,5 90,45 10,45" fill="none" stroke="url(#meshGrad)" strokeWidth="0.5" />
                  <polygon points="30,20 70,20 50,45" fill="none" stroke="url(#meshGrad)" strokeWidth="0.5" />
                  <polygon points="20,35 50,5 80,35" fill="none" stroke="url(#meshGrad)" strokeWidth="0.5" />
                  <line x1="50" y1="5" x2="50" y2="45" stroke="rgb(249, 115, 22)" strokeWidth="0.3" strokeOpacity="0.3" />
                  <line x1="10" y1="45" x2="90" y2="45" stroke="rgb(249, 115, 22)" strokeWidth="0.3" strokeOpacity="0.3" />
                </svg>
              </div>
            </div>
            <div className="absolute bottom-2 right-2 font-mono text-xs font-semibold text-orange-400">.stl</div>
          </div>
        </div>
      </div>

      {/* Floating file format badges */}
      <div
        className="absolute right-6 top-6 rounded border border-orange-500/30 bg-slate-800/60 px-2 py-1 font-mono text-[9px] text-orange-400/70 backdrop-blur-sm animate-float"
        style={{ animationDelay: "0s" }}
      >
        PLY
      </div>
      <div
        className="absolute bottom-10 left-4 rounded border border-emerald-500/30 bg-slate-800/60 px-2 py-1 font-mono text-[9px] text-emerald-400/70 backdrop-blur-sm animate-float"
        style={{ animationDelay: "0.7s" }}
      >
        GCODE
      </div>
      <div
        className="absolute right-10 bottom-16 rounded border border-amber-500/30 bg-slate-800/60 px-2 py-1 font-mono text-[9px] text-amber-400/70 backdrop-blur-sm animate-float"
        style={{ animationDelay: "1.4s" }}
      >
        OBJ
      </div>

      {/* Technical grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(249, 115, 22, 1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 1) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-emerald-500/5" />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(2deg); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
