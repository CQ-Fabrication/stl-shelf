import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

export const useCustomerPortal = () => {
  const mutation = useMutation(
    orpc.billing.getPortalUrl.mutationOptions({
      onSuccess: (data) => {
        // Redirect to Better Auth portal
        window.location.href = data.portalUrl;
      },
      onError: (error) => {
        toast.error(`Failed to open portal: ${error.message}`);
      },
    })
  );

  return {
    openPortal: () => mutation.mutate({}),
    isLoading: mutation.isPending,
  };
};
