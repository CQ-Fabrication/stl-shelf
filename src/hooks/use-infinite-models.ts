import { useInfiniteQuery } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { listModels } from '@/server/functions/models'
import { MODELS_QUERY_KEY } from './use-delete-model'

type UseInfiniteModelsParams = {
  search?: string
  tags?: string[]
  limit?: number
}

export const useInfiniteModels = ({
  search,
  tags,
  limit = 12,
}: UseInfiniteModelsParams) => {
  const { data: session } = authClient.useSession()
  const { data: activeOrg } = authClient.useActiveOrganization()

  const isAuthenticated = Boolean(session?.user && activeOrg?.id)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error,
  } = useInfiniteQuery({
    queryKey: [...MODELS_QUERY_KEY, 'infinite', { search, tags, limit }],
    queryFn: ({ pageParam }) =>
      listModels({
        data: {
          cursor: pageParam,
          limit,
          search: search || undefined,
          tags: tags && tags.length > 0 ? tags : undefined,
        },
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isAuthenticated,
  })

  const allModels = data?.pages.flatMap((page) => page.models) ?? []

  return {
    models: allModels,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: !isAuthenticated || isLoading,
    isFetching,
    error,
  }
}
