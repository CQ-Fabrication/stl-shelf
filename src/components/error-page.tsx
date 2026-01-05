import { Link } from "@tanstack/react-router";
import { Home, RotateCw, Copy, Check } from "lucide-react";
import { useState } from "react";
import { BrokenMesh } from "@/components/broken-mesh";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorPageProps {
  errorId: string;
  onRetry: () => void;
}

export function ErrorPage({ errorId, onRetry }: ErrorPageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyErrorId = async () => {
    try {
      await navigator.clipboard.writeText(errorId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = errorId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative flex h-full min-h-[60vh] items-center justify-center overflow-hidden">
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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-destructive/5" />

      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, hsl(var(--destructive) / 0.03) 0%, transparent 50%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-4">
        {/* Broken mesh visual */}
        <BrokenMesh variant="error" className="mb-8" />

        {/* Message */}
        <h1 className="mb-3 text-center text-xl font-semibold tracking-tight sm:text-2xl">
          We're sorry, something didn't work as expected
        </h1>
        <p className="mb-8 max-w-sm text-center text-muted-foreground text-sm">
          The issue has been reported to our team. You can try again or return to the home page.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onRetry} variant="default" className="gap-2">
            <RotateCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Go to Home
            </Link>
          </Button>
        </div>

        {/* Error ID */}
        <div className="mt-10 flex flex-col items-center gap-2">
          <span className="text-muted-foreground/60 text-xs">Error Reference</span>
          <button
            type="button"
            onClick={handleCopyErrorId}
            className={cn(
              "group flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5",
              "font-mono text-xs text-muted-foreground transition-all duration-200",
              "hover:border-border hover:bg-muted/50 hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
            title="Click to copy error ID"
          >
            <span>{errorId}</span>
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
            )}
          </button>
          <span className="text-muted-foreground/50 text-[10px]">
            Include this ID when contacting support
          </span>
        </div>
      </div>
    </div>
  );
}
