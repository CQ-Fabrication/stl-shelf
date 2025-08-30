import { createORPCClient } from '@orpc/client';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router';
import { redirect } from '@tanstack/react-router';
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
    if (location.pathname === '/login' || location.pathname === '/signup') return;
    try {
      const { data } = await context.auth.getSession();
      if (!data) {
        throw redirect({ to: '/login', replace: true });
      }
    } catch {
      throw redirect({ to: '/login', replace: true });
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
            {pathname === '/login' || pathname === '/signup' ? null : <Header />}
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
