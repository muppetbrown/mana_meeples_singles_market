const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// JWT-based admin authentication (for future use)
const adminAuthJWT = async (req, res, next) => {
  try {
    const token = req.cookies?.adminToken || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        redirectTo: '/admin/login'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Session expired. Please login again.',
        redirectTo: '/admin/login'
      });
    }
    
    return res.status(401).json({ 
      error: 'Invalid authentication',
      redirectTo: '/admin/login'
    });
  }
};

// Basic Auth with bcrypt (current implementation - secure version)
const adminAuthBasic = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please provide admin credentials'
    });
  }

  try {
    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    const validUsername = process.env.ADMIN_USERNAME;
    const validPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!validUsername || !validPasswordHash) {
      console.error('❌ ADMIN_USERNAME or ADMIN_PASSWORD_HASH not configured in .env');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (username !== validUsername) {
      // Add delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, validPasswordHash);

    if (!isValidPassword) {
      // Add delay to prevent brute force
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.user = { username, role: 'admin' };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = {
  adminAuthJWT,
  adminAuthBasic
};