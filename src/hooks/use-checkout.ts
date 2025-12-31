import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { SubscriptionTier } from '@/lib/billing/config'
import { createCheckout } from '@/server/functions/billing'

export const useCheckout = () => {
  const mutation = useMutation({
    mutationFn: (productSlug: SubscriptionTier) => createCheckout({ data: { productSlug } }),
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl
    },
    onError: (error) => {
      toast.error(`Checkout failed: ${error.message}`)
    },
  })

  return {
    startCheckout: (productSlug: SubscriptionTier) => mutation.mutate(productSlug),
    isLoading: mutation.isPending,
  }
}
