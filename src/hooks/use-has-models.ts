import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { RouterAppContext } from '@/routes/__root'
import { listModels } from '@/server/functions/models'

/**
 * Hook to check if the organization has any models in the library.
 * Makes a simple query with limit=1 to minimize data transfer.
 * Only runs when user is authenticated.
 */
export function useHasModels() {
  const router = useRouter()
  const { auth } = router.options.context as RouterAppContext
  const { data: session } = auth.useSession()

  const { data, isLoading, error } = useQuery({
    queryKey: ['models', 'hasModels'],
    queryFn: () => listModels({ data: { limit: 1 } }),
    enabled: Boolean(session?.user),
  })

  return {
    hasModels: (data?.models.length ?? 0) > 0,
    isLoading: !session?.user || isLoading,
    error,
  }
}
