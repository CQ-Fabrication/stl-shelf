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
import { AccountDeletionBanner } from "@/components/account-deletion-banner";
import { GracePeriodBanner } from "@/components/billing/grace-period-banner";
import { ConsentBanner } from "@/components/consent-banner";
import { ErrorPage } from "@/components/error-page";
import Header from "@/components/header";
import { MarketingConsentBanner } from "@/components/marketing-consent-banner";
import { NotFound } from "@/components/not-found";
import { PendingConsentHandler } from "@/components/pending-consent-handler";
import { generateErrorId } from "@/lib/error-id";
import { getSessionFn, listOrganizationsFn } from "@/server/functions/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { OpenPanelProvider } from "@/lib/openpanel/client-provider";
import { PageTracker } from "@/lib/openpanel/use-page-tracking";
import { useErrorReporting } from "@/hooks/use-error-reporting";
import "@/styles.css";

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
  "/organize-stl-files",
  "/self-hosted-3d-model-library",
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
        title: "STL Shelf - 3D Model Library for Makers",
      },
      {
        name: "description",
        content:
          "Cloud or self-hosted 3D model library for makers. Version control, 3D preview, and smart organization for your STL, 3MF, and OBJ files.",
      },
      // Open Graph
      {
        property: "og:title",
        content: "STL Shelf - 3D Model Library for Makers",
      },
      {
        property: "og:description",
        content:
          "Cloud or self-hosted 3D model library for makers. Version control, 3D preview, and smart organization for your STL, 3MF, and OBJ files.",
      },
      {
        property: "og:image",
        content: "https://stl-shelf.com/og-image.svg",
      },
      {
        property: "og:url",
        content: "https://stl-shelf.com",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:site_name",
        content: "STL Shelf",
      },
      // Twitter Card
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:site",
        content: "@cqfabrication",
      },
      {
        name: "twitter:title",
        content: "STL Shelf - 3D Model Library for Makers",
      },
      {
        name: "twitter:description",
        content:
          "Cloud or self-hosted 3D model library for makers. Version control, 3D preview, and smart organization for your STL, 3MF, and OBJ files.",
      },
      {
        name: "twitter:image",
        content: "https://stl-shelf.com/og-image.svg",
      },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico" },
      { rel: "manifest", href: "/manifest.json" },
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
        <OpenPanelProvider>
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
                  <AccountDeletionBanner />
                  <GracePeriodBanner />
                  <ConsentBanner />
                  <PendingConsentHandler />
                  <MarketingConsentBanner />
                </>
              )}
              {children}
            </div>
            <Toaster richColors />
          </ThemeProvider>
          <TanStackRouterDevtools position="bottom-left" />
          <ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
        </OpenPanelProvider>
        <Scripts />
      </body>
    </html>
  );
}
