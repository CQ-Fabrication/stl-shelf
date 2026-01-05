import { infiniteQueryOptions } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { listModels, getAllTags } from "@/server/functions/models";
import { ModelGrid } from "@/components/models/model-grid";
import { SearchFilterBar } from "@/components/models/search-filter-bar";
import { useHasModels, hasModelsQueryOptions } from "@/hooks/use-has-models";
import { MODELS_QUERY_KEY } from "@/hooks/use-delete-model";

// Search params schema for URL state
// Handle both string and array inputs (TanStack Router may parse [] as array)
export const librarySearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  // Handle both ?tags=a,b,c (string) and ?tags=a&tags=b (array) formats
  tags: z
    .union([
      z.array(z.string()).transform((arr) => arr.filter(Boolean).join(",") || undefined),
      z.string().transform((val) => val || undefined),
    ])
    .optional()
    .catch(undefined),
});

export type LibrarySearch = z.infer<typeof librarySearchSchema>;

// Parse tags string to array (handles comma-separated values)
const parseTags = (tagsString?: string): string[] | undefined => {
  if (!tagsString) return undefined;
  const tags = tagsString.split(",").filter(Boolean);
  return tags.length > 0 ? tags : undefined;
};

// Query options for models - used in both loader and hooks
export const modelsQueryOptions = (search?: string, tagsString?: string) => {
  const tags = parseTags(tagsString);
  return infiniteQueryOptions({
    queryKey: [...MODELS_QUERY_KEY, "infinite", { search, tags, limit: 12 }],
    queryFn: ({ pageParam }) =>
      listModels({
        data: {
          cursor: pageParam,
          limit: 12,
          search: search || undefined,
          tags,
        },
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
};

// Query options for tags
export const tagsQueryOptions = () => ({
  queryKey: ["tags"],
  queryFn: () => getAllTags(),
});

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  validateSearch: librarySearchSchema,
  // Extract search params as loader dependencies
  loaderDeps: ({ search }) => ({
    q: search.q,
    tags: search.tags,
  }),
  loader: async ({ context, deps }) => {
    // Prefetch all queries for SSR - no loading states on initial render
    await Promise.all([
      context.queryClient.ensureInfiniteQueryData(modelsQueryOptions(deps.q, deps.tags)),
      context.queryClient.ensureQueryData(tagsQueryOptions()),
      context.queryClient.ensureQueryData(hasModelsQueryOptions()),
    ]);
  },
  component: LibraryPage,
});

function LibraryPage() {
  const { hasModels, isLoading } = useHasModels();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="mb-2 font-bold text-3xl">My Library</h1>
        <p className="text-muted-foreground">
          Your personal 3D model library, organized and versioned.
        </p>
      </div>

      <div className="space-y-6">
        {!isLoading && hasModels && <SearchFilterBar />}
        <ModelGrid />
      </div>
    </div>
  );
}
