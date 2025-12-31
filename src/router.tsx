import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

export function getRouter() {
  const router = createRouter({
    routeTree,
    context: {
      queryClient,
      auth: authClient,
    },
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
