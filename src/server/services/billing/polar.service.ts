import { Polar } from '@polar-sh/sdk'
import { env } from '@/lib/env'
import type { SubscriptionTier } from '@/lib/billing/config'

const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
})

/**
 * Get Polar product ID from tier slug
 */
function getProductIdFromSlug(slug: SubscriptionTier): string | undefined {
  switch (slug) {
    case 'free':
      return env.POLAR_PRODUCT_FREE
    case 'basic':
      return env.POLAR_PRODUCT_BASIC
    case 'pro':
      return env.POLAR_PRODUCT_PRO
    default:
      return undefined
  }
}

export const polarService = {
  /**
   * Create Polar customer for organization
   */
  async createCustomer(
    organizationId: string,
    organizationName: string,
    ownerEmail: string
  ) {
    const customer = await polarClient.customers.create({
      email: ownerEmail,
      name: organizationName,
      externalId: organizationId,
    })
    return customer
  },

  /**
   * Get customer subscription state
   */
  async getCustomerState(customerId: string) {
    const state = await polarClient.customers.get({ id: customerId })
    return state
  },

  /**
   * Create checkout session
   */
  async createCheckoutSession(customerId: string, tierSlug: SubscriptionTier) {
    const productId = getProductIdFromSlug(tierSlug)

    if (!productId) {
      throw new Error(`Product not configured for tier: ${tierSlug}`)
    }

    const checkout = await polarClient.checkouts.create({
      customerId,
      products: [productId],
    })
    return checkout
  },
}
