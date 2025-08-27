import type { Context as HonoContext } from 'hono';

export type CreateContextOptions = {
  context: HonoContext;
};

export function createContext(_options: CreateContextOptions) {
  // No auth configured
  return {
    session: null,
  };
}

export type Context = ReturnType<typeof createContext>;
