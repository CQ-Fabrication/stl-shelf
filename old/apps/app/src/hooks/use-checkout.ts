import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SubscriptionTier } from "@/lib/billing/config";
import { orpc } from "@/utils/orpc";

export const useCheckout = () => {
  const mutation = useMutation(
    orpc.billing.createCheckout.mutationOptions({
      onSuccess: (data) => {
        // Redirect to Polar checkout
        window.location.href = data.checkoutUrl;
      },
      onError: (error) => {
        toast.error(`Checkout failed: ${error.message}`);
      },
    })
  );

  return {
    startCheckout: (productSlug: SubscriptionTier) =>
      mutation.mutate({ productSlug }),
    isLoading: mutation.isPending,
  };
};
