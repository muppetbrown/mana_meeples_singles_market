const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

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

// Export both middleware options
module.exports = {
  adminAuthJWT,     // ✅ Use this for cookie-based JWT auth
  adminAuthBasic,   // Legacy Basic Auth
  adminAuth: adminAuthJWT  // Default export is JWT
};