import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useMergeTags, type OrgTag } from "@/hooks/use-org-tags";

type TagMergeDialogProps = {
  tag: OrgTag;
  allTags: OrgTag[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TagMergeDialog({ tag, allTags, open, onOpenChange }: TagMergeDialogProps) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const mergeMutation = useMergeTags();

  const candidates = allTags.filter((candidate) => candidate.id !== tag.id);
  const target = candidates.find((candidate) => candidate.id === targetId) ?? null;

  const close = () => {
    onOpenChange(false);
    setTargetId(null);
  };

  const handleMerge = () => {
    if (!target) return;
    mergeMutation.mutate(
      { sourceTagId: tag.id, targetTagId: target.id },
      {
        onSuccess: (result) => {
          toast.success(
            `Merged "${tag.name}" into "${target.name}" — ${result.modelsRelinked} model${
              result.modelsRelinked === 1 ? "" : "s"
            } moved`,
          );
          close();
        },
        onError: () => toast.error("Failed to merge tags"),
      },
    );
  };

  return (
    <Dialog onOpenChange={(next) => (next ? onOpenChange(true) : close())} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge "{tag.name}" into…</DialogTitle>
          <DialogDescription>
            Pick a target tag. This tag's models move onto it, then "{tag.name}" is deleted.
          </DialogDescription>
        </DialogHeader>

        {candidates.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground text-sm">
            No other tags to merge into.
          </p>
        ) : (
          <Command className="rounded-md border">
            <CommandInput placeholder="Search tags…" />
            <CommandList className="max-h-56">
              <CommandEmpty>No matching tags.</CommandEmpty>
              <CommandGroup>
                {candidates.map((candidate) => (
                  <CommandItem
                    key={candidate.id}
                    onSelect={() => setTargetId(candidate.id)}
                    value={candidate.name}
                  >
                    <span
                      className={cn(
                        "h-3 w-3 shrink-0 rounded-full border",
                        candidate.color ? "border-black/10" : "border-muted-foreground/40",
                      )}
                      style={candidate.color ? { backgroundColor: candidate.color } : undefined}
                    />
                    <span className="flex-1 truncate">{candidate.name}</span>
                    <span className="text-muted-foreground text-xs">{candidate.usageCount}</span>
                    {targetId === candidate.id && <Check className="h-4 w-4 text-brand" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}

        {target && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            This will move {tag.usageCount} model{tag.usageCount === 1 ? "" : "s"} to "{target.name}
            " and delete "{tag.name}".
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            disabled={mergeMutation.isPending}
            onClick={close}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={!target || mergeMutation.isPending} onClick={handleMerge} type="button">
            {mergeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
