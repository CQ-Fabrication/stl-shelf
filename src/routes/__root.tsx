/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import { AuthQueryProvider } from '@daveyplate/better-auth-tanstack'
import { AuthUIProviderTanstack } from '@daveyplate/better-auth-ui/tanstack'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  redirect,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import Header from '@/components/header'
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
  auth: typeof authClient
}

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
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
  beforeLoad: async ({ context, location }) => {
    // Do not guard public routes
    if (PUBLIC_ROUTES.includes(location.pathname)) {
      return
    }

    // Check session first
    let session: Awaited<ReturnType<typeof context.auth.getSession>>['data']
    try {
      const { data } = await context.auth.getSession()
      session = data
    } catch (error) {
      console.error('Session check failed:', error)
      throw redirect({ to: '/login', replace: true })
    }

    // If no session, redirect to login
    if (!session) {
      throw redirect({ to: '/login', replace: true })
    }

    // Allow organization creation page for authenticated users
    if (location.pathname === '/organization/create') {
      return
    }

    // Check organizations for all other routes
    let organizations: Awaited<
      ReturnType<typeof context.auth.organization.list>
    >['data'] = []
    try {
      const { data } = await context.auth.organization.list()
      organizations = data
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
      throw redirect({ to: '/organization/create', replace: true })
    }

    // If no organizations, redirect to create one
    if (!organizations || organizations.length === 0) {
      throw redirect({ to: '/organization/create', replace: true })
    }

    // Check if there's an active organization in the session
    if (!session.session?.activeOrganizationId && organizations.length > 0) {
      try {
        await context.auth.organization.setActive({
          organizationId: organizations[0].id,
        })
      } catch (error) {
        console.error('Failed to set active organization:', error)
      }
    }
  },
  shellComponent: RootDocument,
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
