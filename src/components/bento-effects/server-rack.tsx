"use client";

import { cn } from "@/lib/utils";

type ServerRackProps = {
  className?: string;
};

export const ServerRack = ({ className }: ServerRackProps) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* Server/NAS visualization */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Server unit */}
          <div className="h-28 w-44 rounded-lg border border-slate-600/50 bg-gradient-to-b from-slate-700/80 to-slate-800/90 shadow-xl">
            {/* Top ventilation */}
            <div className="absolute top-2 left-3 right-3 flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-0.5 flex-1 bg-slate-600/50 rounded" />
              ))}
            </div>

            {/* Drive bays */}
            <div className="absolute top-6 left-3 right-3 bottom-10 grid grid-cols-4 gap-1.5">
              {[
                { active: true, color: "emerald" },
                { active: true, color: "emerald" },
                { active: true, color: "orange" },
                { active: false, color: "slate" },
              ].map((drive, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded border bg-slate-900/50 flex flex-col items-center justify-center gap-1 p-1",
                    drive.active ? "border-slate-500/30" : "border-slate-700/30",
                  )}
                >
                  {/* Drive LED */}
                  <div
                    className={cn(
                      "h-1 w-1 rounded-full",
                      drive.active &&
                        drive.color === "emerald" &&
                        "bg-emerald-500 shadow-[0_0_4px_rgba(34,197,94,0.8)] animate-blink",
                      drive.active &&
                        drive.color === "orange" &&
                        "bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.8)] animate-pulse",
                      !drive.active && "bg-slate-600/50",
                    )}
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                  {/* Drive slot lines */}
                  <div className="w-full space-y-0.5">
                    <div
                      className={cn(
                        "h-0.5 rounded",
                        drive.active ? "bg-slate-500/30" : "bg-slate-700/20",
                      )}
                    />
                    <div
                      className={cn(
                        "h-0.5 rounded",
                        drive.active ? "bg-slate-500/30" : "bg-slate-700/20",
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom status bar */}
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse" />
                <span className="font-mono text-[8px] text-emerald-400/80">ONLINE</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1 w-1 rounded-full bg-orange-500/60 animate-blink" />
                <div
                  className="h-1 w-1 rounded-full bg-orange-500/60 animate-blink"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>
            </div>
          </div>

          {/* Shadow/reflection */}
          <div className="absolute -bottom-4 left-4 right-4 h-4 bg-gradient-to-b from-slate-900/40 to-transparent blur-sm" />
        </div>
      </div>

      {/* Network activity indicators */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <svg
            className="h-3 w-3 text-orange-400/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          <span className="font-mono text-[8px] text-orange-400/60">2.4 MB/s</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg
            className="h-3 w-3 text-emerald-400/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span className="font-mono text-[8px] text-emerald-400/60">1.8 MB/s</span>
        </div>
      </div>

      {/* Storage capacity */}
      <div className="absolute top-4 right-4">
        <div className="rounded border border-slate-600/40 bg-slate-800/60 px-2 py-1.5 backdrop-blur-sm">
          <div className="font-mono text-[9px] text-slate-400 mb-1">Storage</div>
          <div className="h-1 w-20 rounded-full bg-slate-700/50 overflow-hidden">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-orange-500/80 to-emerald-500/60" />
          </div>
          <div className="font-mono text-[8px] text-slate-500 mt-0.5">1.2 TB / 2 TB</div>
        </div>
      </div>

      {/* Data ownership badge */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1">
        <svg
          className="h-3 w-3 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        <span className="font-mono text-[9px] text-emerald-400">Your Data</span>
      </div>

      {/* Technical grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(249, 115, 22, 1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 1) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-orange-500/5" />

      <style>{`
        @keyframes blink {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0.3; }
        }
        .animate-blink { animation: blink 1s ease-in-out infinite; }
      `}</style>
    </div>
  );
};
