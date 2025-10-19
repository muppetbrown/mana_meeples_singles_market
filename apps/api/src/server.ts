// apps/api/src/server.ts
import 'dotenv/config'; // Load environment variables first
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
// If you still have CORS middleware around, you can remove it for same-origin.
import routes from './routes/index.js'; // keep your existing API router
import { pool, db, healthcheck, withConn } from './db.js';

// __dirname for NodeNext
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Behind Render's proxy -> ensures correct client IP for rate limiting/logging
app.set('trust proxy', 1);

// Basic hardening (same-origin policy)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"], // Vite inlines some styles
        "img-src": ["'self'", "data:"],
        "font-src": ["'self'", "data:"],
        "connect-src": ["'self'"], // same-origin API + HMR in dev (not used in prod)
        "frame-ancestors": ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // avoids COEP issues for some assets
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Gzip/deflate compression for static + API JSON
app.use(compression());

// --- API FIRST ---
// Health (nice for smoke tests and uptime checks)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'Mana & Meeples API',
    version: process.env.APP_VERSION ?? '1.0.0',
    time: new Date().toISOString(),
    env: {
      hasAdminUsername: !!process.env.ADMIN_USERNAME,
      hasAdminPasswordHash: !!process.env.ADMIN_PASSWORD_HASH,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  });
});

app.get('/api/health/db', async (_req, res) => {
  try {
    const ok = await healthcheck();
    if (!ok) return res.status(500).json({ database: 'disconnected' });
    res.status(200).json({ database: 'connected' });
  } catch (err: any) {
    res.status(500).json({
      database: 'disconnected',
    });
  }
});

app.get('/api/health/db/deep', async (_req, res) => {
  try {
    // Existence & perms check
    await pool.query(`SELECT 1 FROM cards LIMIT 1`);
    // Sample data (cheap)
    const rows = await db.query<{ id: number; name: string }>(
      `SELECT id, name FROM cards ORDER BY id DESC LIMIT 1`
    );
    res.status(200).json({ db: true, cardsTable: true, sample: rows[0] ?? null });
  } catch (err: any) {
    res.status(500).json({
      db: false,
      cardsTable: false,
      error: err?.message ?? 'unknown',
      code: err?.code,
    });
  }
});

// Mount your actual API routes under /api
app.use('/api', routes);

// 404s for API only (so SPA routes don't get caught)
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// --- STATIC + SPA FALLBACK ---
// We copy the Vite build into this directory at build-time (see Render build step)
const publicDir = path.join(__dirname, 'public');

// Cache-busted assets get long cache, HTML gets short cache
app.use(
  express.static(publicDir, {
    etag: true,
    lastModified: true,
    maxAge: '1h',
    index: 'index.html',
  })
);

app.get(/.*/, (_req: Request, res: Response, next: NextFunction) => {
  const accept = _req.headers.accept || '';
  if (accept.includes('text/html')) {
    res.sendFile(path.join(publicDir, 'index.html'));
  } else {
    next();
  }
});

// --- START SERVER ---
const PORT = Number(process.env.PORT) || 10000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ API+Web listening on http://${HOST}:${PORT}`);
  console.log(`🔐 Environment variables status:`);
  console.log(`  ADMIN_USERNAME: ${process.env.ADMIN_USERNAME ? '✅ SET' : '❌ MISSING'}`);
  console.log(`  ADMIN_PASSWORD_HASH: ${process.env.ADMIN_PASSWORD_HASH ? '✅ SET' : '❌ MISSING'}`);
  console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? '✅ SET' : '❌ MISSING'}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown on Render
['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
});

export default app;