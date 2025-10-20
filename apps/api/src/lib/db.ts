// apps/api/src/lib/db.ts
import { Pool } from "pg";
import type { PoolClient, QueryResultRow } from "pg";
import { env } from "./env.js";

// Initialize connection pool
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
  max: parseInt(process.env.DB_POOL_MAX || "20", 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// Generic query wrapper for convenience
export const db = {
  /**
   * Run a parameterized SQL query.
   * Uses pool's automatic connection management.
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<T[]> {
    try {
      const result = await pool.query<T>(text, params);
      return result.rows;
    } catch (error: any) {
      console.error("❌ Database query error:", error.message);
      console.error("   Query:", text.substring(0, 200));
      console.error("   Params:", JSON.stringify(params?.slice(0, 5)));
      console.error("   Code:", error.code);
      throw error;
    }
  },

  /**
   * Get a dedicated client for transactions.
   * Remember to release it manually.
   */
  async getClient(): Promise<PoolClient> {
    return pool.connect();
  },
};

/**
 * Run a function with an auto-managed connection.
 * Use this for transactions.
 */
export async function withConn<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

/**
 * Health check for uptime monitoring.
 */
export async function healthcheck(): Promise<boolean> {
  try {
    const { rows } = await pool.query<{ ok: number | string }>('SELECT 1::int AS ok');
    const v = rows[0]?.ok;
    return v === 1 || v === '1';
  } catch {
    return false;
  }
}

/**
 * Get connection pool statistics for monitoring.
 */
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

// Log pool errors to avoid unhandled exceptions
pool.on("error", (err) => {
  console.error("⚠️ Unexpected database pool error:", err.message);
});

// Optional: Log when pool is low on connections
pool.on("connect", () => {
  const stats = getPoolStats();
  if (stats.waiting > 5) {
    console.warn("⚠️ Pool connection pressure:", stats);
  }
});