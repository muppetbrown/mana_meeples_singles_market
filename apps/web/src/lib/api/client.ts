// Robust, no-hardcode API client with strict env handling
import { z } from "zod";

const UrlSchema = z.string().url().transform((u) => u.replace(/\/+$/, "")); // strip trailing slash

// Read once at module init. Frontend builds read VITE_* at build time.
const rawEnvUrl = import.meta.env.VITE_API_URL as string | undefined;

// In production, require the env var so we never silently point to the wrong host.
// In dev, fall back to localhost for ergonomics.
const API_BASE = (() => {
  if (import.meta.env.PROD) {
    const parsed = UrlSchema.safeParse(rawEnvUrl);
    if (!parsed.success) {
      // Fail loudly with a helpful message visible in console + error boundary
      const msg =
        "[API] Missing or invalid VITE_API_URL in production. " +
        "Set it to e.g. https://api.manaandmeeples.co.nz";
      console.error(msg);
      throw new Error(msg);
    }
    return parsed.data;
  } else {
    // Dev fallback keeps your DX smooth if you haven't set .env.local yet.
    const fallback = "http://localhost:10000";
    const parsed = UrlSchema.safeParse(rawEnvUrl ?? fallback);
    return parsed.success ? parsed.data : fallback;
  }
})();

// Safe join: prevents accidental double slashes
const join = (base: string, path: string) =>
  `${base}${path.startsWith("/") ? path : `/${path}`}`;

// Thin wrapper over fetch with sane defaults & typed JSON
async function request<T>(
  path: string,
  init?: RequestInit & { expect?: "json" | "text" }
): Promise<T> {
  const url = join(API_BASE, path);

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include", // keep if you use cookies; remove if not
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(
      `[API ${res.status}] ${res.statusText} @ ${url} :: ${body}`
    );
    // Surface quickly in consoles
    console.error(err);
    throw err;
  }

  const expect = init?.expect ?? "json";
  // @ts-expect-error – runtime gated by 'expect'
  return expect === "json" ? await res.json() : await res.text();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body == null ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body == null ? undefined : JSON.stringify(body),
    }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export { API_BASE };
