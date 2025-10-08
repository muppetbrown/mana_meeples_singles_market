const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Admin login endpoint
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    const validUsername = process.env.ADMIN_USERNAME;
    const validPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!validUsername || !validPasswordHash) {
      console.error('❌ Admin credentials not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify username
    if (username !== validUsername) {
      // Delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, validPasswordHash);

    if (!isValidPassword) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        username, 
        role: 'admin',
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Set secure HTTP-only cookie
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // ✅ CHANGED
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/' // ✅ ADDED - ensure cookie is available for all paths
    });

    res.json({ 
      success: true, 
      message: 'Login successful',
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin logout endpoint
router.post('/admin/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Check authentication status
router.get('/admin/auth/check', async (req, res) => {
  try {
    const token = req.cookies?.adminToken;

    if (!token) {
      return res.status(401).json({ authenticated: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({ 
      authenticated: true, 
      user: { username: decoded.username, role: decoded.role },
      expiresAt: decoded.exp * 1000
    });
  } catch (error) {
    res.status(401).json({ authenticated: false });
  }
});

module.exports = router;