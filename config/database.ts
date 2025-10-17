/**
 * Database Configuration
 * Central database connection setup for scripts and services
 */

// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'Pool'.
const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'pool'.
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
  // @ts-expect-error TS(2345): Argument of type 'string | undefined' is not assig... Remove this comment to see the full error message
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  // @ts-expect-error TS(2345): Argument of type 'string | undefined' is not assig... Remove this comment to see the full error message
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  // @ts-expect-error TS(2345): Argument of type 'string | undefined' is not assig... Remove this comment to see the full error message
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
  // @ts-expect-error TS(2345): Argument of type 'string | undefined' is not assig... Remove this comment to see the full error message
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS) || 10000,
  // @ts-expect-error TS(2345): Argument of type 'string | undefined' is not assig... Remove this comment to see the full error message
  acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT_MS) || 10000,
  allowExitOnIdle: false
});

// Handle pool errors
pool.on('error', (err: any) => {
  console.error('⚠️  Unexpected database error:', err.message);
});

// Create wrapper object with all methods
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'db'.
const db = {
  // Direct pool access
  pool: pool,
  
  // Get a client from the pool
  getClient: function() {
    return pool.connect();
  },
  
  // Execute a query
  query: function(text: any, params: any) {
    return pool.query(text, params);
  },
  
  // End the pool
  end: function() {
    return pool.end();
  }
};

// Export the wrapper object as default
module.exports = db;