import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagCombobox } from "@/components/ui/tag-combobox";
import { MODELS_QUERY_KEY } from "@/hooks/use-delete-model";
import { addModelTag, getAllTags, removeModelTag } from "@/server/functions/models";
import { diffTags } from "./tag-diff";

type ModelTag = {
  id: string;
  name: string;
  color: string | null;
};

type TagAction = "add" | "remove";

type TagMutationInput = {
  action: TagAction;
  tagName: string;
};

type TagEditorProps = {
  modelId: string;
  currentTags: ModelTag[];
};

export function TagEditor({ modelId, currentTags }: TagEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const { data: availableTags = [] } = useQuery({
    queryKey: ["tags", "all"],
    queryFn: () => getAllTags(),
  });

  const selectedTags = currentTags.map((t) => t.name.toLowerCase());

  // Applies a single-tag add/remove to every cache that mirrors the model's tags.
  // Functional updates keep overlapping mutations from clobbering each other, and
  // the same routine (with the inverse action) rolls a failed mutation back.
  const applyTagChange = (action: TagAction, tagName: string) => {
    const color = availableTags.find((t) => t.name.toLowerCase() === tagName)?.color ?? null;

    // Detail "tags" query holds tag objects ({ id, name, color }).
    const nextTagObjects = (tags: ModelTag[]): ModelTag[] => {
      if (action === "add") {
        if (tags.some((t) => t.name.toLowerCase() === tagName)) {
          return tags;
        }
        return [...tags, { id: `temp-${tagName}`, name: tagName, color }];
      }
      return tags.filter((t) => t.name.toLowerCase() !== tagName);
    };

    // Model detail and list queries hold tag names (string[]).
    const nextTagNames = (names: string[]): string[] => {
      if (action === "add") {
        return names.includes(tagName) ? names : [...names, tagName];
      }
      return names.filter((n) => n !== tagName);
    };

    queryClient.setQueryData<ModelTag[]>(["model", modelId, "tags"], (old) =>
      nextTagObjects(old ?? []),
    );

    queryClient.setQueryData<{ tags?: string[] }>(["model", modelId], (old) =>
      old ? { ...old, tags: nextTagNames(old.tags ?? []) } : old,
    );

    queryClient.setQueriesData({ queryKey: MODELS_QUERY_KEY }, (old) => {
      if (!old || typeof old !== "object" || !("pages" in old)) {
        return old;
      }

      const infiniteData = old as {
        pages: Array<{ models: Array<{ id: string; tags?: string[] }> }>;
      };

      return {
        ...old,
        pages: infiniteData.pages.map((page) => ({
          ...page,
          models: page.models.map((model) =>
            model.id === modelId ? { ...model, tags: nextTagNames(model.tags ?? []) } : model,
          ),
        })),
      };
    });
  };

  const tagMutation = useMutation({
    mutationFn: ({ action, tagName }: TagMutationInput) =>
      action === "add"
        ? addModelTag({ data: { modelId, tagName } })
        : removeModelTag({ data: { modelId, tagName } }),
    onMutate: async ({ action, tagName }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["model", modelId] }),
        queryClient.cancelQueries({ queryKey: ["model", modelId, "tags"] }),
        queryClient.cancelQueries({ queryKey: MODELS_QUERY_KEY }),
      ]);

      applyTagChange(action, tagName);
    },
    onError: (_error, { action, tagName }) => {
      // Roll back by applying the inverse action (concurrency-safe vs. snapshots).
      applyTagChange(action === "add" ? "remove" : "add", tagName);
      toast.error(action === "add" ? "Failed to add tag" : "Failed to remove tag");
    },
    onSuccess: () => {
      // Sync with server to pick up real tag IDs/colors.
      queryClient.invalidateQueries({ queryKey: ["model", modelId, "tags"] });
      queryClient.invalidateQueries({ queryKey: ["model", modelId] });
      queryClient.invalidateQueries({ queryKey: ["tags", "all"] });
    },
  });

  const handleTagsChange = (newTags: string[]) => {
    const { added, removed } = diffTags(selectedTags, newTags);
    for (const tagName of added) {
      tagMutation.mutate({ action: "add", tagName });
    }
    for (const tagName of removed) {
      tagMutation.mutate({ action: "remove", tagName });
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Tags</span>
            {tagMutation.isPending && (
              <span className="flex items-center gap-1 text-muted-foreground text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving
              </span>
            )}
          </div>
          <Button
            className="h-7 gap-1 px-2 text-xs opacity-60 hover:opacity-100"
            onClick={() => setIsEditing(false)}
            size="sm"
            variant="ghost"
          >
            <Check className="h-3.5 w-3.5" />
            Done
          </Button>
        </div>
        <TagCombobox
          allowCreate
          availableTags={availableTags}
          onTagsChange={handleTagsChange}
          placeholder="Select or create tags..."
          selectedTags={selectedTags}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Tags</span>
        </div>
        <Button
          className="h-7 w-7 opacity-60 hover:opacity-100"
          onClick={() => setIsEditing(true)}
          size="icon"
          variant="ghost"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
      {currentTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {currentTags.map((tag) => (
            <Badge
              key={tag.id}
              style={
                tag.color
                  ? {
                      backgroundColor: tag.color,
                      borderColor: tag.color,
                      color: "white",
                    }
                  : undefined
              }
              variant={tag.color ? "outline" : "secondary"}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No tags</p>
      )}
    </div>
  );
}
