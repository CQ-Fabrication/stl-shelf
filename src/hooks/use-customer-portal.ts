import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getPortalUrl } from "@/server/functions/billing";

export const useCustomerPortal = () => {
  const mutation = useMutation({
    mutationFn: () => getPortalUrl(),
    onSuccess: (data) => {
      window.location.href = data.portalUrl;
    },
    onError: (error) => {
      console.error("Portal error:", error);
      toast.error("Failed to open billing portal. Please try again.");
    },
  });

  return {
    openPortal: () => mutation.mutate(),
    isLoading: mutation.isPending,
  };
};
