import { cn } from "@/lib/utils";

type BrokenMeshVariant = "404" | "error";

interface BrokenMeshProps {
  variant: BrokenMeshVariant;
  animated?: boolean;
  className?: string;
}

const variantConfig = {
  "404": {
    gradientId: "brokenMeshGrad404",
    gradientStops: [
      { offset: "0%", color: "hsl(var(--primary))", opacity: 0.6 },
      { offset: "100%", color: "hsl(var(--primary))", opacity: 0.1 },
    ],
    strokeColor: "hsl(var(--primary))",
    badge: { text: "404", color: "primary" },
  },
  error: {
    gradientId: "brokenMeshGradError",
    gradientStops: [
      { offset: "0%", color: "hsl(var(--destructive))", opacity: 0.6 },
      { offset: "100%", color: "hsl(var(--destructive))", opacity: 0.15 },
    ],
    strokeColor: "hsl(var(--destructive))",
    badge: { text: "ERR", color: "destructive" },
  },
} as const satisfies Record<
  BrokenMeshVariant,
  {
    gradientId: string;
    gradientStops: { offset: string; color: string; opacity: number }[];
    strokeColor: string;
    badge: { text: string; color: string };
  }
>;

export function BrokenMesh({ variant, animated = true, className }: BrokenMeshProps) {
  const config = variantConfig[variant];

  return (
    <div className={cn("relative h-48 w-56", className)}>
      {/* Scattered triangles - broken mesh aesthetic */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 150">
        <defs>
          <linearGradient id={config.gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
            {config.gradientStops.map((stop) => (
              <stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </linearGradient>
        </defs>

        {/* Main broken triangles */}
        <polygon
          className={animated ? "animate-mesh-drift-1" : ""}
          fill="none"
          points="100,20 140,80 60,80"
          stroke={`url(#${config.gradientId})`}
          strokeWidth="1"
        />
        <polygon
          className={animated ? "animate-mesh-drift-2" : ""}
          fill="none"
          points="50,50 80,100 20,100"
          stroke={config.strokeColor}
          strokeOpacity="0.3"
          strokeWidth="0.5"
        />
        <polygon
          className={animated ? "animate-mesh-drift-3" : ""}
          fill="none"
          points="150,40 180,90 120,90"
          stroke={config.strokeColor}
          strokeOpacity="0.25"
          strokeWidth="0.5"
        />

        {/* Disconnected lines - broken mesh */}
        <line
          className={animated ? "animate-mesh-fade" : ""}
          stroke={config.strokeColor}
          strokeDasharray="4 4"
          strokeOpacity="0.2"
          strokeWidth="0.5"
          x1="60"
          x2="100"
          y1="80"
          y2="120"
        />
        <line
          className={animated ? "animate-mesh-fade" : ""}
          stroke={config.strokeColor}
          strokeDasharray="4 4"
          strokeOpacity="0.2"
          strokeWidth="0.5"
          x1="140"
          x2="120"
          y1="80"
          y2="130"
          style={animated ? { animationDelay: "0.5s" } : undefined}
        />

        {/* Scattered vertices */}
        <circle
          className={animated ? "animate-mesh-pulse" : ""}
          cx="100"
          cy="20"
          fill={config.strokeColor}
          r="2"
        />
        <circle
          className={animated ? "animate-mesh-pulse" : ""}
          cx="60"
          cy="80"
          fill={config.strokeColor}
          opacity="0.5"
          r="1.5"
          style={animated ? { animationDelay: "0.3s" } : undefined}
        />
        <circle
          className={animated ? "animate-mesh-pulse" : ""}
          cx="140"
          cy="80"
          fill={config.strokeColor}
          opacity="0.5"
          r="1.5"
          style={animated ? { animationDelay: "0.6s" } : undefined}
        />

        {/* Symbol based on variant */}
        {variant === "404" ? (
          <>
            {/* Question mark for 404 */}
            <path
              className={animated ? "animate-mesh-draw" : ""}
              d="M90,105 Q90,95 100,95 Q110,95 110,105 Q110,115 100,115"
              fill="none"
              stroke={config.strokeColor}
              strokeLinecap="round"
              strokeOpacity="0.4"
              strokeWidth="2"
            />
            <circle
              className={animated ? "animate-mesh-pulse" : ""}
              cx="100"
              cy="125"
              fill={config.strokeColor}
              opacity="0.4"
              r="2"
            />
          </>
        ) : (
          <>
            {/* Exclamation mark for error */}
            <line
              className={animated ? "animate-mesh-draw" : ""}
              x1="100"
              y1="95"
              x2="100"
              y2="115"
              stroke={config.strokeColor}
              strokeLinecap="round"
              strokeOpacity="0.5"
              strokeWidth="2.5"
            />
            <circle
              className={animated ? "animate-mesh-pulse" : ""}
              cx="100"
              cy="125"
              fill={config.strokeColor}
              opacity="0.5"
              r="2.5"
            />
          </>
        )}
      </svg>

      {/* Floating badge */}
      <div
        className={cn(
          "absolute top-2 right-2 rounded border bg-card/80 px-2 py-1 font-mono text-[9px] backdrop-blur-sm",
          animated && "animate-mesh-float",
          variant === "error"
            ? "border-destructive/30 text-destructive/70"
            : "border-primary/30 text-primary/70",
        )}
      >
        {config.badge.text}
      </div>

      {/* CSS Animations - scoped to this component */}
      <style>{`
        @keyframes mesh-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(2deg); }
        }
        @keyframes mesh-drift-1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(3px, -5px) rotate(2deg); }
        }
        @keyframes mesh-drift-2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-4px, 3px) rotate(-3deg); }
        }
        @keyframes mesh-drift-3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(5px, 2px) rotate(1deg); }
        }
        @keyframes mesh-fade {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        @keyframes mesh-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes mesh-draw {
          0% { stroke-dasharray: 0 100; }
          100% { stroke-dasharray: 100 0; }
        }

        .animate-mesh-float { animation: mesh-float 4s ease-in-out infinite; }
        .animate-mesh-drift-1 { animation: mesh-drift-1 6s ease-in-out infinite; }
        .animate-mesh-drift-2 { animation: mesh-drift-2 7s ease-in-out infinite; }
        .animate-mesh-drift-3 { animation: mesh-drift-3 8s ease-in-out infinite; }
        .animate-mesh-fade { animation: mesh-fade 3s ease-in-out infinite; }
        .animate-mesh-pulse { animation: mesh-pulse 2s ease-in-out infinite; }
        .animate-mesh-draw { animation: mesh-draw 2s ease-out forwards; }

        @media (prefers-reduced-motion: reduce) {
          .animate-mesh-float,
          .animate-mesh-drift-1,
          .animate-mesh-drift-2,
          .animate-mesh-drift-3,
          .animate-mesh-fade,
          .animate-mesh-pulse,
          .animate-mesh-draw {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
