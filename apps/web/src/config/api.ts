// apps/web/src/config/api.ts
import { z } from "zod";

const Runtime = (globalThis as any)?.window?.__ENV__ ?? {};
const EnvSchema = z.object({
  API_URL: z.string().url().optional(),
});

const parsed = EnvSchema.safeParse(Runtime);
const runtimeApiUrl = parsed.success ? parsed.data.API_URL : undefined;

// Vite build-time fallback
const buildTimeApiUrl = import.meta?.env?.VITE_API_URL as string | undefined;

// Final resolution (runtime > build-time > relative)
export const API_URL =
  runtimeApiUrl ||
  buildTimeApiUrl ||
  (window?.location?.origin
    ? `${window.location.origin}/api`
    : "/api");

// Unified fetch with sane defaults
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });

  if (!res.ok) {
    let info: any = null;
    try {
      info = await res.json();
    } catch {
      // ignore JSON errors
    }
    const message = info?.message || `HTTP ${res.status} on ${path}`;
    throw new Error(message);
  }
  // typed JSON
  return (await res.json()) as T;
}
