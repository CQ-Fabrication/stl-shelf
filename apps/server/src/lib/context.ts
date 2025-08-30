import type { Context as HonoContext } from 'hono';

export type CreateContextOptions = {
  context: HonoContext;
};

export function createContext(_options: CreateContextOptions) {
  const session = _options.context.get('session');
  return {
    session,
  };
}

export type Context = ReturnType<typeof createContext>;
