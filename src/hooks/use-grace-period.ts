import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { getRetentionDeadline } from "@/lib/billing/grace";
import { checkUploadLimits } from "@/server/functions/billing";

type GracePeriodResult = {
  status: "none" | "grace" | "retention" | "expired";
  graceDeadline: Date | null;
  retentionDeadline: Date | null;
  daysRemaining: number;
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
      status: "none",
      graceDeadline: null,
      retentionDeadline: null,
      daysRemaining: 0,
    },
    isLoading: !session?.user || query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

function calculateGracePeriod(graceDeadline: string | null): GracePeriodResult {
  if (!graceDeadline) {
    return {
      status: "none",
      graceDeadline: null,
      retentionDeadline: null,
      daysRemaining: 0,
    };
  }

  const graceDate = new Date(graceDeadline);
  const retentionDate = getRetentionDeadline(graceDate);
  const now = new Date();

  if (now.getTime() <= graceDate.getTime()) {
    const msRemaining = graceDate.getTime() - now.getTime();
    return {
      status: "grace",
      graceDeadline: graceDate,
      retentionDeadline: retentionDate,
      daysRemaining: Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24))),
    };
  }

  if (now.getTime() <= retentionDate.getTime()) {
    const msRemaining = retentionDate.getTime() - now.getTime();
    return {
      status: "retention",
      graceDeadline: graceDate,
      retentionDeadline: retentionDate,
      daysRemaining: Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24))),
    };
  }

  return {
    status: "expired",
    graceDeadline: graceDate,
    retentionDeadline: retentionDate,
    daysRemaining: 0,
  };
}
