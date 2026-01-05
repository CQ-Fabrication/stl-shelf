import { Link } from "@tanstack/react-router";
import { Home, Search } from "lucide-react";
import { BrokenMesh } from "@/components/broken-mesh";
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
        <BrokenMesh variant="404" className="mb-8" />

        {/* 404 display */}
        <div className="relative mb-2">
          <span className="font-mono text-7xl font-bold tracking-tighter text-primary/20">404</span>
          <span className="absolute inset-0 flex items-center justify-center font-mono text-7xl font-bold tracking-tighter text-primary animate-glitch">
            404
          </span>
        </div>

        {/* Message */}
        <h2 className="mb-2 text-xl font-semibold tracking-tight">Model Not Found</h2>
        <p className="mb-8 max-w-sm text-center text-muted-foreground text-sm">
          The mesh you're looking for doesn't exist or may have been deleted. Check the URL or
          navigate back to your library.
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
            <Link to="/library">
              <Search className="h-4 w-4" />
              Search Models
            </Link>
          </Button>
        </div>
      </div>

      {/* Glitch animation for 404 text */}
      <style>{`
        @keyframes glitch {
          0%, 90%, 100% { transform: translate(0); opacity: 1; }
          92% { transform: translate(-2px, 1px); opacity: 0.8; }
          94% { transform: translate(2px, -1px); opacity: 0.9; }
          96% { transform: translate(-1px, 2px); opacity: 0.7; }
          98% { transform: translate(1px, -2px); opacity: 0.85; }
        }
        .animate-glitch { animation: glitch 4s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .animate-glitch { animation: none; }
        }
      `}</style>
    </div>
  );
}
