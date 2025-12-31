import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

export const useDeleteModel = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation(
    orpc.models.deleteModel.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({
          queryKey: orpc.models.listModels.key(),
        });

        const previousData = queryClient.getQueriesData({
          queryKey: orpc.models.listModels.key(),
        });

        queryClient.setQueriesData(
          { queryKey: orpc.models.listModels.key() },
          (old) => {
            if (!old || typeof old !== "object" || !("pages" in old)) {
              return old;
            }

            const infiniteData = old as {
              pages: Array<{
                models: Array<{ id: string }>;
              }>;
            };

            return {
              ...old,
              pages: infiniteData.pages.map((page) => ({
                ...page,
                models: page.models.filter(
                  (model) => model.id !== variables.id
                ),
              })),
            };
          }
        );

        return { previousData };
      },

      onError: (error, _variables, context) => {
        if (context?.previousData) {
          for (const [queryKey, data] of context.previousData) {
            queryClient.setQueryData(queryKey, data);
          }
        }
        console.error("Delete model error:", error);
        toast.error("Failed to delete model. Please try again.");
      },

      onSuccess: () => {
        toast.success("Model deleted successfully");

        const currentPath = window.location.pathname;
        if (currentPath !== "/") {
          navigate({ to: "/" });
        }
      },

      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.models.listModels.key(),
        });
      },
    })
  );
};
