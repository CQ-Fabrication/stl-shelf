import { cn } from "@/lib/utils";

type FileStackEffectProps = {
  className?: string;
};

export function FileStackEffect({ className }: FileStackEffectProps) {
  return (
    <div className={cn("relative h-48 w-56", className)}>
      {/* Stacked file cards with 3D printing layer aesthetic */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-40 w-48">
          {/* Back file - .obj */}
          <div
            className="absolute inset-0 rounded-lg border border-primary/20 bg-gradient-to-br from-muted/60 to-muted/40 shadow-lg transition-all duration-500 hover:-translate-y-3 hover:rotate-[-10deg]"
            style={{ transform: "rotate(-8deg) translateY(12px)" }}
          >
            <div className="flex items-center gap-2 border-primary/10 border-b p-3">
              <div className="h-2 w-2 rounded-sm bg-amber-500/60" />
              <div className="h-1.5 w-14 rounded bg-muted-foreground/30" />
            </div>
            <div className="absolute right-2 bottom-2 font-mono text-[10px] text-primary/40">
              .obj
            </div>
          </div>

          {/* Middle file - .3mf */}
          <div
            className="absolute inset-0 rounded-lg border border-primary/30 bg-gradient-to-br from-muted/70 to-muted/50 shadow-xl transition-all duration-500 hover:-translate-y-1 hover:rotate-[-3deg]"
            style={{ transform: "rotate(-3deg) translateY(6px)" }}
          >
            <div className="flex items-center gap-2 border-primary/15 border-b p-3">
              <div className="h-2 w-2 rounded-sm bg-emerald-500/60" />
              <div className="h-1.5 w-18 rounded bg-muted-foreground/30" />
            </div>
            {/* Layer lines - 3D printing aesthetic */}
            <div className="space-y-1 px-3 pt-2">
              <div className="h-0.5 w-full bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
              <div className="h-0.5 w-4/5 bg-gradient-to-r from-primary/15 via-primary/8 to-transparent" />
              <div className="h-0.5 w-3/5 bg-gradient-to-r from-primary/10 to-transparent" />
            </div>
            <div className="absolute right-2 bottom-2 font-mono text-[10px] text-primary/50">
              .3mf
            </div>
          </div>

          {/* Front file - .stl (hero) */}
          <div className="absolute inset-0 rounded-lg border border-primary/50 bg-gradient-to-br from-card to-muted/60 shadow-2xl backdrop-blur-sm transition-all duration-500 hover:translate-y-1 hover:rotate-[4deg] hover:scale-105">
            <div className="flex items-center gap-2 border-primary/20 border-b p-3">
              <div className="h-2.5 w-2.5 rounded-sm bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
              <div className="h-2 w-20 rounded bg-muted-foreground/30" />
            </div>
            {/* Mesh visualization */}
            <div className="p-3">
              <div className="relative h-16 w-full">
                {/* Triangle mesh pattern */}
                <svg className="h-full w-full opacity-60" viewBox="0 0 100 50">
                  <defs>
                    <linearGradient
                      id="meshGrad"
                      x1="0%"
                      x2="100%"
                      y1="0%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity="0.4"
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity="0.1"
                      />
                    </linearGradient>
                  </defs>
                  <polygon
                    fill="none"
                    points="50,5 90,45 10,45"
                    stroke="url(#meshGrad)"
                    strokeWidth="0.5"
                  />
                  <polygon
                    fill="none"
                    points="30,20 70,20 50,45"
                    stroke="url(#meshGrad)"
                    strokeWidth="0.5"
                  />
                  <polygon
                    fill="none"
                    points="20,35 50,5 80,35"
                    stroke="url(#meshGrad)"
                    strokeWidth="0.5"
                  />
                  <line
                    stroke="hsl(var(--primary))"
                    strokeOpacity="0.3"
                    strokeWidth="0.3"
                    x1="50"
                    x2="50"
                    y1="5"
                    y2="45"
                  />
                  <line
                    stroke="hsl(var(--primary))"
                    strokeOpacity="0.3"
                    strokeWidth="0.3"
                    x1="10"
                    x2="90"
                    y1="45"
                    y2="45"
                  />
                </svg>
              </div>
            </div>
            <div className="absolute right-2 bottom-2 font-mono text-xs font-semibold text-primary">
              .stl
            </div>
          </div>
        </div>
      </div>

      {/* Floating file format badges */}
      <div
        className="animate-float absolute top-0 right-0 rounded border border-primary/30 bg-card/80 px-2 py-1 font-mono text-[9px] text-primary/70 backdrop-blur-sm"
        style={{ animationDelay: "0s" }}
      >
        PLY
      </div>
      <div
        className="animate-float absolute bottom-4 left-0 rounded border border-emerald-500/30 bg-card/80 px-2 py-1 font-mono text-[9px] text-emerald-500/70 backdrop-blur-sm"
        style={{ animationDelay: "0.7s" }}
      >
        OBJ
      </div>
      <div
        className="animate-float absolute right-4 bottom-0 rounded border border-amber-500/30 bg-card/80 px-2 py-1 font-mono text-[9px] text-amber-500/70 backdrop-blur-sm"
        style={{ animationDelay: "1.4s" }}
      >
        3MF
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(2deg); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
