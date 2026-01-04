import { useInfiniteQuery } from "@tanstack/react-query";
import { listModels } from "@/server/functions/models";
import { MODELS_QUERY_KEY } from "./use-delete-model";

type UseInfiniteModelsParams = {
  search?: string;
  tagsString?: string;
  limit?: number;
};

// Parse tags string to array (same logic as in library route)
const parseTags = (tagsString?: string): string[] | undefined => {
  if (!tagsString) return undefined;
  const tags = tagsString.split(",").filter(Boolean);
  return tags.length > 0 ? tags : undefined;
};

export const useInfiniteModels = ({ search, tagsString, limit = 12 }: UseInfiniteModelsParams) => {
  const tags = parseTags(tagsString);

  // No `enabled` check needed - the route is already protected by beforeLoad auth.
  // SSR loader prefetches data, client hydrates from cache.
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching, error } =
    useInfiniteQuery({
      queryKey: [...MODELS_QUERY_KEY, "infinite", { search, tags, limit }],
      queryFn: ({ pageParam }) =>
        listModels({
          data: {
            cursor: pageParam,
            limit,
            search: search || undefined,
            tags,
          },
        }),
      initialPageParam: undefined as number | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

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
