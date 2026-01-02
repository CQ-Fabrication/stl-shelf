import { useQuery } from '@tanstack/react-query'
import { listModels } from '@/server/functions/models'

// Query options exported for use in route loaders
export const hasModelsQueryOptions = () => ({
  queryKey: ['models', 'hasModels'],
  queryFn: () => listModels({ data: { limit: 1 } }),
})

/**
 * Hook to check if the organization has any models in the library.
 * Makes a simple query with limit=1 to minimize data transfer.
 * Route is protected by beforeLoad auth - no enabled check needed.
 */
export function useHasModels() {
  const { data, isLoading, error } = useQuery(hasModelsQueryOptions())

  return {
    hasModels: (data?.models.length ?? 0) > 0,
    isLoading,
    error,
  }
}
