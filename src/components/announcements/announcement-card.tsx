import { useStatsigClient } from "@statsig/react-bindings";
import { useRouter } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { trackCtaClick } from "@/lib/statsig/client-events";
import { cn } from "@/lib/utils";

type AnnouncementCardProps = {
  id: string;
  title: string;
  body: string | null;
  ctaUrl: string | null;
  ctaLabel: string | null;
  createdAt: string;
  isRead?: boolean;
  onCtaClick?: (id: string) => void;
  variant?: "dropdown" | "page";
};

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return date.toLocaleDateString();
  }
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  }
  if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  }
  return "Just now";
}

/**
 * Parse CTA URL and determine if internal or external
 */
function parseCtaUrl(url: string): { type: "internal" | "external"; path: string } {
  if (url.startsWith("internal:")) {
    return { type: "internal", path: url.replace("internal:", "") };
  }
  if (url.startsWith("external:")) {
    return { type: "external", path: url.replace("external:", "") };
  }
  // Fallback: treat as external if starts with http, otherwise internal
  if (url.startsWith("http")) {
    return { type: "external", path: url };
  }
  return { type: "internal", path: url };
}

export function AnnouncementCard({
  id,
  title,
  body,
  ctaUrl,
  ctaLabel,
  createdAt,
  isRead = false,
  onCtaClick,
  variant = "dropdown",
}: AnnouncementCardProps) {
  const router = useRouter();
  const { client } = useStatsigClient();

  function handleCtaClick() {
    if (!ctaUrl) return;

    const { type, path } = parseCtaUrl(ctaUrl);

    // Track CTA click in Statsig
    trackCtaClick(client, ctaLabel ?? "Learn more", {
      location: "announcement",
      variant: id,
    });

    // Mark as read when CTA is clicked
    onCtaClick?.(id);

    if (type === "internal") {
      router.navigate({ to: path });
    } else {
      window.open(path, "_blank", "noopener,noreferrer");
    }
  }

  const isPageVariant = variant === "page";

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 p-3",
        isPageVariant && "rounded-lg border bg-card",
        isPageVariant && !isRead && "border-primary/20 bg-primary/5",
        // Dropdown: subtle opacity for read items
        !isPageVariant && isRead && "opacity-60",
      )}
    >
      {/* Unread indicator for both variants */}
      {!isRead && (
        <div
          className={cn(
            "-translate-y-1/2 absolute h-2 w-2 rounded-full bg-primary",
            isPageVariant ? "top-1/2 left-0" : "top-4 left-1",
          )}
        />
      )}

      {/* Header: Title + Timestamp */}
      <div className={cn("flex items-start justify-between gap-2", !isRead && "pl-3")}>
        <h4 className="line-clamp-2 font-semibold text-sm leading-tight">{title}</h4>
        <span className="flex-shrink-0 text-muted-foreground text-xs">{formatRelativeTime(createdAt)}</span>
      </div>

      {/* Body with markdown */}
      {body && (
        <div
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none text-muted-foreground text-sm",
            "[&_p]:my-1 [&_a]:text-primary [&_a]:underline",
            !isRead && "pl-3",
          )}
        >
          <Markdown
            allowedElements={["p", "strong", "em", "a", "br"]}
            components={{
              a: ({ href, children }) => (
                <a href={href} rel="noopener noreferrer" target="_blank">
                  {children}
                </a>
              ),
            }}
          >
            {body}
          </Markdown>
        </div>
      )}

      {/* CTA Button */}
      {ctaUrl && (
        <div className={cn("flex justify-end", !isRead && "pl-3")}>
          <Button
            className="h-7 gap-1 text-xs"
            onClick={handleCtaClick}
            size="sm"
            variant="outline"
          >
            {ctaLabel ?? "Learn more"}
            {parseCtaUrl(ctaUrl).type === "external" && <ExternalLink className="h-3 w-3" />}
          </Button>
        </div>
      )}
    </div>
  );
}
