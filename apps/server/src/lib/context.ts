import type { auth } from "@/auth";

type BetterAuthSession = typeof auth.$Infer.Session;

export type Session = BetterAuthSession & {
  session: BetterAuthSession["session"] & {
    activeOrganizationId?: string;
  };
};

export type BaseContext = {
  session: Session | null;
  ipAddress?: string | null;
};

export type AuthenticatedContext = {
  session: Session;
  organizationId: string;
  ipAddress?: string | null;
};
