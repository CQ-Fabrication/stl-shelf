import { CheckCircle2 } from "lucide-react";

type EmptyStateProps = {
  variant?: "dropdown" | "page";
};

export function AnnouncementEmptyState({ variant = "dropdown" }: EmptyStateProps) {
  if (variant === "dropdown") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">All caught up! No announcements to show.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium text-lg">All caught up!</h3>
        <p className="text-muted-foreground text-sm">No announcements to show.</p>
      </div>
    </div>
  );
}
