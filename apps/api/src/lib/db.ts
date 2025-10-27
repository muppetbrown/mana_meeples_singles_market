// apps/api/src/lib/db.ts
import { Pool, types } from "pg";
import type { PoolClient, QueryResultRow } from "pg";

let pool: Pool | null = null;
try { types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); } catch {}

/**
 * Get or create the connection pool
 * In test mode, this allows the test to set DATABASE_URL before pool creation
 */
function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    pool = new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
      max: parseInt(process.env.DB_POOL_MAX || "20", 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

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
  }

  return pool;
}

/**
 * Reset the pool (for tests)
 * This allows tests to override DATABASE_URL
 */
export async function resetPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Generic query wrapper for convenience
export const db = {
  /**
   * Run a parameterized SQL query.
   * Uses pool's automatic connection management.
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<T[]> {
    try {
      const result = await getPool().query<T>(text, params);
      return result.rows;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const code = error instanceof Error && 'code' in error ? error.code : 'unknown';
      console.error("❌ Database query error:", message);
      console.error("   Query:", text.substring(0, 200));
      console.error("   Params:", JSON.stringify(params?.slice(0, 5)));
      console.error("   Code:", code);
      throw error;
    }
  },

  /**
   * Get a dedicated client for transactions.
   * Remember to release it manually.
   */
  async getClient(): Promise<PoolClient> {
    return getPool().connect();
  },
};

/**
 * Run a function with an auto-managed connection.
 * Use this for transactions.
 */
export async function withConn<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
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
    const { rows } = await getPool().query<{ ok: number | string }>('SELECT 1::int AS ok');
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
  const p = getPool();
  return {
    total: p.totalCount,
    idle: p.idleCount,
    waiting: p.waitingCount,
  };
}

// Export the pool getter for routes that need direct access
export { getPool as pool };