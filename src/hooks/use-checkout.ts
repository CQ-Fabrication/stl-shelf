import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SubscriptionProductSlug } from "@/lib/billing/config";
import { getLastTouchAttribution } from "@/lib/openpanel/attribution";
import { trackPricingInteraction } from "@/lib/openpanel/client-events";
import { useOpenPanelClient } from "@/lib/openpanel/client-provider";
import { createCheckout } from "@/server/functions/billing";

export const useCheckout = () => {
  const { client } = useOpenPanelClient();
  const [loadingProductSlug, setLoadingProductSlug] = useState<SubscriptionProductSlug | null>(
    null,
  );

  const mutation = useMutation({
    mutationFn: (productSlug: SubscriptionProductSlug) =>
      createCheckout({
        data: {
          productSlug,
          campaign: getLastTouchAttribution(),
        },
      }),
    onSuccess: (data, productSlug) => {
      trackPricingInteraction(client, `checkout_redirect_${productSlug}`);
      window.location.href = data.checkoutUrl;
    },
    onError: (error, productSlug) => {
      setLoadingProductSlug(null);
      trackPricingInteraction(client, `checkout_failed_${productSlug}`);
      if (error instanceof Error && error.message) {
        toast.error(error.message);
        return;
      }
      toast.error("Unable to start checkout. Please try again later.");
    },
  });

  const startCheckout = (productSlug: SubscriptionProductSlug) => {
    setLoadingProductSlug(productSlug);
    mutation.mutate(productSlug);
  };

  return {
    startCheckout,
    loadingProductSlug,
    isLoading: mutation.isPending,
  };
};
