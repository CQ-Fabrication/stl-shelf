import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'

export type AuthenticatedContext = {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>
  organizationId: string
  userId: string
  ipAddress: string | null
}

/**
 * Auth middleware for protected server functions
 * Validates session and organization membership
 */
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest()
    const headers = request?.headers

    if (!headers) {
      throw new Error('Request headers not available')
    }

    const session = await auth.api.getSession({ headers })

    if (!session?.user?.id) {
      throw new Error('Authentication required')
    }

    const organizationId = session.session?.activeOrganizationId
    if (!organizationId) {
      throw new Error('No active organization')
    }

    // Get IP address from headers
    const ipAddress =
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      headers.get('x-real-ip') ??
      null

    return next({
      context: {
        session,
        organizationId,
        userId: session.user.id,
        ipAddress,
      } satisfies AuthenticatedContext,
    })
  }
)
