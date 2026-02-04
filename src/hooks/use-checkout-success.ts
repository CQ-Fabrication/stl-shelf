import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRedirectCountdown } from "@/hooks/use-redirect-countdown";
import { syncCustomerState } from "@/server/functions/billing";

type CheckoutSuccessOptions = {
  checkoutId?: string;
  redirectSeconds?: number;
  onRedirect?: () => void;
};

export function useCheckoutSuccess({
  checkoutId,
  redirectSeconds,
  onRedirect,
}: CheckoutSuccessOptions) {
  const queryClient = useQueryClient();
  const { secondsLeft, progress } = useRedirectCountdown({
    seconds: redirectSeconds,
    onRedirect,
  });

  useEffect(() => {
    const runSync = async () => {
      if (checkoutId) {
        try {
          await syncCustomerState();
        } catch (error) {
          console.warn("Failed to sync subscription state after checkout:", error);
        }
      }

      queryClient.invalidateQueries({
        queryKey: ["billing"],
      });
      queryClient.invalidateQueries({
        queryKey: ["upload-limits"],
      });
      queryClient.invalidateQueries({
        queryKey: ["grace-period"],
      });
    };

    runSync();
  }, [checkoutId, queryClient]);

  return { secondsLeft, progress };
}
