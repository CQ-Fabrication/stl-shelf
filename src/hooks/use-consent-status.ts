import { useQuery } from "@tanstack/react-query";
import { checkConsentValidityFn } from "@/server/functions/consent";

/**
 * Hook to check if the current user's consent is valid and up-to-date.
 * Returns consent validity status for use in consent banners and guards.
 */
export function useConsentStatus() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["consent-validity"],
    queryFn: () => checkConsentValidityFn(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    isLoading,
    isValid: data?.valid ?? true, // Assume valid while loading
    reason: data?.reason ?? null,
    currentVersion: data && "currentVersion" in data ? data.currentVersion : null,
    userVersion: data && "userVersion" in data ? data.userVersion : null,
    // Return undefined when not available, so components can distinguish from explicit false
    marketingAccepted:
      data && "marketingAccepted" in data ? (data.marketingAccepted as boolean) : undefined,
    refetch,
  };
}
