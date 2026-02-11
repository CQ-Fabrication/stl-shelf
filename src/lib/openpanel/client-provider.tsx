import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { OpenPanel } from "@openpanel/web";
import { authClient } from "@/lib/auth-client";
import { useActiveOrganization } from "@/hooks/use-organizations";
import { setSentryUser } from "@/lib/error-tracking.client";
import { getAttributionProfileProperties } from "./attribution";
import { getOpenPanelClient } from "./client";

type OpenPanelContextValue = {
  client: OpenPanel | null;
};

const OpenPanelContext = createContext<OpenPanelContextValue>({ client: null });

export function useOpenPanelClient() {
  return useContext(OpenPanelContext);
}

function OpenPanelUserSync({
  client,
  children,
}: {
  client: OpenPanel | null;
  children: ReactNode;
}) {
  const { data: session } = authClient.useSession();
  const { data: activeOrg } = useActiveOrganization();

  const userId = session?.user?.id;
  const activeOrgId = session?.session?.activeOrganizationId;

  const userKey = useMemo(
    () => (userId ? `${userId}-${activeOrgId ?? "none"}` : null),
    [userId, activeOrgId],
  );

  useEffect(() => {
    if (!client) return;

    if (!userKey || !session?.user) {
      client.clear();
      setSentryUser(null, null);
      return;
    }

    client.identify({
      profileId: session.user.id,
      properties: {
        organizationId: activeOrgId ?? undefined,
        plan: activeOrg?.subscriptionTier ?? "free",
        ...getAttributionProfileProperties(),
      },
    });

    setSentryUser(session.user.id, activeOrgId ?? null);
  }, [client, userKey, session, activeOrgId, activeOrg?.subscriptionTier]);

  useEffect(() => {
    if (!client || !userId) return;

    const now = Date.now();
    const storageKey = `openpanel:last-session:${userId}`;

    let isReturningUser = false;
    let daysSinceLastVisit: number | undefined;

    try {
      const previousTimestamp = window.localStorage.getItem(storageKey);
      if (previousTimestamp) {
        isReturningUser = true;
        const previousMs = Number(previousTimestamp);
        if (!Number.isNaN(previousMs) && previousMs > 0) {
          const msPerDay = 1000 * 60 * 60 * 24;
          daysSinceLastVisit = Math.max(0, Math.floor((now - previousMs) / msPerDay));
        }
      }

      window.localStorage.setItem(storageKey, String(now));
    } catch {
      // localStorage may be blocked in privacy modes - still emit minimal event
    }

    client.track("session_started", {
      isReturningUser,
      ...(daysSinceLastVisit !== undefined ? { daysSinceLastVisit } : {}),
    });
  }, [client, userId]);

  return <>{children}</>;
}

type OpenPanelProviderProps = {
  children: ReactNode;
};

export function OpenPanelProvider({ children }: OpenPanelProviderProps) {
  const [client, setClient] = useState<OpenPanel | null>(null);

  useEffect(() => {
    setClient(getOpenPanelClient());
  }, []);

  return (
    <OpenPanelContext.Provider value={{ client }}>
      <OpenPanelUserSync client={client}>{children}</OpenPanelUserSync>
    </OpenPanelContext.Provider>
  );
}
