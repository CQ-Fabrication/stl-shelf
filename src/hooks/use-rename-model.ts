import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { renameModel } from "@/server/functions/models";
import { MODELS_QUERY_KEY } from "./use-delete-model";

type RenameModelInput = {
  id: string;
  name: string;
};

type ModelQueryData = {
  id: string;
  name: string;
  [key: string]: unknown;
};

export const useRenameModel = (modelId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RenameModelInput) => renameModel({ data: input }),

    onMutate: async (input) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["model", modelId] });
      await queryClient.cancelQueries({ queryKey: MODELS_QUERY_KEY });

      // Snapshot the previous values
      const previousModel = queryClient.getQueryData<ModelQueryData>(["model", modelId]);
      const previousModels = queryClient.getQueriesData({ queryKey: MODELS_QUERY_KEY });

      // Optimistically update the model detail
      if (previousModel) {
        queryClient.setQueryData(["model", modelId], {
          ...previousModel,
          name: input.name,
        });
      }

      // Optimistically update the model in ALL list queries (preserving position)
      queryClient.setQueriesData({ queryKey: MODELS_QUERY_KEY }, (old) => {
        if (!old || typeof old !== "object" || !("pages" in old)) {
          return old;
        }

        const infiniteData = old as {
          pages: Array<{ models: Array<{ id: string; name: string }> }>;
        };

        return {
          ...old,
          pages: infiniteData.pages.map((page) => ({
            ...page,
            models: page.models.map((model) =>
              model.id === modelId ? { ...model, name: input.name } : model,
            ),
          })),
        };
      });

      return { previousModel, previousModels };
    },

    onSuccess: () => {
      toast.success("Model renamed");
      // Only invalidate the detail query to sync with server
      // Don't invalidate the list - optimistic update keeps it in place
      queryClient.invalidateQueries({ queryKey: ["model", modelId] });
    },

    onError: (error, _input, context) => {
      // Revert to previous values on error
      if (context?.previousModel) {
        queryClient.setQueryData(["model", modelId], context.previousModel);
      }
      if (context?.previousModels) {
        for (const [queryKey, data] of context.previousModels) {
          queryClient.setQueryData(queryKey, data);
        }
      }

      console.error("Rename model error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to rename model. Please try again.",
      );
    },
  });
};
