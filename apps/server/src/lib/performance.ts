/**
 * Performance monitoring utilities for measuring endpoint and operation timing
 */

export type PerformanceMetrics = {
  endpoint?: string;
  operation?: string;
  total: number;
  details: Record<string, number>;
  cache?: {
    hit: boolean;
    time: number;
  };
};

export class PerformanceMonitor {
  private startTime: number;
  private marks: Map<string, number> = new Map();
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.startTime = performance.now();
  }

  /**
   * Mark the start of a specific operation
   */
  markStart(operation: string): void {
    this.marks.set(`${operation}_start`, performance.now());
  }

  /**
   * Mark the end of a specific operation and return duration
   */
  markEnd(operation: string): number {
    const startKey = `${operation}_start`;
    const startTime = this.marks.get(startKey);
    
    if (!startTime) {
      console.warn(`No start mark found for operation: ${operation}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.marks.set(operation, duration);
    this.marks.delete(startKey); // Clean up start mark
    
    return duration;
  }

  /**
   * Get duration for a specific operation
   */
  getDuration(operation: string): number {
    return this.marks.get(operation) ?? 0;
  }

  /**
   * Mark cache hit/miss and timing
   */
  markCache(hit: boolean, duration: number): void {
    this.marks.set('cache', duration);
    this.marks.set('cache_hit', hit ? 1 : 0);
  }

  /**
   * Get final metrics
   */
  getMetrics(): PerformanceMetrics {
    const total = performance.now() - this.startTime;
    const details: Record<string, number> = {};
    
    // Collect all operation durations
    for (const [key, value] of this.marks.entries()) {
      if (!key.endsWith('_start') && key !== 'cache_hit') {
        details[key] = Math.round(value * 100) / 100; // Round to 2 decimal places
      }
    }

    const metrics: PerformanceMetrics = {
      endpoint: this.endpoint,
      total: Math.round(total * 100) / 100,
      details,
    };

    // Add cache info if available
    const cacheTime = this.marks.get('cache');
    const cacheHit = this.marks.get('cache_hit');
    if (cacheTime !== undefined && cacheHit !== undefined) {
      metrics.cache = {
        hit: cacheHit === 1,
        time: Math.round(cacheTime * 100) / 100,
      };
    }

    return metrics;
  }

  /**
   * Log performance metrics to console
   */
  log(): void {
    const metrics = this.getMetrics();
    const cacheStatus = metrics.cache 
      ? `${metrics.cache.hit ? 'HIT' : 'MISS'} ${metrics.cache.time}ms`
      : 'N/A';

    // Main log line
    console.log(
      `[PERF] ${metrics.endpoint}: ${metrics.total}ms | Cache: ${cacheStatus}`
    );

    // Detail breakdown if operations were tracked
    if (Object.keys(metrics.details).length > 0) {
      const details = Object.entries(metrics.details)
        .filter(([key]) => key !== 'cache')
        .map(([key, value]) => `  - ${key}: ${value}ms`)
        .join('\n');
      
      if (details) {
        console.log(details);
      }
    }

    // Log slow requests as warnings
    if (metrics.total > 500) {
      console.warn(`[PERF] SLOW REQUEST: ${metrics.endpoint} took ${metrics.total}ms`);
    }
  }
}

/**
 * Helper function to measure async operation
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  monitor?: PerformanceMonitor
): Promise<T> {
  if (!monitor) {
    return operation();
  }

  monitor.markStart(name);
  try {
    const result = await operation();
    return result;
  } finally {
    monitor.markEnd(name);
  }
}

/**
 * Helper function to measure sync operation
 */
export function measureSync<T>(
  name: string,
  operation: () => T,
  monitor?: PerformanceMonitor
): T {
  if (!monitor) {
    return operation();
  }

  monitor.markStart(name);
  try {
    const result = operation();
    return result;  
  } finally {
    monitor.markEnd(name);
  }
}