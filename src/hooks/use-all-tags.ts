import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { RouterAppContext } from '@/routes/__root'
import { getAllTags } from '@/server/functions/models'

/**
 * Hook to fetch all tags for the organization.
 * Only runs when user is authenticated and has an active organization.
 */
export function useAllTags() {
  const router = useRouter()
  const { auth } = router.options.context as RouterAppContext
  const { data: session } = auth.useSession()
  const { data: activeOrg } = auth.useActiveOrganization()

  const { data, isLoading, error } = useQuery({
    queryKey: ['tags', 'all'],
    queryFn: () => getAllTags(),
    enabled: Boolean(session?.user && activeOrg?.id),
  })

  return {
    tags: data ?? [],
    isLoading: !session?.user || !activeOrg?.id || isLoading,
    error,
  }
}
