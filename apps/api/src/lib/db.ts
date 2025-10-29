// apps/api/src/lib/db.ts
import { Pool, types } from "pg";
import type { PoolClient, QueryResultRow } from "pg";

let pool: Pool | null = null;
try { types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); } catch {}

/**
 * Determine if SSL should be enabled based on connection string and environment
 */
function shouldUseSSL(connectionString: string): { rejectUnauthorized: boolean } | undefined {
  // Always use SSL for Render databases
  if (connectionString.includes('.render.com')) {
    return { rejectUnauthorized: false };
  }
  
  // Use SSL if explicitly required in connection string
  if (connectionString.includes('sslmode=require')) {
    return { rejectUnauthorized: false };
  }
  
  // Use SSL in production environment
  if (process.env.NODE_ENV === "production") {
    return { rejectUnauthorized: false };
  }
  
  // Local development without SSL
  return undefined;
}

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

    const sslConfig = shouldUseSSL(connectionString);

    pool = new Pool({
      connectionString,
      ssl: sslConfig,
      max: parseInt(process.env.DB_POOL_MAX || "20", 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    // Log connection configuration
    console.log("🔧 Database pool configuration:");
    console.log(`   SSL enabled: ${sslConfig ? "✅ YES" : "❌ NO"}`);
    console.log(`   Max connections: ${pool.options.max}`);
    console.log(`   Timeout: ${pool.options.connectionTimeoutMillis}ms`);

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
 * Returns true if database is responsive.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await getPool().query("SELECT 1");
    return true;
  } catch (error) {
    console.error("❌ Health check failed:", error);
    return false;
  }
}

/**
 * Get current pool statistics.
 */
export function getPoolStats() {
  if (!pool) {
    return { total: 0, idle: 0, waiting: 0 };
  }
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

/**
 * Graceful shutdown - close all connections.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    console.log("🔌 Closing database pool...");
    await pool.end();
    pool = null;
    console.log("✅ Database pool closed");
  }
}

// Export the pool getter for routes that need direct access
export { getPool as pool };