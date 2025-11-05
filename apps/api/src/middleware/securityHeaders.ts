// apps/api/src/middleware/securityHeaders.ts
import type { RequestHandler } from 'express';

/**
 * Enhanced security headers middleware
 * Addresses all security warnings from browser audit
 * 
 * Fixes:
 * - Replaces deprecated X-Frame-Options with CSP frame-ancestors
 * - Removes deprecated X-XSS-Protection header
 * - Adds proper Cache-Control headers
 * - Implements modern security best practices
 */
export const securityHeaders: RequestHandler = (_req, res, next) => {
  // ✅ Content Security Policy (replaces deprecated X-Frame-Options)
  // This handles the frame-ancestors warning
  // Note: 'unsafe-inline' and 'unsafe-eval' are necessary for Vite + React in development
  // In production builds, Vite uses nonces for inline scripts
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Vite HMR and React
      "style-src 'self' 'unsafe-inline'", // Required for styled-components/emotion/tailwind
      "img-src 'self' data: https: blob:", // Allow images from all HTTPS sources
      "font-src 'self' data:",
      "connect-src 'self' https://api.scryfall.com https://api.pokemontcg.io https://api.tcgplayer.com", // Added Scryfall
      "frame-ancestors 'none'", // ✅ Replaces X-Frame-Options: DENY
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests" // Automatically upgrade HTTP to HTTPS
    ].join('; ')
  );

  // ✅ Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // ✅ Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ✅ Permissions Policy (modern replacement for Feature-Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  // ✅ Strict-Transport-Security (HSTS) for HTTPS only
  if (_req.protocol === 'https' || _req.get('x-forwarded-proto') === 'https') {
    res.setHeader(
      'Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // ✅ Remove deprecated/unnecessary headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('X-XSS-Protection'); // Deprecated, CSP is better
  res.removeHeader('X-Frame-Options'); // Replaced by CSP frame-ancestors
  res.removeHeader('Pragma'); // Deprecated request header
  res.removeHeader('Expires'); // Use Cache-Control instead

  // ✅ Proper Cache-Control based on route
  if (_req.path.startsWith('/api/')) {
    // API responses: no caching
    res.setHeader('Cache-Control', 'no-store, max-age=0');
  }

  next();
};

export default securityHeaders;