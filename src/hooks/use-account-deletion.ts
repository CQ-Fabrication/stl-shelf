import { useQuery } from "@tanstack/react-query";
import { getAccountDeletionStatus } from "@/server/functions/account-deletion";

export type AccountDeletionStatus = {
  status: "none" | "scheduled" | "canceled" | "completed";
  requestedAt: Date | null;
  deadline: Date | null;
  daysRemaining: number | null;
  ownedOrganizationCount: number;
};

const calculateDaysRemaining = (deadline: Date | null) => {
  if (!deadline) return null;
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
};

export const useAccountDeletion = () => {
  const query = useQuery({
    queryKey: ["account-deletion"],
    queryFn: () => getAccountDeletionStatus(),
    staleTime: 0,
    gcTime: 0,
  });

  const raw = query.data;
  const deadline = raw?.deadline ? new Date(raw.deadline) : null;
  const requestedAt = raw?.requestedAt ? new Date(raw.requestedAt) : null;

  return {
    status: (raw?.status ?? "none") as AccountDeletionStatus["status"],
    requestedAt,
    deadline,
    daysRemaining: calculateDaysRemaining(deadline),
    ownedOrganizationCount: raw?.ownedOrganizationCount ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};
