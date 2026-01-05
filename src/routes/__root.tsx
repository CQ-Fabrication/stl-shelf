/// <reference types="vite/client" />
import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useMemo } from "react";
import { GracePeriodBanner } from "@/components/billing/grace-period-banner";
import { ConsentBanner } from "@/components/consent-banner";
import { ErrorPage } from "@/components/error-page";
import Header from "@/components/header";
import { NotFound } from "@/components/not-found";
import { PendingConsentHandler } from "@/components/pending-consent-handler";
import { generateErrorId } from "@/lib/error-id";
import { getSessionFn, listOrganizationsFn } from "@/server/functions/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { StatsigClientProvider } from "@/lib/statsig/client-provider";
import { PageTracker } from "@/lib/statsig/use-page-tracking";
import appCss from "@/styles.css?url";
import { useErrorReporting } from "@/hooks/use-error-reporting";

if (!import.meta.env.SSR) {
  import("@/lib/error-tracking.client")
    .then(({ initClientErrorTracking }) => {
      initClientErrorTracking();
    })
    .catch((err) => {
      console.error("Failed to initialize error tracking:", err);
    });
}

function RootErrorFallback({ error, reset }: ErrorComponentProps) {
  const routerState = useRouterState();
  const currentRoute = routerState.location.pathname;

  // Generate a stable error ID for this error instance
  const errorId = useMemo(() => generateErrorId(), []);

  // Try to get session info for error context (may be null if not authenticated)
  // Note: We don't use authClient.useSession() here because hooks might fail in error boundary
  // The session context will be null for unauthenticated users or if session fetch fails
  const sessionContext = useMemo(() => {
    // For now, we report without session context
    // The action context and device context are still captured
    return null;
  }, []);

  // Report error with enhanced context
  useErrorReporting(error, {
    errorId,
    route: currentRoute,
    session: sessionContext,
  });

  return <ErrorPage errorId={errorId} onRetry={reset} />;
}

export type RouterAppContext = {
  queryClient: QueryClient;
};

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-email-pending",
  "/about",
  "/pricing",
  "/privacy",
  "/terms",
];

// Routes that authenticated users should NOT access (redirect to /library)
const AUTH_ROUTES = ["/login", "/signup"];

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "STL Shelf",
      },
      {
        name: "description",
        content: "Your personal 3D model library, organized and versioned",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    // For auth routes, check if user is already logged in
    if (AUTH_ROUTES.includes(location.pathname)) {
      try {
        const session = await getSessionFn();
        if (session?.user) {
          throw redirect({ to: "/library", replace: true });
        }
      } catch (error) {
        // If it's a redirect, rethrow it
        if (error instanceof Response || (error as { to?: string })?.to) {
          throw error;
        }
        // Otherwise, let them access the auth page
      }
      return;
    }

    // Skip auth check for other public routes
    if (PUBLIC_ROUTES.includes(location.pathname)) {
      return;
    }

    // Get session using server function (has cookie access during SSR)
    let session: Awaited<ReturnType<typeof getSessionFn>> | null = null;
    try {
      session = await getSessionFn();
    } catch (error) {
      console.error("Session check failed:", error);
      throw redirect({ to: "/login", replace: true });
    }

    // If no session, redirect to login
    if (!session?.user) {
      throw redirect({ to: "/login", replace: true });
    }

    // Allow organization creation page for authenticated users
    if (location.pathname === "/organization/create") {
      return { session };
    }

    // Check organizations using server function
    let organizations: Array<{ id: string }> = [];
    try {
      const result = await listOrganizationsFn();
      organizations = result.organizations;
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
      throw redirect({ to: "/organization/create", replace: true });
    }

    // If no organizations, redirect to create one
    if (organizations.length === 0) {
      throw redirect({ to: "/organization/create", replace: true });
    }

    // activeOrganizationId is automatically set at session creation via databaseHooks
    // See src/lib/auth.ts databaseHooks.session.create.before

    return { session };
  },
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: RootErrorFallback,
});

function RootDocument({ children }: { children: ReactNode }) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isNotFound = routerState.matches.some((match) => match.status === "notFound");
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Don't show protected route UI on public routes or 404 pages
  const showProtectedUI = !isPublicRoute && !isNotFound;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <StatsigClientProvider>
          <PageTracker />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            disableTransitionOnChange
            storageKey="stl-shelf-theme"
          >
            <div className="grid h-svh grid-rows-[auto_1fr]">
              {showProtectedUI && (
                <>
                  <Header />
                  <GracePeriodBanner />
                  <ConsentBanner />
                  <PendingConsentHandler />
                </>
              )}
              {children}
            </div>
            <Toaster richColors />
          </ThemeProvider>
          <TanStackRouterDevtools position="bottom-left" />
          <ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
        </StatsigClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
