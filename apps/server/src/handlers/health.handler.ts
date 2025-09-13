import type { Context } from 'hono';
import { cacheService } from '@/services/cache';
import { storageService } from '@/services/storage';

export async function healthHandler(c: Context) {
  // Health check for all services
  const health = {
    cache: await cacheService.health(),
    storage: await storageService.health(),
    timestamp: new Date().toISOString(),
  };

  const isHealthy =
    health.cache.status === 'healthy' && health.storage.status === 'healthy';

  const servicesHealth = {
    ...health,
    overall: isHealthy ? 'healthy' : 'unhealthy',
  };

  return c.json({
    status: servicesHealth.overall,
    service: 'STL Shelf API',
    services: servicesHealth,
  });
}