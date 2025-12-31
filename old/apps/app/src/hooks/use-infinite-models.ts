import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { RouterAppContext } from "@/routes/__root";
import { orpc } from "@/utils/orpc";

type UseInfiniteModelsParams = {
  search?: string;
  tags?: string[];
  limit?: number;
};

export const useInfiniteModels = ({
  search,
  tags,
  limit = 12,
}: UseInfiniteModelsParams) => {
  const router = useRouter();
  const { auth } = router.options.context as RouterAppContext;
  const { data: session } = auth.useSession();
  const { data: activeOrg } = auth.useActiveOrganization();

  const isAuthenticated = Boolean(session?.user && activeOrg?.id);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error,
  } = useInfiniteQuery({
    ...orpc.models.listModels.infiniteOptions({
      input: (cursor: number | undefined) => ({
        cursor,
        limit,
        search: search || undefined,
        tags: tags && tags.length > 0 ? tags : undefined,
      }),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }),
    enabled: isAuthenticated,
  });

  const allModels = data?.pages.flatMap((page) => page.models) ?? [];

  return {
    models: allModels,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: !isAuthenticated || isLoading,
    isFetching,
    error,
  };
};
