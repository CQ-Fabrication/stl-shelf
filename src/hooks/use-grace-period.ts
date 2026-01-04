import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { checkUploadLimits } from "@/server/functions/billing";

type GracePeriodResult = {
  inGracePeriod: boolean;
  deadline: Date | null;
  daysRemaining: number;
  expired: boolean;
};

export const useGracePeriod = () => {
  const { data: session } = authClient.useSession();

  const query = useQuery({
    queryKey: ["grace-period"],
    queryFn: async () => {
      const limits = await checkUploadLimits();
      return calculateGracePeriod(limits.graceDeadline);
    },
    enabled: Boolean(session?.user),
    // Check every minute for real-time countdown
    refetchInterval: 60000,
  });

  return {
    gracePeriod: query.data ?? {
      inGracePeriod: false,
      deadline: null,
      daysRemaining: 0,
      expired: false,
    },
    isLoading: !session?.user || query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

function calculateGracePeriod(graceDeadline: string | null): GracePeriodResult {
  if (!graceDeadline) {
    return {
      inGracePeriod: false,
      deadline: null,
      daysRemaining: 0,
      expired: false,
    };
  }

  const deadline = new Date(graceDeadline);
  const now = new Date();
  const msRemaining = deadline.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const expired = msRemaining <= 0;

  return {
    inGracePeriod: true,
    deadline,
    daysRemaining,
    expired,
  };
}
