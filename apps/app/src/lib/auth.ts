import { polarClient } from "@polar-sh/better-auth";
import {
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const auth = createAuthClient({
  baseURL: `${import.meta.env.VITE_SERVER_URL}/api/auth`,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [magicLinkClient(), organizationClient(), polarClient()],
});

export type AuthClient = typeof auth;
