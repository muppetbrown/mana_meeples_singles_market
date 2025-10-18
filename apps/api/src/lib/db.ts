import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { env } from "./env"; // adjust if your env file is elsewhere

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
   * Automatically manages connections and logs errors.
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<T[]> {
    const client = await pool.connect();
    try {
      const result = await client.query<T>(text, params);
      return result.rows;
    } catch (error: any) {
      console.error("❌ Database query error:", error.message);
      throw error;
    } finally {
      client.release();
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
    const { rows } = await pool.query("SELECT 1 AS ok");
    return rows[0]?.ok === 1;
  } catch {
    return false;
  }
}

// Log pool errors to avoid unhandled exceptions
pool.on("error", (err) => {
  console.error("⚠️ Unexpected database pool error:", err.message);
});
