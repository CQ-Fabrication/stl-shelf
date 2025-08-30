import { createORPCClient } from '@orpc/client';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  redirect,
  Scripts,
  useRouterState,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router';
import { useState } from 'react';
import Header from '@/components/header';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { link, type orpc } from '@/utils/orpc';
import type { AppRouterClient } from '../../../server/src/routers';
import '../index.css';

export type RouterAppContext = {
  orpc: typeof orpc;
  queryClient: QueryClient;
  auth: typeof import('../lib/auth').auth;
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  // Global auth wall: everything except /login and /signup requires a session
  beforeLoad: async ({ context, location }) => {
    // Do not guard public auth routes
    if (location.pathname === '/login' || location.pathname === '/signup')
      return;

    // Check session first
    let session: ReturnType<typeof context.auth.getSession>['data'];
    try {
      const { data } = await context.auth.getSession();
      session = data;
    } catch (error) {
      console.error('Session check failed:', error);
      throw redirect({ to: '/login', replace: true });
    }

    // If no session, redirect to login
    if (!session) {
      throw redirect({ to: '/login', replace: true });
    }

    // Allow organization creation page for authenticated users
    if (location.pathname === '/organization/create') {
      return; // User is authenticated, allow access
    }

    // Check organizations for all other routes
    let organizations: ReturnType<
      typeof context.auth.organization.list
    >['data'] = [];
    try {
      const { data } = await context.auth.organization.list();
      organizations = data;
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      // If we can't fetch organizations, redirect to org creation as a safe fallback
      throw redirect({ to: '/organization/create', replace: true });
    }

    // If no organizations, redirect to create one
    if (!organizations || organizations.length === 0) {
      console.log('No organizations found, redirecting to create');
      throw redirect({ to: '/organization/create', replace: true });
    }

    // Check if there's an active organization in the session
    if (!session.session?.activeOrganizationId && organizations.length > 0) {
      try {
        // Set the first organization as active if none is set
        await context.auth.organization.setActive({
          organizationId: organizations[0].id,
        });
      } catch (error) {
        console.error('Failed to set active organization:', error);
        // Continue anyway, the user can manually select
      }
    }
  },
  head: () => ({
    meta: [
      {
        title: 'STL Shelf',
      },
      {
        name: 'description',
        content: 'Your personal 3D model library, organized and versioned',
      },
    ],
    links: [
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
    ],
    scripts: [
      {
        src: 'https://unpkg.com/react-scan/dist/auto.global.js',
      },
    ],
  }),
});

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [client] = useState<AppRouterClient>(() => createORPCClient(link));
  const [_orpcUtils] = useState(() => createTanstackQueryUtils(client));

  return (
    <>
      <HeadContent />
      <NuqsAdapter>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          storageKey="vite-ui-theme"
        >
          <div className="grid h-svh grid-rows-[auto_1fr]">
            {pathname === '/login' || pathname === '/signup' ? null : (
              <Header />
            )}
            <Outlet />
            <Scripts />
          </div>
          <Toaster richColors />
        </ThemeProvider>
      </NuqsAdapter>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
    </>
  );
}
