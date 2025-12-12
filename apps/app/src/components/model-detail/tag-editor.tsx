import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@stl-shelf/ui/components/badge";
import { Button } from "@stl-shelf/ui/components/button";
import { TagCombobox } from "@stl-shelf/ui/components/tag-combobox";
import { orpc } from "@/utils/orpc";

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
    currentTags.map((t) => t.name.toLowerCase())
  );
  const queryClient = useQueryClient();

  const { data: availableTags = [] } = useQuery(
    orpc.models.getAllTags.queryOptions()
  );

  const updateTagsMutation = useMutation(
    orpc.models.updateModelTags.mutationOptions({
      onSuccess: () => {
        toast.success("Tags updated");
        queryClient.invalidateQueries({
          queryKey: orpc.models.getModelTags.key({ input: { id: modelId } }),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.models.getModel.key({ input: { id: modelId } }),
        });
        setIsEditing(false);
      },
      onError: () => {
        toast.error("Failed to update tags");
      },
    })
  );

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
          <Button
            disabled={updateTagsMutation.isPending}
            onClick={handleSave}
            size="sm"
          >
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
