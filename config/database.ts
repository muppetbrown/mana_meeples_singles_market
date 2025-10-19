// config/database.ts
import dotenv from "dotenv";
import { Pool, type PoolClient, type QueryResult } from "pg";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const wantsSSL =
  /sslmode=require/i.test(DATABASE_URL) ||
  (process.env.PGSSLMODE ?? "").toLowerCase() === "require" ||
  process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: wantsSSL ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30_000),
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 10_000),
});

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as any[]);
}

export async function withConn<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function healthcheck(): Promise<boolean> {
  try {
    const res = await pool.query<{ now: string }>("SELECT NOW() as now");
    return !!res.rows[0]?.now;
  } catch {
    return false;
  }
}

export async function ensureExtensionsOnce(): Promise<void> {
  await withConn(async (c) => {
    await c.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    await c.query("CREATE EXTENSION IF NOT EXISTS unaccent;");
  });
}

// graceful shutdown (safe on Render)
const shutdown = async (signal: string) => {
  try { await pool.end(); }
  finally {
    // eslint-disable-next-line no-console
    console.log(`[db] pool closed on ${signal}`);
    process.exit(0);
  }
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
