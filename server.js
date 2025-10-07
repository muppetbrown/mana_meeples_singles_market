const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Simple in-memory rate limiter
const rateLimitStore = new Map();

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    if (rateLimitStore.size > 10000) { // Prevent memory leak
      for (const [key, data] of rateLimitStore.entries()) {
        if (data.requests.every(timestamp => timestamp < windowStart)) {
          rateLimitStore.delete(key);
        }
      }
    }

    if (!rateLimitStore.has(clientIp)) {
      rateLimitStore.set(clientIp, { requests: [] });
    }

    const clientData = rateLimitStore.get(clientIp);
    clientData.requests = clientData.requests.filter(timestamp => timestamp > windowStart);

    if (clientData.requests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    clientData.requests.push(now);
    next();
  };
};

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Make pool available globally
global.db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
};

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

// API routes with rate limiting
const apiRouter = require('./routes/api');
app.use('/api', rateLimit(200, 15 * 60 * 1000), apiRouter); // 200 requests per 15 minutes

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 TCG Singles API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});