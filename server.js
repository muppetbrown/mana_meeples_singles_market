const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Trust proxy (required for Render.com)
app.set('trust proxy', 1);

// ============================================
// DATABASE CONNECTION
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 5,                       // Reduced for free tier stability
  min: 1,                       // Keep 1 connection alive
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  acquireTimeoutMillis: 10000,
  allowExitOnIdle: false
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('⚠️  Unexpected database error:', err.message);
  // Don't exit the process on pool errors
});

// Periodic health check (every 60 seconds)
setInterval(async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('🔄 Database connection pool healthy');
  } catch (err) {
    console.error('❌ Database pool health check failed:', err.message);
  }
}, 60000);

// Make database globally available with proper connection management
global.db = {
  query: async (text, params) => {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error.message);
      throw error;
    } finally {
      client.release();
    }
  },
  getClient: () => pool.connect()
};

// Test database connection with retry logic
async function testDatabaseConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log('✅ Database connected successfully');
      const result = await client.query('SELECT NOW() as server_time, version() as pg_version');
      console.log('📊 Database time:', result.rows[0].server_time);
      console.log('📦 PostgreSQL:', result.rows[0].pg_version.split(',')[0]);
      client.release();
      return true;
    } catch (err) {
      console.error(`❌ Connection attempt ${i + 1}/${retries} failed:`, err.message);
      if (i < retries - 1) {
        console.log('⏳ Retrying in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  console.error('❌ Could not establish database connection after', retries, 'attempts');
  console.error('⚠️  Server will continue, but database operations will fail');
  return false;
}

// Initialize database connection
testDatabaseConnection();

// ============================================
// SECURITY MIDDLEWARE
// ============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", process.env.API_URL || "*"],
    },
  },
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('⚠️  Blocked CORS request from:', origin);
      console.warn('⚠️  Allowed origins:', allowedOrigins.join(', '));
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Cookie parser (for JWT tokens)
app.use(cookieParser());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// RATE LIMITING
// ============================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Increased slightly for admin operations
  message: 'Too many admin requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/admin/', adminLimiter);

// Login-specific rate limiting (prevent brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/admin/login', loginLimiter);

// ============================================
// ROUTES
// ============================================
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  let dbStatus = 'unknown';
  
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'disconnected';
  }

  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus
  });
});

// Database stats endpoint (useful for debugging)
app.get('/api/db-stats', async (req, res) => {
  try {
    const stats = {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount,
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get database stats' });
  }
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  
  // Handle specific error types
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'CORS policy violation',
      message: 'Origin not allowed'
    });
  }

  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  // Generic error response
  if (process.env.NODE_ENV === 'production') {
    res.status(err.status || 500).json({ error: 'Internal server error' });
  } else {
    res.status(err.status || 500).json({ 
      error: err.message,
      stack: err.stack 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
  
  // Stop accepting new connections
  server.close(() => {
    console.log('📡 HTTP server closed');
  });

  // Close database pool
  try {
    await pool.end();
    console.log('📊 Database pool closed');
  } catch (err) {
    console.error('Error closing database pool:', err);
  }

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => {
  console.log('═'.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Admin auth enabled`);
  console.log(`🌐 CORS allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`💾 Database pool: max ${pool.options.max}, min ${pool.options.min}`);
  console.log('═'.repeat(60));
});

module.exports = app;