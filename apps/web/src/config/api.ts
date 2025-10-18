import { z } from 'zod';

// -------------------- Types --------------------
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export interface FetchOptions extends RequestInit {
  json?: boolean;
}

/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    VITE_API_URL?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';



// -------------------- Core Fetch Helper --------------------
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const fetchOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    credentials: 'include',
    ...options,
  };

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      let message = `${response.status} ${response.statusText}`;
      try {
        const body = await response.json();
        message = body.error || body.message || message;
      } catch {
        // ignore JSON parse failure
      }
      return { success: false, error: message };
    }

    const data = options.json === false ? (await response.text()) : await response.json();
    return { success: true, data } as ApiResponse<T>;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// -------------------- Validation Schemas --------------------
export const PaginatedQuerySchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  search: z.string().trim().optional(),
  sort: z.string().trim().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type PaginatedQuery = z.infer<typeof PaginatedQuerySchema>;

// -------------------- Example API Calls --------------------
export async function getInventory(params?: PaginatedQuery) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) searchParams.append(key, String(val));
    });
  }
  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return apiFetch(`${API_URL}/inventory${query}`);
}

export async function getCardById(cardId: string | number) {
  return apiFetch(`${API_URL}/cards/${cardId}`);
}

export async function updateInventoryItem(id: string | number, payload: Record<string, unknown>) {
  return apiFetch(`${API_URL}/inventory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteInventoryItem(id: string | number) {
  return apiFetch(`${API_URL}/inventory/${id}`, {
    method: 'DELETE',
  });
}

export async function createInventoryItem(payload: Record<string, unknown>) {
  return apiFetch(`${API_URL}/inventory`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}