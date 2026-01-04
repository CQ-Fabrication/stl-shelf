/// <reference types="vite/client" />
import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AlertTriangle, Home, RotateCw } from "lucide-react";
import { GracePeriodBanner } from "@/components/billing/grace-period-banner";
import Header from "@/components/header";
import { NotFound } from "@/components/not-found";
import { Button } from "@/components/ui/button";
import { getSessionFn, listOrganizationsFn } from "@/server/functions/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import appCss from "@/styles.css?url";
import { useErrorReporting } from "@/hooks/use-error-reporting";

if (!import.meta.env.SSR) {
  void import("@/lib/error-tracking.client").then(({ initClientErrorTracking }) => {
    initClientErrorTracking();
  });
}

function RootErrorFallback({ error, reset }: ErrorComponentProps) {
  const isDev = import.meta.env.DEV;
  useErrorReporting(error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="font-bold text-2xl tracking-tight">Something went wrong</h1>
          <p className="text-muted-foreground">
            We encountered an unexpected error. Please try again or go back to the home page.
          </p>
        </div>

        {isDev && error instanceof Error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left">
            <p className="mb-2 font-mono font-semibold text-destructive text-sm">
              {error.name}: {error.message}
            </p>
            {error.stack && (
              <pre className="max-h-32 overflow-auto font-mono text-muted-foreground text-xs">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} variant="default">
            <RotateCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button asChild variant="outline">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
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
    // Skip auth check for public routes
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          storageKey="stl-shelf-theme"
        >
          <div className="grid h-svh grid-rows-[auto_1fr]">
            {PUBLIC_ROUTES.includes(pathname) ? null : (
              <>
                <Header />
                <GracePeriodBanner />
              </>
            )}
            {children}
          </div>
          <Toaster richColors />
        </ThemeProvider>
        <TanStackRouterDevtools position="bottom-left" />
        <ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
        <Scripts />
      </body>
    </html>
  );
}
