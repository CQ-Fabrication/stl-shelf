import { cn } from "@stl-shelf/ui/lib/utils";

type TextHighlightProps = {
  text: string;
  highlight: string;
  className?: string;
};

export function TextHighlight({
  text,
  highlight,
  className,
}: TextHighlightProps) {
  if (!highlight.trim()) {
    return <>{text}</>;
  }

  // Escape special regex characters in the highlight string
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedHighlight})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        const isHighlighted =
          highlight && part.toLowerCase() === highlight.toLowerCase();
        const key = `${part}-${index}`;

        if (isHighlighted) {
          return (
            <span
              className={cn("font-semibold text-brand", className)}
              key={key}
            >
              {part}
            </span>
          );
        }

        return <span key={key}>{part}</span>;
      })}
    </>
  );
}
