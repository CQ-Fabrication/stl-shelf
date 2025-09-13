import { publicProcedure } from '@/lib/orpc';

export const healthRouter = {
  healthCheck: publicProcedure.handler(() => {
    return 'OK';
  }),
};