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

// Create wrapper object with all methods
const db = {
  // Direct pool access
  pool: pool,
  
  // Get a client from the pool
  getClient: function() {
    return pool.connect();
  },
  
  // Execute a query
  query: function(text, params) {
    return pool.query(text, params);
  },
  
  // End the pool
  end: function() {
    return pool.end();
  }
};

// Export the wrapper object as default
module.exports = db;