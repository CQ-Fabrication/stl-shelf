import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { OpenPanel } from "@openpanel/web";
import { authClient } from "@/lib/auth-client";
import { useActiveOrganization } from "@/hooks/use-organizations";
import { setSentryUser } from "@/lib/error-tracking.client";
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
      },
    });

    setSentryUser(session.user.id, activeOrgId ?? null);
  }, [client, userKey, session, activeOrgId, activeOrg?.subscriptionTier]);

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
