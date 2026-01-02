import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { deleteModel } from '@/server/functions/models'

export const MODELS_QUERY_KEY = ['models'] as const

export const useDeleteModel = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (id: string) => deleteModel({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: MODELS_QUERY_KEY,
      })

      const previousData = queryClient.getQueriesData({
        queryKey: MODELS_QUERY_KEY,
      })

      queryClient.setQueriesData({ queryKey: MODELS_QUERY_KEY }, (old) => {
        if (!old || typeof old !== 'object' || !('pages' in old)) {
          return old
        }

        const infiniteData = old as {
          pages: Array<{
            models: Array<{ id: string }>
          }>
        }

        return {
          ...old,
          pages: infiniteData.pages.map((page) => ({
            ...page,
            models: page.models.filter((model) => model.id !== id),
          })),
        }
      })

      return { previousData }
    },

    onError: (error, _id, context) => {
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data)
        }
      }
      console.error('Delete model error:', error)
      toast.error('Failed to delete model. Please try again.')
    },

    onSuccess: () => {
      toast.success('Model deleted successfully')

      // Only navigate away if on a model detail page (which no longer exists)
      const currentPath = window.location.pathname
      if (currentPath.startsWith('/models/')) {
        navigate({ to: '/library' })
      }
    },

    onSettled: () => {
      // Invalidate models list
      queryClient.invalidateQueries({
        queryKey: MODELS_QUERY_KEY,
      })
      // Invalidate upload limits so modal shows correct count
      queryClient.invalidateQueries({
        queryKey: ['upload-limits'],
      })
      // Invalidate grace period check
      queryClient.invalidateQueries({
        queryKey: ['grace-period'],
      })
    },
  })
}
