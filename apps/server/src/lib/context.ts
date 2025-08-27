import type { Context as HonoContext } from 'hono';

export type CreateContextOptions = {
  context: HonoContext;
};

export function createContext(_options: CreateContextOptions) {
  return {
    session: null,
    // Services are now imported directly in handlers via singleton pattern
    // No need to pass them through context
  };
}

export type Context = ReturnType<typeof createContext>;
