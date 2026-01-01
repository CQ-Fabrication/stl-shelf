/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import { AuthQueryProvider } from '@daveyplate/better-auth-tanstack'
import { AuthUIProviderTanstack } from '@daveyplate/better-auth-ui/tanstack'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
  redirect,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import Header from '@/components/header'
import { NotFound } from '@/components/not-found'
import {
  getSessionFn,
  listOrganizationsFn,
  setActiveOrganizationFn,
} from '@/server/functions/auth'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { authClient } from '@/lib/auth-client'
import appCss from '@/styles.css?url'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
    },
  },
})

export type RouterAppContext = {
  queryClient: QueryClient
}

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/verify-email-pending',
  '/about',
  '/pricing',
  '/privacy',
  '/terms',
]

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'STL Shelf',
      },
      {
        name: 'description',
        content: 'Your personal 3D model library, organized and versioned',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  beforeLoad: async ({ location }) => {
    // Skip auth check for public routes
    if (PUBLIC_ROUTES.includes(location.pathname)) {
      return
    }

    // Get session using server function (has cookie access during SSR)
    let session: Awaited<ReturnType<typeof getSessionFn>> | null = null
    try {
      session = await getSessionFn()
    } catch (error) {
      console.error('Session check failed:', error)
      throw redirect({ to: '/login', replace: true })
    }

    // If no session, redirect to login
    if (!session?.user) {
      throw redirect({ to: '/login', replace: true })
    }

    // Allow organization creation page for authenticated users
    if (location.pathname === '/organization/create') {
      return { session }
    }

    // Check organizations using server function
    let organizations: Array<{ id: string }> = []
    try {
      const result = await listOrganizationsFn()
      organizations = result.organizations
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
      throw redirect({ to: '/organization/create', replace: true })
    }

    // If no organizations, redirect to create one
    if (organizations.length === 0) {
      throw redirect({ to: '/organization/create', replace: true })
    }

    // Set active organization if not set
    const firstOrg = organizations[0]
    if (!session.session?.activeOrganizationId && firstOrg) {
      try {
        await setActiveOrganizationFn({
          data: { organizationId: firstOrg.id },
        })
      } catch (error) {
        console.error('Failed to set active organization:', error)
      }
    }

    return { session }
  },
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const router = useRouter()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <NuqsAdapter>
            <AuthQueryProvider>
              <AuthUIProviderTanstack
                authClient={authClient}
                avatar={{
                  upload: (file: File) => {
                    return new Promise<string>((resolve, reject) => {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        resolve(reader.result as string)
                      }
                      reader.onerror = reject
                      reader.readAsDataURL(file)
                    })
                  },
                  size: 256,
                  extension: 'png',
                }}
                Link={({ href, ...props }) => <Link to={href} {...props} />}
                navigate={(href: string) => router.navigate({ to: href })}
                organization={{
                  logo: {
                    upload: (file: File) => {
                      return new Promise<string>((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          resolve(reader.result as string)
                        }
                        reader.onerror = reject
                        reader.readAsDataURL(file)
                      })
                    },
                    size: 256,
                    extension: 'png',
                  },
                }}
                replace={(href: string) =>
                  router.navigate({ to: href, replace: true })
                }
              >
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  disableTransitionOnChange
                  storageKey="stl-shelf-theme"
                >
                  <div className="grid h-svh grid-rows-[auto_1fr]">
                    {PUBLIC_ROUTES.includes(pathname) ? null : <Header />}
                    {children}
                  </div>
                  <Toaster richColors />
                </ThemeProvider>
              </AuthUIProviderTanstack>
            </AuthQueryProvider>
          </NuqsAdapter>
          <TanStackRouterDevtools position="bottom-left" />
          <ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
