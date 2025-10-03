import { useInfiniteQuery } from "@tanstack/react-query";
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
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error,
  } = useInfiniteQuery(
    orpc.models.listModels.infiniteOptions({
      input: (cursor: number | undefined) => ({
        cursor,
        limit,
        search: search || undefined,
        tags: tags && tags.length > 0 ? tags : undefined,
      }),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    })
  );

  const allModels = data?.pages.flatMap((page) => page.models) ?? [];

  return {
    models: allModels,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error,
  };
};
