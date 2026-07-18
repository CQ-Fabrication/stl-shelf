import { useQuery } from "@tanstack/react-query";
import { getPublicPricing } from "@/server/functions/pricing";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Client-side access to the public pricing data (Polar-backed, server-cached).
 * Shared react-query key + staleTime keep every surface on one cached fetch.
 */
export const usePublicPricing = () => {
  const query = useQuery({
    queryKey: ["billing", "public-pricing"],
    queryFn: () => getPublicPricing(),
    staleTime: FIVE_MINUTES_MS,
  });

  return {
    pricing: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};
