"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.pool = void 0;
exports.withConn = withConn;
exports.healthcheck = healthcheck;
const pg_1 = require("pg");
const env_1 = require("./env"); // adjust if your env file is elsewhere
// Initialize connection pool
exports.pool = new pg_1.Pool({
    connectionString: env_1.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
    max: parseInt(process.env.DB_POOL_MAX || "20", 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
});
// Generic query wrapper for convenience
exports.db = {
    /**
     * Run a parameterized SQL query.
     * Automatically manages connections and logs errors.
     */
    async query(text, params) {
        const client = await exports.pool.connect();
        try {
            const result = await client.query(text, params);
            return result.rows;
        }
        catch (error) {
            console.error("❌ Database query error:", error.message);
            throw error;
        }
        finally {
            client.release();
        }
    },
    /**
     * Get a dedicated client for transactions.
     * Remember to release it manually.
     */
    async getClient() {
        return exports.pool.connect();
    },
};
/**
 * Run a function with an auto-managed connection.
 */
async function withConn(fn) {
    const client = await exports.pool.connect();
    try {
        return await fn(client);
    }
    finally {
        client.release();
    }
}
/**
 * Health check for uptime monitoring.
 */
async function healthcheck() {
    try {
        const { rows } = await exports.pool.query("SELECT 1 AS ok");
        return rows[0]?.ok === 1;
    }
    catch {
        return false;
    }
}
// Log pool errors to avoid unhandled exceptions
exports.pool.on("error", (err) => {
    console.error("⚠️ Unexpected database pool error:", err.message);
});
