import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { orpc } from '@/utils/orpc';

export const useDeleteModel = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation(
    orpc.deleteModel.mutationOptions({
      onMutate: async (variables) => {
        // Cancel any outgoing refetches to prevent overwriting optimistic update
        await queryClient.cancelQueries({ 
          queryKey: orpc.listModels.key()
        });

        // Get all listModels queries and snapshot them
        const queries = queryClient.getQueriesData({ 
          queryKey: orpc.listModels.key()
        });

        // Store snapshots for rollback
        const previousQueries = queries.map(([queryKey, data]) => ({
          queryKey,
          data
        }));

        // Optimistically update each query
        queries.forEach(([queryKey, data]) => {
          if (!data || typeof data !== 'object') return;
          
          // Handle paginated response structure
          if ('models' in data && Array.isArray(data.models)) {
            const updatedData = {
              ...data,
              models: data.models.filter((model: any) => model.id !== variables.id),
              pagination: data.pagination ? {
                ...data.pagination,
                total: Math.max(0, (data.pagination.total || 0) - 1),
                totalPages: Math.ceil(Math.max(0, (data.pagination.total || 0) - 1) / (data.pagination.limit || 12))
              } : undefined
            };
            
            queryClient.setQueryData(queryKey, updatedData);
          }
        });

        return { previousQueries };
      },
      
      onError: (error, _variables, context) => {
        // Rollback on error
        if (context?.previousQueries) {
          context.previousQueries.forEach(({ queryKey, data }) => {
            queryClient.setQueryData(queryKey, data);
          });
        }
        toast.error(`Failed to delete model: ${error.message}`);
      },
      
      onSuccess: () => {
        toast.success('Model deleted successfully');
        
        // Navigate away if on model detail page
        const currentPath = window.location.pathname;
        if (currentPath !== '/') {
          navigate({ to: '/' });
        }
      },
      
      onSettled: () => {
        // Always refetch after mutation completes (success or error)
        // This ensures data consistency with the server
        queryClient.invalidateQueries({ 
          queryKey: orpc.listModels.key()
        });
      },
    })
  );
};