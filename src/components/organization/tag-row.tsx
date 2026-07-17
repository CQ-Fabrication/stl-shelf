import { GitMerge, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trackTagManagerAction } from "@/lib/openpanel/client-events";
import { useOpenPanelClient } from "@/lib/openpanel/client-provider";
import { cn } from "@/lib/utils";
import { useUpdateTagColor, type OrgTag } from "@/hooks/use-org-tags";
import { TagColorPicker } from "./tag-color-picker";
import { TagDeleteDialog } from "./tag-delete-dialog";
import { TagEditDialog } from "./tag-edit-dialog";
import { TagMergeDialog } from "./tag-merge-dialog";

type TagRowProps = {
  tag: OrgTag;
  allTags: OrgTag[];
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function TagRow({ tag, allTags }: TagRowProps) {
  const [dialog, setDialog] = useState<"edit" | "merge" | "delete" | null>(null);
  const colorMutation = useUpdateTagColor();
  const { client } = useOpenPanelClient();
  const isOrphan = tag.usageCount === 0;

  const handleColor = (color: string) => {
    colorMutation.mutate(
      { tagId: tag.id, color },
      {
        onSuccess: () => {
          trackTagManagerAction(client, { action: "recolor" });
          toast.success("Tag color updated");
        },
        onError: () => toast.error("Failed to update tag color"),
      },
    );
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 rounded-md border px-3 py-2",
          isOrphan && "border-dashed bg-muted/30",
        )}
      >
        <TagColorPicker
          color={tag.color}
          isSaving={colorMutation.isPending}
          onSelect={handleColor}
        />

        <span className="min-w-0 flex-1 truncate font-medium text-sm">{tag.name}</span>

        {isOrphan ? (
          <Badge className="shrink-0 text-muted-foreground" variant="outline">
            unused
          </Badge>
        ) : (
          <Badge className="shrink-0" variant="secondary">
            {tag.usageCount}
          </Badge>
        )}

        <span className="hidden w-24 shrink-0 text-right text-muted-foreground text-xs sm:inline">
          {dateFormatter.format(new Date(tag.createdAt))}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={`Actions for ${tag.name}`}
              className="h-7 w-7 shrink-0"
              size="icon"
              variant="ghost"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDialog("edit")}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem disabled={allTags.length < 2} onClick={() => setDialog("merge")}>
              <GitMerge className="mr-2 h-4 w-4" />
              Merge into…
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDialog("delete")}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {dialog === "edit" && (
        <TagEditDialog onOpenChange={(open) => !open && setDialog(null)} open tag={tag} />
      )}
      {dialog === "merge" && (
        <TagMergeDialog
          allTags={allTags}
          onOpenChange={(open) => !open && setDialog(null)}
          open
          tag={tag}
        />
      )}
      {dialog === "delete" && (
        <TagDeleteDialog onOpenChange={(open) => !open && setDialog(null)} open tag={tag} />
      )}
    </>
  );
}
