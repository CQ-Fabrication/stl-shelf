import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export const useSubscription = () => {
  const query = useQuery(orpc.billing.getSubscription.queryOptions({}));

  return {
    subscription: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
