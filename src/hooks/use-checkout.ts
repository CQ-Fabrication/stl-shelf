import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SubscriptionTier } from "@/lib/billing/config";
import { createCheckout } from "@/server/functions/billing";

export const useCheckout = () => {
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);

  const mutation = useMutation({
    mutationFn: (productSlug: SubscriptionTier) => createCheckout({ data: { productSlug } }),
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
    onError: () => {
      setLoadingTier(null);
      toast.error("Unable to start checkout. Please try again later.");
    },
  });

  const startCheckout = (productSlug: SubscriptionTier) => {
    setLoadingTier(productSlug);
    mutation.mutate(productSlug);
  };

  return {
    startCheckout,
    loadingTier,
    isLoading: mutation.isPending,
  };
};
