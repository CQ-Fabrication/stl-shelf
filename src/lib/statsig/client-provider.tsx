import { type ReactNode, useEffect, useMemo } from "react";
import { StatsigProvider, useStatsigClient } from "@statsig/react-bindings";
import type { StatsigOptions } from "@statsig/js-client";
import { authClient } from "@/lib/auth-client";
import { useActiveOrganization } from "@/hooks/use-organizations";

type StatsigClientProviderProps = {
  children: ReactNode;
};

/**
 * Syncs auth session with Statsig user.
 * Called inside StatsigProvider to access the client.
 *
 * Optimization: Uses stable userKey to prevent unnecessary Statsig updates.
 * Only updates when user identity or plan changes, not on unrelated session changes.
 */
function StatsigUserSync({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  const { data: activeOrg } = useActiveOrganization();
  const { client } = useStatsigClient();

  // Derive stable key from essential identifiers to reduce re-renders
  const userKey = useMemo(
    () =>
      session?.user
        ? `${session.user.id}-${session.session.activeOrganizationId ?? "none"}`
        : null,
    [session?.user?.id, session?.session?.activeOrganizationId]
  );

  useEffect(() => {
    if (!userKey || !session?.user) return;

    // User logged in - update Statsig with authenticated user
    // Note: Email intentionally omitted for GDPR/privacy compliance
    client.updateUserSync({
      userID: session.user.id,
      custom: {
        organizationId: session.session.activeOrganizationId ?? undefined,
        plan: activeOrg?.subscriptionTier ?? "free",
      },
    });
  }, [userKey, activeOrg?.subscriptionTier, client, session]);

  return <>{children}</>;
}

/**
 * Statsig client-side provider for analytics and feature flags.
 *
 * - Initializes with anonymous user (Statsig auto-generates stableID)
 * - When session loads, updates to authenticated user via StatsigUserSync
 */
export function StatsigClientProvider({ children }: StatsigClientProviderProps) {
  const clientKey = import.meta.env.VITE_STATSIG_CLIENT_KEY;

  // Determine environment tier from Vite mode
  const options = useMemo<StatsigOptions>(() => {
    const mode = import.meta.env.MODE;
    const tier =
      mode === "production"
        ? "production"
        : mode === "test"
          ? "staging"
          : "development";

    return {
      environment: { tier },
    };
  }, []);

  // If no client key configured, render children without Statsig
  if (!clientKey) {
    return <>{children}</>;
  }

  return (
    <StatsigProvider sdkKey={clientKey} user={{}} options={options}>
      <StatsigUserSync>{children}</StatsigUserSync>
    </StatsigProvider>
  );
}
