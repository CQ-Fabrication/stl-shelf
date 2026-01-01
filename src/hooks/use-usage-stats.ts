import { useQuery } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { getUsageStats } from '@/server/functions/billing'

export const useUsageStats = () => {
  const { data: session } = authClient.useSession()

  const query = useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: () => getUsageStats(),
    enabled: Boolean(session?.user),
  })

  return {
    usage: query.data,
    isLoading: !session?.user || query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
