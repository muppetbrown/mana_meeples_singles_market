// ============================================================================
// lib/api/client.ts - Unified API client
// ============================================================================

import { z } from 'zod';
import { throttledFetch } from '@/services/http/throttler';
import { logError } from '@/services/error/handler';

// Helper function for clean error message extraction
function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;

  const obj = data as Record<string, unknown>;

  // Try common error fields
  if (typeof obj.error === 'string') return obj.error;
  if (typeof obj.message === 'string') return obj.message;

  // Handle validation errors with details
  if (obj.details && typeof obj.details === 'object') {
    return 'Validation failed: ' + JSON.stringify(obj.details);
  }

  return fallback;
}

// API Error class for proper error handling
export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message?: string,
    public parseError?: Error | null  // Track if response wasn't valid JSON
  ) {
    super(message || `API Error: ${status}`);
    this.name = 'ApiError';
  }

  // Helper to check if error was due to bad JSON response
  get hadInvalidJsonResponse(): boolean {
    return Boolean(this.parseError);
  }
}

/**
 * API Client Configuration
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5173';

/**
 * Type-safe API client
 */
class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string | null): void {
    if (token) {
      this.defaultHeaders = {
        ...this.defaultHeaders,
        Authorization: `Bearer ${token}`
      };
    } else {
      const { Authorization, ...rest } = this.defaultHeaders as Record<string, string>;
      this.defaultHeaders = rest;
    }
  }

  /**
   * Build full URL
   */
  private buildUrl(endpoint: string, params?: Record<string, unknown>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Generic request handler with error handling
   */
  private async request<T>(
    method: string,
    endpoint: string,
    options: {
      params?: Record<string, unknown>;
      body?: BodyInit | null | unknown;
      headers?: HeadersInit;
      schema?: z.ZodType<T>;
    } = {}
  ): Promise<T> {
    const url = this.buildUrl(endpoint, options.params);

    try {
      const response = await throttledFetch(url, {
        method,
        headers: {
          ...this.defaultHeaders,
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : null,
        credentials: 'include'
      });

      // Handle non-OK responses
      if (!response.ok) {
        let errorData: unknown = {};
        let parseError: Error | null = null;

        try {
          // Clone response before reading body (for retry logic if needed)
          errorData = await response.json();
        } catch (jsonError) {
          parseError = jsonError as Error;
          logError(jsonError, {
            context: 'API response JSON parse failed',
            status: response.status,
            url: response.url
          });
          errorData = { message: response.statusText };
        }

        // Extract error message with proper type guards
        const errorMessage = extractErrorMessage(errorData, response.statusText);

        throw new ApiError(
          response.status,
          errorData,
          errorMessage,
          parseError
        );
      }

      // Parse successful response
      let data = null;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      // Validate with schema if provided
      if (options.schema) {
        return options.schema.parse(data);
      }

      return data;
    } catch (error) {
      logError(error, { method, endpoint, params: options.params });
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request<T>('GET', endpoint, {
      ...(params ? { params } : {}),
      ...(schema ? { schema } : {})
    });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request<T>('POST', endpoint, {
      ...(body !== undefined ? { body } : {}),
      ...(schema ? { schema } : {})
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request<T>('PUT', endpoint, {
      ...(body !== undefined ? { body } : {}),
      ...(schema ? { schema } : {})
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request<T>('PATCH', endpoint, {
      ...(body !== undefined ? { body } : {}),
      ...(schema ? { schema } : {})
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request<T>('DELETE', endpoint, {
      ...(schema ? { schema } : {})
    });
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE);
export { API_BASE };