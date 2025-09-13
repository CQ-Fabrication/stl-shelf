import { RedisClient } from 'bun';
import { env } from '../env';

const MILLISECONDS_TO_SECONDS = 1000;
const PRESIGNED_URL_BUFFER_MINUTES = 5;
const PRESIGNED_URL_EXPIRY_MULTIPLIER = 60;

export class CacheService {
  private redis: RedisClient | null = null;
  private readonly keyPrefix = 'stl-shelf:';
  private readonly defaultTTL: number;

  constructor() {
    this.defaultTTL = env.REDIS_TTL_DEFAULT;
  }

  async connect() {
    this.redis = new RedisClient(env.REDIS_URL);

    try {
      await this.redis.ping();
      console.log('Redis connected successfully');
    } catch (error) {
      console.error('Redis connection failed:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.redis) {
      this.redis.close();
      this.redis = null;
    }
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  // Basic cache operations
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) {
      return null;
    }

    try {
      const value = await this.redis.get(this.getKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds || this.defaultTTL;

      await this.redis.set(this.getKey(key), serialized, 'EX', ttl);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    try {
      const result = await this.redis.del(this.getKey(key));
      return result > 0;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    try {
      const result = await this.redis.exists(this.getKey(key));
      return result;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    try {
      const result = await this.redis.expire(this.getKey(key), ttlSeconds);
      return result > 0;
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  // Cache key generation using Bun's native hashing
  generateCacheKey(prefix: string, data: unknown): string {
    const hash = Bun.hash(JSON.stringify(data));
    return `${prefix}:${hash}`;
  }

  // Model-specific cache operations
  async cacheModelList(listParams: unknown, data: unknown): Promise<void> {
    const key = this.generateCacheKey('model-list', listParams);
    const ttl = env.REDIS_TTL_MODEL_LIST;
    await this.set(key, data, ttl);
  }

  async getCachedModelList(listParams: unknown): Promise<unknown> {
    const key = this.generateCacheKey('model-list', listParams);
    return await this.get(key);
  }

  async cacheModel(
    modelId: string,
    data: unknown,
    organizationId?: string
  ): Promise<void> {
    const key = organizationId
      ? `model:${modelId}:org:${organizationId}`
      : `model:${modelId}`;
    const ttl = env.REDIS_TTL_MODEL_METADATA;
    await this.set(key, data, ttl);
  }

  async getCachedModel(
    modelId: string,
    organizationId?: string
  ): Promise<unknown> {
    const key = organizationId
      ? `model:${modelId}:org:${organizationId}`
      : `model:${modelId}`;
    return await this.get(key);
  }

  async invalidateModel(
    modelId: string,
    organizationId?: string
  ): Promise<void> {
    // Delete specific model cache
    if (organizationId) {
      await this.del(`model:${modelId}:org:${organizationId}`);
    }
    await this.del(`model:${modelId}`);

    // Invalidate all model list caches (pattern-based deletion)
    await this.invalidateModelLists();
  }

  async invalidateModelLists(): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      // Get all keys matching model-list pattern
      const keys = await this.redis.keys(`${this.keyPrefix}model-list:*`);

      if (keys.length > 0) {
        // Remove the prefix for deletion
        const keysToDelete = keys.map((key: string) =>
          key.replace(this.keyPrefix, '')
        );
        await Promise.all(keysToDelete.map((key: string) => this.del(key)));
      }
    } catch (error) {
      console.error('Error invalidating model list caches:', error);
    }
  }

  async cacheTagList(data: unknown): Promise<void> {
    const key = 'tags:all';
    const ttl = env.REDIS_TTL_MODEL_METADATA;
    await this.set(key, data, ttl);
  }

  async getCachedTagList(): Promise<unknown> {
    const key = 'tags:all';
    return await this.get(key);
  }

  async invalidateTagList(): Promise<void> {
    await this.del('tags:all');
  }

  // Model versions cache operations
  async cacheModelVersions(
    modelId: string,
    offset: number,
    limit: number,
    data: unknown,
    organizationId?: string
  ): Promise<void> {
    const key = organizationId
      ? `model-versions:${modelId}:${offset}:${limit}:org:${organizationId}`
      : `model-versions:${modelId}:${offset}:${limit}`;
    const ttl = 10; // 10 seconds - short TTL for pagination
    await this.set(key, data, ttl);
  }

  async getCachedModelVersions(
    modelId: string,
    offset: number,
    limit: number,
    organizationId?: string
  ): Promise<unknown> {
    const key = organizationId
      ? `model-versions:${modelId}:${offset}:${limit}:org:${organizationId}`
      : `model-versions:${modelId}:${offset}:${limit}`;
    return await this.get(key);
  }

  async invalidateModelVersions(modelId: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      // Get all keys matching model-versions pattern for this model
      const keys = await this.redis.keys(
        `${this.keyPrefix}model-versions:${modelId}:*`
      );

      if (keys.length > 0) {
        // Remove the prefix for deletion
        const keysToDelete = keys.map((key: string) =>
          key.replace(this.keyPrefix, '')
        );
        await Promise.all(keysToDelete.map((key: string) => this.del(key)));
      }
    } catch (error) {
      console.error('Error invalidating model versions caches:', error);
    }
  }

  // Model history cache operations
  async cacheModelHistory(
    modelId: string,
    limit: number,
    data: unknown,
    organizationId?: string
  ): Promise<void> {
    const key = organizationId
      ? `model-history:${modelId}:${limit}:org:${organizationId}`
      : `model-history:${modelId}:${limit}`;
    const ttl = 60; // 60 seconds - Git history doesn't change often
    await this.set(key, data, ttl);
  }

  async getCachedModelHistory(
    modelId: string,
    limit: number,
    organizationId?: string
  ): Promise<unknown> {
    const key = organizationId
      ? `model-history:${modelId}:${limit}:org:${organizationId}`
      : `model-history:${modelId}:${limit}`;
    return await this.get(key);
  }

  async invalidateModelHistory(modelId: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      // Get all keys matching model-history pattern for this model
      const keys = await this.redis.keys(
        `${this.keyPrefix}model-history:${modelId}:*`
      );

      if (keys.length > 0) {
        // Remove the prefix for deletion
        const keysToDelete = keys.map((key: string) =>
          key.replace(this.keyPrefix, '')
        );
        await Promise.all(keysToDelete.map((key: string) => this.del(key)));
      }
    } catch (error) {
      console.error('Error invalidating model history caches:', error);
    }
  }

  // Upload session management
  async createUploadSession(sessionId: string, data: unknown): Promise<void> {
    const key = `upload-session:${sessionId}`;
    const ttl = 3600; // 1 hour for upload sessions
    await this.set(key, data, ttl);
  }

  async getUploadSession(sessionId: string): Promise<unknown> {
    const key = `upload-session:${sessionId}`;
    return await this.get(key);
  }

  async updateUploadSession(sessionId: string, data: unknown): Promise<void> {
    const key = `upload-session:${sessionId}`;
    const ttl = 3600; // Reset TTL
    await this.set(key, data, ttl);
  }

  async deleteUploadSession(sessionId: string): Promise<void> {
    const key = `upload-session:${sessionId}`;
    await this.del(key);
  }

  // Rate limiting
  async checkRateLimit(
    identifier: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    if (!this.redis) {
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: Date.now() + windowMs,
      };
    }

    const key = `rate-limit:${identifier}`;
    const now = Date.now();
    const window = Math.floor(now / windowMs) * windowMs;
    const windowKey = `${key}:${window}`;

    try {
      const current = await this.redis.get(this.getKey(windowKey));
      const currentCount = current ? Number.parseInt(current, 10) : 0;

      if (currentCount >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: window + windowMs,
        };
      }

      // Increment counter
      const newCount = currentCount + 1;
      await this.redis.set(
        this.getKey(windowKey),
        newCount.toString(),
        'EX',
        Math.ceil(windowMs / MILLISECONDS_TO_SECONDS)
      );

      return {
        allowed: true,
        remaining: maxRequests - newCount,
        resetTime: window + windowMs,
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Allow request if cache fails
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs,
      };
    }
  }

