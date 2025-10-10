const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// ============================================
// JWT-BASED AUTHENTICATION MIDDLEWARE
// ============================================
const adminAuthJWT = async (req, res, next) => {
  try {
    // Get token from cookie
    const token = req.cookies?.adminToken;

    if (!token) {
      console.log('❌ No admin token found in cookies');
      return res.status(401).json({ 
        error: 'Authentication required',
        authenticated: false 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user has admin role
    if (decoded.role !== 'admin') {
      console.log('❌ User does not have admin role');
      return res.status(403).json({
        error: 'Admin access required',
        authenticated: false
      });
    }

    // Check if token is close to expiring (within 15 minutes) and refresh it
    const now = Math.floor(Date.now() / 1000);
    const timeToExpiry = decoded.exp - now;

    if (timeToExpiry < 900) { // Less than 15 minutes
      const refreshToken = jwt.sign(
        {
          username: decoded.username,
          role: decoded.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Set new token as httpOnly cookie with security settings
      res.cookie('adminToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' && process.env.CROSS_ORIGIN === 'true' ? 'none' : 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
      });

      console.log('🔄 JWT token refreshed for user:', decoded.username);
    }

    // Attach user info to request
    req.user = {
      username: decoded.username,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    };

    // Continue to next middleware/route
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('❌ Token expired');
      return res.status(401).json({ 
        error: 'Token expired. Please login again.',
        authenticated: false 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ Invalid token');
      return res.status(401).json({ 
        error: 'Invalid token',
        authenticated: false 
      });
    }

    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      authenticated: false 
    });
  }
};

// ============================================
// BASIC AUTH MIDDLEWARE (LEGACY - for backward compatibility)
// ============================================
const adminAuthBasic = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        hint: 'Use Basic Auth with username:password'
      });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    const validUsername = process.env.ADMIN_USERNAME;
    const validPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!validUsername || !validPasswordHash) {
      console.error('❌ Admin credentials not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (username !== validUsername) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, validPasswordHash);

    if (!isValidPassword) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.user = { username, role: 'admin' };
    next();

  } catch (error) {
    console.error('Basic auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// ============================================
// CSRF PROTECTION MIDDLEWARE
// ============================================

/**
 * Generate CSRF token and set as cookie
 */
const generateCSRFToken = (req, res, next) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');

  // Store token in session or as a signed cookie
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false, // Allow JavaScript access to read token for request headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' && process.env.CROSS_ORIGIN === 'true' ? 'none' : 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
  });

  // Also store in a secure, httpOnly cookie for server verification
  res.cookie('_csrfSecret', csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' && process.env.CROSS_ORIGIN === 'true' ? 'none' : 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
  });

  req.csrfToken = csrfToken;
  next();
};

/**
 * Validate CSRF token for state-changing operations
 */
const validateCSRFToken = (req, res, next) => {
  // Only validate CSRF for state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return next();
  }

  const clientToken = req.headers['x-csrf-token'] || req.body._csrfToken;
  const serverToken = req.cookies._csrfSecret;

  if (!clientToken || !serverToken) {
    console.log('❌ CSRF token missing');
    return res.status(403).json({
      error: 'CSRF token required',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  if (clientToken !== serverToken) {
    console.log('❌ CSRF token mismatch');
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  next();
};

/**
 * Combined admin authentication with CSRF protection
 */
const adminAuthWithCSRF = (req, res, next) => {
  // First validate CSRF token
  validateCSRFToken(req, res, (err) => {
    if (err) return next(err);

    // Then validate admin authentication
    adminAuthJWT(req, res, next);
  });
};

// Export both middleware options
module.exports = {
  adminAuthJWT,        // ✅ Use this for cookie-based JWT auth
  adminAuthBasic,      // Legacy Basic Auth
  adminAuth: adminAuthJWT,  // Default export is JWT
  generateCSRFToken,   // ✅ CSRF token generation
  validateCSRFToken,   // ✅ CSRF token validation
  adminAuthWithCSRF    // ✅ Combined admin auth + CSRF protection
};