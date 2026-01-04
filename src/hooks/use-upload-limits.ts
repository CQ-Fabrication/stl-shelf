import { useQuery } from "@tanstack/react-query";
import type { SubscriptionTier } from "@/lib/billing/config";
import { checkUploadLimits } from "@/server/functions/billing";

export type UploadLimitsResult = {
  tier: SubscriptionTier;
  isOwner: boolean;
  models: {
    current: number;
    limit: number;
    isUnlimited: boolean;
    blocked: boolean;
  };
  storage: {
    current: number;
    limit: number;
    blocked: boolean;
  };
  graceDeadline: string | null;
  blocked: boolean;
  blockReason: "model_limit" | "storage_limit" | null;
};

type UseUploadLimitsOptions = {
  enabled?: boolean;
};

export const useUploadLimits = (options: UseUploadLimitsOptions = {}) => {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ["upload-limits"],
    queryFn: () => checkUploadLimits(),
    enabled,
    staleTime: 0, // Always fresh - critical for limit checking
    gcTime: 0, // Don't cache - we need real-time data
  });

  return {
    limits: query.data as UploadLimitsResult | undefined,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
