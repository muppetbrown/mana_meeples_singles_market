// ============================================================================
// lib/api/client.ts - Unified API client
// ============================================================================

import { z } from 'zod';
import { throttledFetch } from '@/services/http/throttler';
import { logError } from '@/services/error/handler';

// API Error class for proper error handling
export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message?: string
  ) {
    super(message || `API Error: ${status}`);
    this.name = 'ApiError';
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
      body?: unknown;
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
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: 'include'
      });

      // Handle non-OK responses
      if (!response.ok) {
        let errorData: unknown = {};
        
        try {
          // Try to read error response body
          errorData = await response.json();
        } catch (jsonError) {
          // If body already consumed or invalid JSON, use status text
          errorData = { message: response.statusText };
        }
        
        const errorMessage = (errorData && typeof errorData === 'object' && 'error' in errorData)
          ? (errorData as { error: string }).error
          : (errorData && typeof errorData === 'object' && 'message' in errorData)
          ? (errorData as { message: string }).message
          : response.statusText;

        throw new ApiError(
          response.status,
          errorData,
          errorMessage
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
    return this.request<T>('GET', endpoint, { params, schema });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request<T>('POST', endpoint, { body, schema });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request<T>('PUT', endpoint, { body, schema });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body?: unknown,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request<T>('PATCH', endpoint, { body, schema });
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    schema?: z.ZodType<T>
  ): Promise<T> {
    return this.request<T>('DELETE', endpoint, { schema });
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE);
export { API_BASE };