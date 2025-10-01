import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export const useUsageStats = () => {
  const query = useQuery(orpc.billing.getUsageStats.queryOptions({}));

  return {
    usage: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
