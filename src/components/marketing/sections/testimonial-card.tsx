import type { TestimonialItem } from "./testimonials.data";

const accentStyles: Record<
  TestimonialItem["accent"],
  { border: string; avatarBg: string; avatarText: string; quoteMark: string }
> = {
  orange: {
    border: "hover:border-orange-500/40",
    avatarBg: "bg-orange-500/10 border-orange-500/30",
    avatarText: "text-orange-500",
    quoteMark: "text-orange-500/20",
  },
  amber: {
    border: "hover:border-amber-500/40",
    avatarBg: "bg-amber-500/10 border-amber-500/30",
    avatarText: "text-amber-500",
    quoteMark: "text-amber-500/20",
  },
  slate: {
    border: "hover:border-slate-500/40 dark:hover:border-slate-400/40",
    avatarBg: "bg-slate-500/10 border-slate-500/30",
    avatarText: "text-slate-600 dark:text-slate-300",
    quoteMark: "text-slate-500/20 dark:text-slate-300/20",
  },
};

type TestimonialCardProps = {
  item: TestimonialItem;
  index: number;
};

export function TestimonialCard({ item, index }: TestimonialCardProps) {
  const style = accentStyles[item.accent];

  return (
    <figure
      className={`animate-fade-in-up group relative mb-6 break-inside-avoid rounded-2xl border border-border/60 bg-card/80 p-6 backdrop-blur-sm transition-colors duration-300 ${style.border}`}
      style={{ animationDelay: `${0.1 + index * 0.08}s` }}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute right-5 top-3 text-5xl leading-none ${style.quoteMark}`}
      >
        “
      </span>

      <blockquote>
        <p className="pr-8 text-xl leading-tight tracking-tight text-foreground">“{item.quote}”</p>
      </blockquote>

      <figcaption className="mt-6 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${style.avatarBg} ${style.avatarText}`}
        >
          {item.initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{item.author}</p>
          <p className="truncate text-xs text-muted-foreground">{item.role}</p>
        </div>
      </figcaption>
    </figure>
  );
}
