import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { RouterAppContext } from "@/routes/__root";
import { orpc } from "@/utils/orpc";

/**
 * Hook to check if the organization has any models in the library.
 * Makes a simple query with limit=1 to minimize data transfer.
 * Only runs when user is authenticated.
 */
export function useHasModels() {
  const router = useRouter();
  const { auth } = router.options.context as RouterAppContext;
  const { data: session } = auth.useSession();

  const { data, isLoading, error } = useQuery({
    ...orpc.models.listModels.queryOptions({
      input: { limit: 1 },
    }),
    // Only run if the user is authenticated
    enabled: Boolean(session?.user),
  });

  return {
    hasModels: (data?.models.length ?? 0) > 0,
    // isLoading is true if no session or actually loading
    isLoading: !session?.user || isLoading,
    error,
  };
}
