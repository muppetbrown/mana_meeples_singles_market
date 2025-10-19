// apps/web/src/config/api.ts
import { z } from "zod";

const isBrowser = typeof window !== "undefined";
const Runtime = (isBrowser ? (window as any).__ENV__ : undefined) ?? {};

const EnvSchema = z.object({
  API_URL: z.string().url().optional(),
});

const runtimeApiUrl = EnvSchema.safeParse(Runtime).success
  ? (Runtime as z.infer<typeof EnvSchema>).API_URL
  : undefined;

// Vite build-time value (optional)
const buildTimeApiUrl = (import.meta as any)?.env?.VITE_API_URL as
  | string
  | undefined;

// Final base (runtime > build-time > relative '/api')
export const API_URL: string =
  runtimeApiUrl ||
  buildTimeApiUrl ||
  (isBrowser && window.location?.origin
    ? `${window.location.origin}/api`
    : "/api");

// Normalize join so callers can pass "health" or "/health"
function join(base: string, path: string) {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

type ApiInit = RequestInit & { timeoutMs?: number };

async function parseBody<T>(res: Response): Promise<T> {
  // 204 No Content → return undefined as any
  if (res.status === 204) return undefined as unknown as T;

  const text = await res.text();
  console.log(`API Response [${res.status}]: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);

  // Empty response body (but not 204) - this might indicate a problem
  if (!text) {
    console.warn(`Empty response body for status ${res.status} - this might indicate a server error`);
    return undefined as unknown as T;
  }

  try {
    const parsed = JSON.parse(text);
    console.log('Parsed JSON successfully:', parsed);
    return parsed as T;
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    console.error('Raw response text:', text);
    // If server ever returns text, surface it as an error payload-like object
    return { raw: text, parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error' } as unknown as T;
  }
}

// Unified fetch with sane defaults + timeout + better errors
export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  const { timeoutMs = 15000, headers, ...rest } = init;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(join(API_URL, path), {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      signal: controller.signal,
      ...rest,
    });

    if (!res.ok) {
      // Try to extract structured error
      let info: any = null;
      try {
        info = await res.clone().json();
      } catch {
        // ignore
      }
      const message =
        info?.message ||
        info?.error ||
        `HTTP ${res.status} ${res.statusText} on ${path}`;
      const err = new Error(message) as Error & { status?: number; info?: any };
      err.status = res.status;
      err.info = info;
      throw err;
    }

    return await parseBody<T>(res);
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Small helpers (optional)
export const api = {
  get: <T>(path: string, init?: ApiInit) =>
    apiFetch<T>(path, { method: "GET", ...(init || {}) }),
  post: <T, B = unknown>(path: string, body?: B, init?: ApiInit) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...(init || {}),
    }),
  put: <T, B = unknown>(path: string, body?: B, init?: ApiInit) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...(init || {}),
    }),
  del: <T>(path: string, init?: ApiInit) =>
    apiFetch<T>(path, { method: "DELETE", ...(init || {}) }),
};
