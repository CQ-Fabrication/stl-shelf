import { createAuthClient } from 'better-auth/client';

export const auth = createAuthClient({
  baseURL: `${import.meta.env.VITE_SERVER_URL}/auth`,
  fetchOptions: {
    credentials: 'include',
  },
});
