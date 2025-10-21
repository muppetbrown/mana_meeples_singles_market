// apps/web/src/services/requestThrottler.ts
/**
 * Request Throttling Service
 * Prevents overwhelming the API with simultaneous requests
 */

class RequestThrottler {
  activeRequests: any;
  maxConcurrent: any;
  minDelay: any;
  requestHistory: any;
  constructor() {
    // Track ongoing requests per endpoint
    this.activeRequests = new Map();
    // Track request timestamps to implement rate limiting
    this.requestHistory = new Map();
    // Minimum delay between requests to same endpoint (in ms) - increased to prevent 429s
    this.minDelay = 800;
    // Maximum concurrent requests per endpoint
    this.maxConcurrent = 1;
  }

  /**
   * Get a unique key for the endpoint
   */
  getEndpointKey(url: any) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname; // Use just the path, ignoring query params
    } catch {
      return url; // Fallback if URL parsing fails
    }
  }

  /**
   * Wait for any minimum delay requirements
   */
  async waitForDelay(endpointKey: any) {
    const lastRequestTime = this.requestHistory.get(endpointKey);
    if (lastRequestTime) {
      const timeSinceLastRequest = Date.now() - lastRequestTime;
      if (timeSinceLastRequest < this.minDelay) {
        const waitTime = this.minDelay - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Wait for concurrent request limits
   */
  async waitForConcurrency(endpointKey: any) {
    while (true) {
      const activeCount = this.activeRequests.get(endpointKey) || 0;
      if (activeCount < this.maxConcurrent) {
        break;
      }
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Track that a request is starting
   */
  startRequest(endpointKey: any) {
    const currentCount = this.activeRequests.get(endpointKey) || 0;
    this.activeRequests.set(endpointKey, currentCount + 1);
    this.requestHistory.set(endpointKey, Date.now());
  }

  /**
   * Track that a request is ending
   */
  endRequest(endpointKey: any) {
    const currentCount = this.activeRequests.get(endpointKey) || 1;
    if (currentCount <= 1) {
      this.activeRequests.delete(endpointKey);
    } else {
      this.activeRequests.set(endpointKey, currentCount - 1);
    }
  }

  /**
   * Throttled fetch function
   */
  async fetch(url: any, options = {}) {
    const endpointKey = this.getEndpointKey(url);

    // Wait for rate limiting constraints
    await this.waitForDelay(endpointKey);
    await this.waitForConcurrency(endpointKey);

    // Start tracking this request
    this.startRequest(endpointKey);

    try {
      const response = await fetch(url, options);
      return response;
    } finally {
      // Always end tracking, even if request fails
      this.endRequest(endpointKey);
    }
  }

  /**
   * Clear all tracking (useful for testing or reset)
   */
  reset() {
    this.activeRequests.clear();
    this.requestHistory.clear();
  }
}

// Create a singleton instance
const requestThrottler = new RequestThrottler();

export default requestThrottler;
export { RequestThrottler };