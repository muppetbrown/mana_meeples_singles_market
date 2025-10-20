// web/src/config/api.ts
type ApiInit = Omit<RequestInit, 'headers' | 'body'> & {
  headers?: Record<string, string>;
  body?: BodyInit | null;
};

const getApiUrl = (): string => {
  const envUrl = import.meta.env?.VITE_API_URL?.replace(/\/+$/, '');
  if (envUrl) {
    console.log('✅ Using VITE_API_URL:', envUrl);
    return envUrl;
  }

  if (import.meta.env?.PROD) {
    const productionUrl = 'https://api.manaandmeeples.co.nz/api';
    console.log('✅ Using production API URL:', productionUrl);
    return productionUrl;
  }

  const devUrl = 'http://localhost:10000/api';
  console.log('✅ Using development API URL:', devUrl);
  return devUrl;
};

export const API_URL = getApiUrl();
console.log('🔗 Final API_URL:', API_URL);

async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  // Normalize path join
  const full = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(full, {
    credentials: 'include', // admin uses httpOnly cookie
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    // surface a useful error for UI & logs
    let body = '';
    try {
      body = await res.text();
    } catch {}
    throw new Error(`API ${res.status} ${res.statusText} @ ${full} :: ${body || 'No body'}`);
  }

  // Handle 204 / empty
  const len = res.headers.get('content-length');
  if (res.status === 204 || len === '0') return undefined as unknown as T;

  return (await res.json()) as T;
}

export const api = {
  get: <T>(p: string, init?: ApiInit) => apiFetch<T>(p, { method: 'GET', ...(init || {}) }),
  post:    <T, B = unknown>(p: string, body?: B, init?: ApiInit) =>
    apiFetch<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...(init || {}) }),
  put:     <T, B = unknown>(p: string, body?: B, init?: ApiInit) =>
    apiFetch<T>(p, { method: 'PUT',  body: body ? JSON.stringify(body) : undefined, ...(init || {}) }),
  patch:   <T, B = unknown>(p: string, body?: B, init?: ApiInit) =>
    apiFetch<T>(p, { method: 'PATCH',body: body ? JSON.stringify(body) : undefined, ...(init || {}) }),
  del:     <T>(p: string, init?: ApiInit) =>
    apiFetch<T>(p, { method: 'DELETE', ...(init || {}) }),
};
