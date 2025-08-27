#!/usr/bin/env bun

import 'dotenv/config';
import { serve } from 'bun';
import app from './index';

const port = Number.parseInt(process.env.PORT || '3000', 10);

serve({
  port,
  fetch: app.fetch,
  error: (_error) => {
    return new Response('Internal Server Error', { status: 500 });
  },
});
