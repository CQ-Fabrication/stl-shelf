import { Polar } from '@polar-sh/sdk'
import { env } from '@/lib/env'

const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
})

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
      metadata: { organizationId },
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
  async createCheckoutSession(customerId: string, productSlug: string) {
    const checkout = await polarClient.checkouts.create({
      customerId,
      products: [productSlug],
    })
    return checkout
  },
}
