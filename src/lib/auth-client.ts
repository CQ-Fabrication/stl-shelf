import { polarClient } from '@polar-sh/better-auth'
import {
  magicLinkClient,
  organizationClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

// Use full URL for SSR compatibility - relative URL doesn't work server-side
const getBaseURL = () => {
  // Client-side: use relative URL
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/auth`
  }
  // Server-side: use environment variable
  return `${process.env.AUTH_URL ?? 'http://localhost:3000'}/api/auth`
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [magicLinkClient(), organizationClient(), polarClient()],
})

export type AuthClient = typeof authClient
