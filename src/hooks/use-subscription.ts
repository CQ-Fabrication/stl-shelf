import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { getSubscription } from "@/server/functions/billing";

export const useSubscription = () => {
  const { data: session } = authClient.useSession();

  const query = useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: () => getSubscription(),
    enabled: Boolean(session?.user),
  });

  return {
    subscription: query.data,
    isLoading: !session?.user || query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
