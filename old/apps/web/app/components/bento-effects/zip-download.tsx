"use client"

import { cn } from "@stl-shelf/ui/lib/utils"

type ZipDownloadProps = {
  className?: string
}

export const ZipDownload = ({ className }: ZipDownloadProps) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* Cascading file download visualization */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-32 w-40">
          {/* ZIP archive icon */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 z-10">
            <div className="relative">
              <div className="h-16 w-14 rounded-lg border-2 border-orange-500/50 bg-gradient-to-b from-slate-700/80 to-slate-800/60 shadow-lg">
                {/* Zipper pattern */}
                <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-2 flex flex-col items-center justify-center gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-1.5 w-1.5 bg-amber-500/60 rounded-sm" />
                  ))}
                </div>
                {/* ZIP label */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[8px] text-orange-400/80">.zip</div>
              </div>
              {/* Glow */}
              <div className="absolute inset-0 rounded-lg bg-orange-500/20 blur-md -z-10" />
            </div>
          </div>

          {/* Cascading files */}
          <div className="absolute bottom-0 left-0 right-0 h-20">
            {/* File 1 */}
            <div
              className="absolute left-2 animate-cascade"
              style={{ animationDelay: "0s" }}
            >
              <div className="h-8 w-10 rounded border border-orange-500/30 bg-slate-800/70 flex items-center justify-center">
                <span className="font-mono text-[7px] text-orange-400/70">.stl</span>
              </div>
            </div>

            {/* File 2 */}
            <div
              className="absolute left-1/2 -translate-x-1/2 animate-cascade"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="h-8 w-10 rounded border border-emerald-500/30 bg-slate-800/70 flex items-center justify-center">
                <span className="font-mono text-[7px] text-emerald-400/70">.3mf</span>
              </div>
            </div>

            {/* File 3 */}
            <div
              className="absolute right-2 animate-cascade"
              style={{ animationDelay: "0.6s" }}
            >
              <div className="h-8 w-10 rounded border border-purple-500/30 bg-slate-800/70 flex items-center justify-center">
                <span className="font-mono text-[7px] text-purple-400/70">.obj</span>
              </div>
            </div>
          </div>

          {/* Download arrow trail */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none">
            <defs>
              <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(249, 115, 22)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="rgb(249, 115, 22)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M 80 50 L 80 85 M 70 75 L 80 85 L 90 75"
              fill="none"
              stroke="url(#arrowGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-arrow-pulse"
            />
          </svg>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
          <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 animate-progress-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="font-mono text-[9px] text-slate-400">3 files</span>
          <span className="font-mono text-[9px] text-orange-400/80">2.4 MB</span>
        </div>
      </div>

      {/* Checkmark badges */}
      <div className="absolute top-4 right-4 flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="h-2 w-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-mono text-[8px] text-emerald-400/70">model.stl</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="h-2 w-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-mono text-[8px] text-emerald-400/70">print.3mf</span>
        </div>
        <div className="flex items-center gap-1 animate-pulse">
          <div className="h-3 w-3 rounded-full bg-orange-500/20 flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
          </div>
          <span className="font-mono text-[8px] text-orange-400/70">backup.obj</span>
        </div>
      </div>

      {/* Technical grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(249, 115, 22, 0.4) 1px, transparent 1px)`,
          backgroundSize: '16px 16px'
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-emerald-500/5" />

      <style>{`
        @keyframes cascade {
          0% { transform: translateY(-20px); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translateY(40px); opacity: 0; }
        }
        @keyframes arrow-pulse {
          0%, 100% { opacity: 1; stroke-dashoffset: 0; }
          50% { opacity: 0.5; }
        }
        @keyframes progress-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-cascade { animation: cascade 2s ease-in-out infinite; }
        .animate-arrow-pulse { animation: arrow-pulse 1.5s ease-in-out infinite; }
        .animate-progress-pulse { animation: progress-pulse 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
