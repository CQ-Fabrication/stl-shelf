import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { RouterAppContext } from "@/routes/__root";
import { orpc } from "@/utils/orpc";

export const useUsageStats = () => {
  const router = useRouter();
  const { auth } = router.options.context as RouterAppContext;
  const { data: session } = auth.useSession();

  const query = useQuery({
    ...orpc.billing.getUsageStats.queryOptions({}),
    enabled: Boolean(session?.user),
  });

  return {
    usage: query.data,
    isLoading: !session?.user || query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
