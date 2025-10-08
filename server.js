const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
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
// ENVIRONMENT VALIDATION
// ============================================
function validateEnvironment() {
  const required = ['DATABASE_URL'];
  const production = ['JWT_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH'];

  const missing = [];

  required.forEach(env => {
    if (!process.env[env]) {
      missing.push(env);
    }
  });

  if (process.env.NODE_ENV === 'production') {
    production.forEach(env => {
      if (!process.env[env]) {
        missing.push(env);
      }
    });
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('⚠️  Server may not function correctly');
    if (process.env.NODE_ENV === 'production') {
      console.error('🛑 Exiting due to missing production environment variables');
      process.exit(1);
    }
  } else {
    console.log('✅ All required environment variables are set');
  }
}

validateEnvironment();

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
      connectSrc: ["'self'", process.env.CSP_CONNECT_SRC || "*"],
    },
  },
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

// In production, also allow the current domain for frontend requests
if (process.env.NODE_ENV === 'production') {
  // Add Render's external URL if available
  if (process.env.RENDER_EXTERNAL_URL) {
    allowedOrigins.push(process.env.RENDER_EXTERNAL_URL);
  }

  // Add any additional production origins from environment
  if (process.env.ADDITIONAL_CORS_ORIGINS) {
    const additionalOrigins = process.env.ADDITIONAL_CORS_ORIGINS
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);
    allowedOrigins.push(...additionalOrigins);
  }
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) return callback(null, true);

    console.log('🔍 CORS Debug - Origin:', origin);
    console.log('🔍 CORS Debug - Allowed origins:', allowedOrigins);

    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS allowed for origin:', origin);
      callback(null, true);
    } else {
      console.warn('⚠️  Blocked CORS request from:', origin);
      console.warn('⚠️  Allowed origins:', allowedOrigins.join(', '));
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
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

// CORS debug endpoint (useful for debugging)
app.get('/api/cors-debug', (req, res) => {
  res.json({
    allowedOrigins,
    environmentVariables: {
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
      ADDITIONAL_CORS_ORIGINS: process.env.ADDITIONAL_CORS_ORIGINS,
      NODE_ENV: process.env.NODE_ENV
    },
    requestOrigin: req.get('Origin'),
    requestHost: req.get('Host')
  });
});

// ============================================
// STATIC FILE SERVING (React Frontend)
// ============================================
// Serve React app static files in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, 'mana-meeples-shop/build');

  // Serve static files at /shop path
  app.use('/shop', express.static(buildPath, {
    maxAge: '1d', // Cache static assets for 1 day
    etag: true,
    lastModified: true
  }));

  // Catch all handler for React Router (must be after API routes)
  app.get('/shop/*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });

  // Optional: Redirect root to /shop
  app.get('/', (req, res) => {
    res.redirect('/shop');
  });
} else {
  // Development mode - provide info about static serving
  app.get('/shop', (req, res) => {
    res.json({
      message: 'Development mode: React app should be served by react-scripts on port 3000',
      production: 'In production, this will serve the built React app'
    });
  });
}

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