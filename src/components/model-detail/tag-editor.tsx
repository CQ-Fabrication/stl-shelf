import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagCombobox } from "@/components/ui/tag-combobox";
import { MODELS_QUERY_KEY } from "@/hooks/use-delete-model";
import { getAllTags, updateModelTags } from "@/server/functions/models";

type ModelTag = {
  id: string;
  name: string;
  color: string | null;
};

type TagEditorProps = {
  modelId: string;
  currentTags: ModelTag[];
};

export function TagEditor({ modelId, currentTags }: TagEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(() =>
    currentTags.map((t) => t.name.toLowerCase()),
  );
  const queryClient = useQueryClient();

  const { data: availableTags = [] } = useQuery({
    queryKey: ["tags", "all"],
    queryFn: () => getAllTags(),
  });

  const updateTagsMutation = useMutation({
    mutationFn: (input: { modelId: string; tags: string[] }) => updateModelTags({ data: input }),
    onMutate: async (input) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["model", modelId] });
      await queryClient.cancelQueries({ queryKey: ["model", modelId, "tags"] });
      await queryClient.cancelQueries({ queryKey: MODELS_QUERY_KEY });

      // Snapshot previous values
      const previousModel = queryClient.getQueryData<{ tags?: ModelTag[] }>(["model", modelId]);
      const previousTags = queryClient.getQueryData<ModelTag[]>(["model", modelId, "tags"]);
      const previousModels = queryClient.getQueriesData({ queryKey: MODELS_QUERY_KEY });

      // Build optimistic tags from selected tag names
      // Use existing tag info for color, generate temp IDs (real IDs come on invalidation)
      const optimisticTags: ModelTag[] = input.tags.map((tagName) => {
        const existing = availableTags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
        return {
          id: `temp-${tagName}`,
          name: tagName,
          color: existing?.color ?? null,
        };
      });

      // Optimistically update model detail
      if (previousModel) {
        queryClient.setQueryData(["model", modelId], {
          ...previousModel,
          tags: optimisticTags,
        });
      }

      // Optimistically update tags query
      queryClient.setQueryData(["model", modelId, "tags"], optimisticTags);

      // Optimistically update model in ALL list queries
      // Note: List uses string[] for tags, not objects
      const tagNames = input.tags;
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
              model.id === modelId ? { ...model, tags: tagNames } : model,
            ),
          })),
        };
      });

      return { previousModel, previousTags, previousModels };
    },
    onSuccess: () => {
      toast.success("Tags updated");
      // Only invalidate to sync with server (get real tag IDs)
      queryClient.invalidateQueries({ queryKey: ["model", modelId, "tags"] });
      queryClient.invalidateQueries({ queryKey: ["model", modelId] });
      queryClient.invalidateQueries({ queryKey: ["tags", "all"] });
      setIsEditing(false);
    },
    onError: (_error, _input, context) => {
      // Revert on error
      if (context?.previousModel) {
        queryClient.setQueryData(["model", modelId], context.previousModel);
      }
      if (context?.previousTags) {
        queryClient.setQueryData(["model", modelId, "tags"], context.previousTags);
      }
      if (context?.previousModels) {
        for (const [queryKey, data] of context.previousModels) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error("Failed to update tags");
    },
  });

  const handleSave = () => {
    updateTagsMutation.mutate({
      modelId,
      tags: selectedTags,
    });
  };

  const handleCancel = () => {
    setSelectedTags(currentTags.map((t) => t.name.toLowerCase()));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Tags</span>
        </div>
        <TagCombobox
          allowCreate
          availableTags={availableTags}
          disabled={updateTagsMutation.isPending}
          onTagsChange={setSelectedTags}
          placeholder="Select or create tags..."
          selectedTags={selectedTags}
        />
        <div className="flex justify-end gap-2">
          <Button
            disabled={updateTagsMutation.isPending}
            onClick={handleCancel}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button disabled={updateTagsMutation.isPending} onClick={handleSave} size="sm">
            {updateTagsMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
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
