#!/usr/bin/env bun

import 'dotenv/config';
import { serve } from 'bun';
import { env } from './env';
import app from './index';
import { cacheService } from './services/cache';
import { storageService } from './services/storage';

const port = env.PORT;

// Initialize services before starting server
try {
  await cacheService.connect();
  await storageService.initialize();
  console.log(`🚀 Server starting on port ${port}`);
} catch (error) {
  console.error('❌ Failed to initialize services:', error);
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Shutting down gracefully...');
  await cacheService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 Shutting down gracefully...');
  await cacheService.disconnect();
  process.exit(0);
});

serve({
  port,
  fetch: app.fetch,
  error: (_error) => {
    return new Response('Internal Server Error', { status: 500 });
  },
});
