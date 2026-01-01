import { useQuery } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { getAllTags } from '@/server/functions/models'

/**
 * Hook to fetch all tags for the organization.
 * Only runs when user is authenticated and has an active organization.
 */
export function useAllTags() {
  const { data: session } = authClient.useSession()
  const { data: activeOrg } = authClient.useActiveOrganization()

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
