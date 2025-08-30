import { createAuthClient } from 'better-auth/client';
import { organizationClient } from 'better-auth/client/plugins';

export const auth = createAuthClient({
  baseURL: `${import.meta.env.VITE_SERVER_URL}/auth`,
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [organizationClient()],
});