  // Presigned URL cache
  async cachePresignedUrl(
    fileKey: string,
    url: string,
    expiresInMinutes = PRESIGNED_URL_EXPIRY_MULTIPLIER
  ): Promise<void> {
    const key = `presigned-url:${fileKey}`;
    const ttl =
      (expiresInMinutes - PRESIGNED_URL_BUFFER_MINUTES) *
      PRESIGNED_URL_EXPIRY_MULTIPLIER; // Cache for slightly less than expiration
    await this.set(
      key,
      {
        url,
        expiresAt:
          Date.now() +
          expiresInMinutes *
            PRESIGNED_URL_EXPIRY_MULTIPLIER *
            MILLISECONDS_TO_SECONDS,
      },
      ttl
    );
  }

  async getCachedPresignedUrl(
    fileKey: string
  ): Promise<{ url: string; expiresAt: number } | null> {
    const key = `presigned-url:${fileKey}`;
    const cached = await this.get<{ url: string; expiresAt: number }>(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    if (cached) {
      await this.del(key); // Clean up expired URL
    }

    return null;
  }

  // Health check
  async health(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
  }> {
    if (!this.redis) {
      return { status: 'unhealthy' };
    }

    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return { status: 'healthy', latency };
    } catch (error) {
      console.error('Redis health check failed:', error);
      return { status: 'unhealthy' };
    }
  }

  // Session cache operations
  async cacheSession(token: string, session: unknown | null): Promise<void> {
    const key = `session:${token}`;
    const ttl = session ? 300 : 60; // 5 minutes for valid sessions, 1 minute for null
    await this.set(key, session || 'null', ttl);
  }

  async getCachedSession(token: string): Promise<unknown> {
    const key = `session:${token}`;
    const cached = await this.get(key);
    return cached === 'null' ? null : cached;
  }

  async invalidateSession(token: string): Promise<void> {
    const key = `session:${token}`;
    await this.del(key);
  }

  // Cache warming
  async warmCache(): Promise<void> {
    if (
      !process.env.ENABLE_CACHE_WARMING ||
      process.env.ENABLE_CACHE_WARMING !== 'true'
    ) {
      return;
    }

    try {
      console.log('Starting cache warming...');

      // This could be extended to pre-populate frequently accessed data
      // For now, we'll just verify the connection
      if (this.redis) {
        await this.redis.ping();
      }

      console.log('Cache warming completed');
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }
}

export const cacheService = new CacheService();
