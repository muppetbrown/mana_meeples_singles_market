// apps/web/src/config/api.ts

// IMPORTANT: For production, we hardcode the API URL since Vite env vars
// aren't always reliable with static site deployments on Render
const getApiUrl = (): string => {
  // Check if we have a build-time environment variable
  const viteApiUrl = import.meta.env?.VITE_API_URL;
  
  // For production, use the API subdomain
  const isProduction = import.meta.env?.PROD ?? false;
  
  if (viteApiUrl) {
    console.log('✅ Using VITE_API_URL:', viteApiUrl);
    return viteApiUrl;
  }
  
  if (isProduction) {
    // Production: Use API subdomain
    const productionUrl = 'https://api.manaandmeeples.co.nz/api';
    console.log('✅ Using production API URL:', productionUrl);
    return productionUrl;
  }
  
  // Development: Use localhost
  const devUrl = 'http://localhost:10000/api';
  console.log('✅ Using development API URL:', devUrl);
  return devUrl;
};

export const API_URL = getApiUrl();

console.log('🔗 Final API_URL:', API_URL);

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
  console.log(`📥 API Response [${res.status}]:`, text.substring(0, 200));

  // Empty response body (but not 204) - this might indicate a problem
  if (!text) {
    console.warn(`⚠️ Empty response body for status ${res.status}`);
    return undefined as unknown as T;
  }

  try {
    const parsed = JSON.parse(text);
    console.log('✅ Parsed JSON successfully:', parsed);
    return parsed as T;
  } catch (parseError) {
    console.error('❌ JSON parse error:', parseError);
    console.error('Raw response text:', text);
    throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
}

// Unified fetch with sane defaults + timeout + better errors
export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  const { timeoutMs = 15000, headers, ...rest } = init;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = join(API_URL, path);
    console.log(`📤 API Request: ${init.method || 'GET'} ${url}`);
    
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      signal: controller.signal,
      ...rest,
    });

    console.log(`📨 Response status: ${res.status} ${res.statusText}`);

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
        `HTTP ${res.status} ${res.statusText}`;
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

// Helper methods
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
  
  patch: <T, B = unknown>(path: string, body?: B, init?: ApiInit) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...(init || {}),
    }),
  
  del: <T>(path: string, init?: ApiInit) =>
    apiFetch<T>(path, { method: "DELETE", ...(init || {}) }),
};