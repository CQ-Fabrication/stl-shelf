import { Link } from "@tanstack/react-router";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden">
      {/* Technical grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-4">
        {/* Broken mesh visual */}
        <div className="relative mb-8 h-48 w-56">
          {/* Scattered triangles - broken mesh aesthetic */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 200 150"
          >
            <defs>
              <linearGradient
                id="brokenMeshGrad"
                x1="0%"
                x2="100%"
                y1="0%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity="0.6"
                />
                <stop
                  offset="100%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity="0.1"
                />
              </linearGradient>
            </defs>

            {/* Main broken triangles */}
            <polygon
              className="animate-drift-1"
              fill="none"
              points="100,20 140,80 60,80"
              stroke="url(#brokenMeshGrad)"
              strokeWidth="1"
            />
            <polygon
              className="animate-drift-2"
              fill="none"
              points="50,50 80,100 20,100"
              stroke="hsl(var(--primary))"
              strokeOpacity="0.3"
              strokeWidth="0.5"
            />
            <polygon
              className="animate-drift-3"
              fill="none"
              points="150,40 180,90 120,90"
              stroke="hsl(var(--primary))"
              strokeOpacity="0.25"
              strokeWidth="0.5"
            />

            {/* Disconnected lines - broken mesh */}
            <line
              className="animate-fade"
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              strokeOpacity="0.2"
              strokeWidth="0.5"
              x1="60"
              x2="100"
              y1="80"
              y2="120"
            />
            <line
              className="animate-fade"
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              strokeOpacity="0.2"
              strokeWidth="0.5"
              x1="140"
              x2="120"
              y1="80"
              y2="130"
              style={{ animationDelay: "0.5s" }}
            />

            {/* Scattered vertices */}
            <circle
              className="animate-pulse-slow"
              cx="100"
              cy="20"
              fill="hsl(var(--primary))"
              r="2"
            />
            <circle
              className="animate-pulse-slow"
              cx="60"
              cy="80"
              fill="hsl(var(--primary))"
              opacity="0.5"
              r="1.5"
              style={{ animationDelay: "0.3s" }}
            />
            <circle
              className="animate-pulse-slow"
              cx="140"
              cy="80"
              fill="hsl(var(--primary))"
              opacity="0.5"
              r="1.5"
              style={{ animationDelay: "0.6s" }}
            />

            {/* Question mark made of mesh lines */}
            <path
              className="animate-draw"
              d="M90,105 Q90,95 100,95 Q110,95 110,105 Q110,115 100,115"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeLinecap="round"
              strokeOpacity="0.4"
              strokeWidth="2"
            />
            <circle
              className="animate-pulse-slow"
              cx="100"
              cy="125"
              fill="hsl(var(--primary))"
              opacity="0.4"
              r="2"
            />
          </svg>

          {/* Floating error badge */}
          <div
            className="animate-float absolute top-2 right-2 rounded border border-destructive/30 bg-card/80 px-2 py-1 font-mono text-[9px] text-destructive/70 backdrop-blur-sm"
            style={{ animationDelay: "0s" }}
          >
            ERR
          </div>
          <div
            className="animate-float absolute bottom-6 left-2 rounded border border-primary/30 bg-card/80 px-2 py-1 font-mono text-[9px] text-primary/70 backdrop-blur-sm"
            style={{ animationDelay: "0.7s" }}
          >
            404
          </div>
        </div>

        {/* 404 display */}
        <div className="relative mb-2">
          <span className="font-mono text-7xl font-bold tracking-tighter text-primary/20">
            404
          </span>
          <span className="absolute inset-0 flex items-center justify-center font-mono text-7xl font-bold tracking-tighter text-primary animate-glitch">
            404
          </span>
        </div>

        {/* Message */}
        <h2 className="mb-2 text-xl font-semibold tracking-tight">
          Model Not Found
        </h2>
        <p className="mb-8 max-w-sm text-center text-muted-foreground text-sm">
          The mesh you're looking for doesn't exist or may have been deleted.
          Check the URL or navigate back to your library.
        </p>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button asChild variant="default" className="gap-2">
            <Link to="/library">
              <Home className="h-4 w-4" />
              Go to Library
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/library" search={{ search: "" }}>
              <Search className="h-4 w-4" />
              Search Models
            </Link>
          </Button>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(2deg); }
        }
        @keyframes drift-1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(3px, -5px) rotate(2deg); }
        }
        @keyframes drift-2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-4px, 3px) rotate(-3deg); }
        }
        @keyframes drift-3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(5px, 2px) rotate(1deg); }
        }
        @keyframes fade {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes draw {
          0% { stroke-dasharray: 0 100; }
          100% { stroke-dasharray: 100 0; }
        }
        @keyframes glitch {
          0%, 90%, 100% { transform: translate(0); opacity: 1; }
          92% { transform: translate(-2px, 1px); opacity: 0.8; }
          94% { transform: translate(2px, -1px); opacity: 0.9; }
          96% { transform: translate(-1px, 2px); opacity: 0.7; }
          98% { transform: translate(1px, -2px); opacity: 0.85; }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-drift-1 { animation: drift-1 6s ease-in-out infinite; }
        .animate-drift-2 { animation: drift-2 7s ease-in-out infinite; }
        .animate-drift-3 { animation: drift-3 8s ease-in-out infinite; }
        .animate-fade { animation: fade 3s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }
        .animate-draw { animation: draw 2s ease-out forwards; }
        .animate-glitch { animation: glitch 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
