import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { RouterAppContext } from '@/routes/__root'
import { getUsageStats } from '@/server/functions/billing'

export const useUsageStats = () => {
  const router = useRouter()
  const { auth } = router.options.context as RouterAppContext
  const { data: session } = auth.useSession()

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
