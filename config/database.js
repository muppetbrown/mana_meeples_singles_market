/**
 * Database Configuration
 * Central database connection setup for scripts and services
 */

const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? {
        rejectUnauthorized: false,
        require: true
      }
    : {
        rejectUnauthorized: false
      },
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS) || 10000,
  acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT_MS) || 10000,
  allowExitOnIdle: false
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('⚠️  Unexpected database error:', err.message);
});

// Export both pool and helper methods for compatibility
module.exports = pool;

// Add getClient method for services that need it
module.exports.getClient = () => pool.connect();

// Add query method for direct queries
module.exports.query = (text, params) => pool.query(text, params);