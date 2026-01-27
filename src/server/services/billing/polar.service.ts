import { Polar } from "@polar-sh/sdk";
import { env } from "@/lib/env";
import type { SubscriptionProductSlug } from "@/lib/billing/config";

const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.POLAR_SERVER,
});

/**
 * Get Polar product ID from tier slug
 */
function getProductIdFromSlug(slug: SubscriptionProductSlug): string | undefined {
  switch (slug) {
    case "free":
      return env.POLAR_PRODUCT_FREE;
    case "basic_month":
      return env.POLAR_PRODUCT_BASIC_MONTH ?? env.POLAR_PRODUCT_BASIC;
    case "basic_year":
      return env.POLAR_PRODUCT_BASIC_YEAR;
    case "pro_month":
      return env.POLAR_PRODUCT_PRO_MONTH ?? env.POLAR_PRODUCT_PRO;
    case "pro_year":
      return env.POLAR_PRODUCT_PRO_YEAR;
    default:
      return undefined;
  }
}

export const polarService = {
  /**
   * Create Polar customer for organization
   */
  async createCustomer(organizationId: string, organizationName: string, ownerEmail: string) {
    const customer = await polarClient.customers.create({
      email: ownerEmail,
      name: organizationName,
      externalId: organizationId,
    });
    return customer;
  },

  /**
   * Get customer subscription state
   */
  async getCustomerState(customerId: string) {
    const state = await polarClient.customers.get({ id: customerId });
    return state;
  },

  /**
   * Create checkout session
   */
  async createCheckoutSession(customerId: string, productSlug: SubscriptionProductSlug) {
    const productId = getProductIdFromSlug(productSlug);

    if (!productId) {
      throw new Error(`Product not configured for slug: ${productSlug}`);
    }

    const checkout = await polarClient.checkouts.create({
      customerId,
      products: [productId],
      successUrl: `${env.WEB_URL}/checkout/success?checkout_id={CHECKOUT_ID}`,
      returnUrl: `${env.WEB_URL}/billing`,
    });
    return checkout;
  },

  async getProduct(productId: string) {
    return polarClient.products.get({ id: productId });
  },

  async createCustomerPortalSession(externalCustomerId: string, returnUrl?: string) {
    return polarClient.customerSessions.create({
      externalCustomerId,
      returnUrl,
    });
  },
};
