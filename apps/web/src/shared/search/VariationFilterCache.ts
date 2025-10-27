/**
 * Caching utility for variation filter API responses
 * Reduces unnecessary API calls by caching responses by game_id/set_id
 */

interface VariationFiltersResponse {
  treatments?: string[];
  borderColors?: string[];
  finishes?: string[];
  promoTypes?: string[];
  frameEffects?: string[];
}

interface CacheEntry {
  data: VariationFiltersResponse;
  timestamp: number;
  expires: number;
}

class VariationFilterCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes cache TTL

  /**
   * Generate cache key from query parameters
   */
  private getCacheKey(params: Record<string, any>): string {
    const sortedParams = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    return sortedParams;
  }

  /**
   * Get cached data if available and not expired
   */
  get(params: Record<string, any>): VariationFiltersResponse | null {
    const key = this.getCacheKey(params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store data in cache with TTL
   */
  set(params: Record<string, any>, data: VariationFiltersResponse): void {
    const key = this.getCacheKey(params);
    const now = Date.now();

    this.cache.set(key, {
      data,
      timestamp: now,
      expires: now + this.TTL
    });
  }

  /**
   * Clear expired entries from cache
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries (useful for inventory updates)
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    this.cleanup(); // Clean up first
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        expires: entry.expires,
        timeToExpire: Math.max(0, entry.expires - Date.now())
      }))
    };
  }
}

// Export singleton instance
export const variationFilterCache = new VariationFilterCache();

// Auto-cleanup every 10 minutes
setInterval(() => {
  variationFilterCache.cleanup();
}, 10 * 60 * 1000);