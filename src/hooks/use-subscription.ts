import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { RouterAppContext } from '@/routes/__root'
import { getSubscription } from '@/server/functions/billing'

export const useSubscription = () => {
  const router = useRouter()
  const { auth } = router.options.context as RouterAppContext
  const { data: session } = auth.useSession()

  const query = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () => getSubscription(),
    enabled: Boolean(session?.user),
  })

  return {
    subscription: query.data,
    isLoading: !session?.user || query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
