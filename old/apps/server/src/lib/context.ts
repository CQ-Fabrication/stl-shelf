import type { Auth } from "@/auth";

type BetterAuthSession = Auth["$Infer"]["Session"];

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
