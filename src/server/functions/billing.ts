import { createServerFn } from '@tanstack/react-start'
import { zodValidator } from '@tanstack/zod-adapter'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { organization } from '@/lib/db/schema/auth'
import type { SubscriptionTier } from '@/lib/billing/config'
import { getTierConfig } from '@/lib/billing/config'
import type { AuthenticatedContext } from '@/server/middleware/auth'
import { authMiddleware } from '@/server/middleware/auth'
import { polarService } from '@/server/services/billing/polar.service'

const createCheckoutSchema = z.object({
  productSlug: z.enum(['free', 'basic', 'pro']),
})

// Get current subscription info
export const getSubscription = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }: { context: AuthenticatedContext }) => {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, context.organizationId),
    })

    if (!org) {
      throw new Error('Organization not found')
    }

    const tier = org.subscriptionTier as SubscriptionTier
    const tierConfig = getTierConfig(tier)

    return {
      tier,
      status: org.subscriptionStatus,
      isOwner: org.ownerId === context.session.user.id,

      // Limits
      storageLimit: org.storageLimit,
      modelCountLimit: org.modelCountLimit,
      memberLimit: org.memberLimit,

      // Current usage
      currentStorage: org.currentStorage,
      currentModelCount: org.currentModelCount,
      currentMemberCount: org.currentMemberCount,

      // Tier details
      tierConfig,
    }
  })

// Get usage statistics
export const getUsageStats = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }: { context: AuthenticatedContext }) => {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, context.organizationId),
    })

    if (!org) {
      throw new Error('Organization not found')
    }

    const currentStorage = org.currentStorage ?? 0
    const storageLimit = org.storageLimit ?? 1
    const currentModelCount = org.currentModelCount ?? 0
    const modelCountLimit = org.modelCountLimit ?? 1
    const currentMemberCount = org.currentMemberCount ?? 0
    const memberLimit = org.memberLimit ?? 1

    return {
      storage: {
        used: currentStorage,
        limit: storageLimit,
        percentage: Math.min((currentStorage / storageLimit) * 100, 100),
      },
      models: {
        used: currentModelCount,
        limit: modelCountLimit,
        percentage: Math.min((currentModelCount / modelCountLimit) * 100, 100),
      },
      members: {
        used: currentMemberCount,
        limit: memberLimit,
        percentage: Math.min((currentMemberCount / memberLimit) * 100, 100),
      },
    }
  })

// Create checkout session (owner only)
export const createCheckout = createServerFn({ method: 'POST' })
  .inputValidator(zodValidator(createCheckoutSchema))
  .middleware([authMiddleware])
  .handler(
    async ({
      data,
      context,
    }: {
      data: z.infer<typeof createCheckoutSchema>
      context: AuthenticatedContext
    }) => {
      const org = await db.query.organization.findFirst({
        where: eq(organization.id, context.organizationId),
      })

      if (!org) {
        throw new Error('Organization not found')
      }

      // Only owner can manage billing
      if (org.ownerId !== context.session.user.id) {
        throw new Error('Only organization owner can manage billing')
      }

      // Create Polar customer if doesn't exist
      let customerId = org.polarCustomerId
      if (!customerId) {
        const customer = await polarService.createCustomer(
          org.id,
          org.name,
          context.session.user.email
        )
        customerId = customer.id

        await db
          .update(organization)
          .set({ polarCustomerId: customerId })
          .where(eq(organization.id, org.id))
      }

      // Create checkout session
      const checkout = await polarService.createCheckoutSession(
        customerId,
        data.productSlug
      )

      return { checkoutUrl: checkout.url }
    }
  )

// Get customer portal URL (owner only)
export const getPortalUrl = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }: { context: AuthenticatedContext }) => {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, context.organizationId),
    })

    if (!org) {
      throw new Error('Organization not found')
    }

    // Only owner can access billing portal
    if (org.ownerId !== context.session.user.id) {
      throw new Error('Only organization owner can access billing portal')
    }

    if (!org.polarCustomerId) {
      throw new Error('No subscription found')
    }

    // Return Better Auth portal URL
    return {
      portalUrl: `/api/auth/portal?customerId=${org.polarCustomerId}`,
    }
  })
