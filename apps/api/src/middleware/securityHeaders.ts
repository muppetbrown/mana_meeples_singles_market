// apps/api/src/middleware/securityHeaders.ts
import type { RequestHandler } from 'express';

/**
 * Security headers middleware
 * Sets proper headers for security and performance
 */
export const securityHeaders: RequestHandler = (_req, res, next) => {
  // Content Security Policy (replaces X-Frame-Options)
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'none'; default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
  );

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (replaces Feature-Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  // Cache Control for API responses
  if (_req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
  }

  // Remove unnecessary headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('X-XSS-Protection'); // Deprecated, CSP is better

  next();
};