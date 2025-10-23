// ============================================================================
// services/http/throttler.ts - Request throttling
// ============================================================================

/**
 * Simple request throttler to prevent API spam
 */
export class RequestThrottler {
  private pending = new Map<string, Promise<any>>();
  private lastRequest = new Map<string, number>();
  private minInterval: number;

  constructor(minIntervalMs = 100) {
    this.minInterval = minIntervalMs;
  }

  /**
   * Throttle a request by key
   * - Deduplicates simultaneous requests
   * - Enforces minimum time between requests
   */
  async throttle<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // If same request is already pending, return that promise
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    // Check if we need to wait before making request
    const lastTime = this.lastRequest.get(key) || 0;
    const now = Date.now();
    const timeSinceLastRequest = now - lastTime;

    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }

    // Execute request
    const promise = requestFn()
      .finally(() => {
        this.pending.delete(key);
        this.lastRequest.set(key, Date.now());
      });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Clear throttle state for a key
   */
  clear(key: string): void {
    this.pending.delete(key);
    this.lastRequest.delete(key);
  }

  /**
   * Clear all throttle state
   */
  clearAll(): void {
    this.pending.clear();
    this.lastRequest.clear();
  }
}

// Default instance
export const defaultThrottler = new RequestThrottler(100);

/**
 * Throttled fetch wrapper
 * CRITICAL: Clones response to prevent "body stream already read" errors
 * when React Strict Mode or multiple consumers try to read the same response
 */
export async function throttledFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const key = `${options?.method || 'GET'}:${url}`;
  
  const response = await defaultThrottler.throttle(key, () => fetch(url, options));
  
  // ✅ Clone the response before returning
  // This allows multiple callers to read the body independently
  return response.clone();
}