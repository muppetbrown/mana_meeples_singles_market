// apps/api/src/server.ts
import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './lib/env.js';

const app = createApp();

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT) || 10000;

// Start a single server
const server = app.listen(PORT, HOST, () => {
  console.log(`✅ API+Web listening on http://${HOST}:${PORT}`);
  console.log(`🔐 Environment variables status:`);
  console.log(`  ADMIN_USERNAME: ${env.ADMIN_USERNAME ? '✅ SET' : '❌ MISSING'}`);
  console.log(`  ADMIN_PASSWORD_HASH: ${env.ADMIN_PASSWORD_HASH ? '✅ SET' : '❌ MISSING'}`);
  console.log(`  JWT_SECRET: ${env.JWT_SECRET ? '✅ SET' : '❌ MISSING'}`);
  console.log(`  NODE_ENV: ${env.NODE_ENV}`);
  console.log(`  ALLOWED_ORIGINS: ${env.ALLOWED_ORIGINS || 'NOT SET'}`);
});

// Graceful shutdown with a hard cap so we don't hang
const shutdown = (signal: string) => {
  console.log(`\n📴 Received ${signal}, shutting down gracefully...`);
  // Stop accepting new connections
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
  // Force-exit if something refuses to close
  setTimeout(() => {
    console.error('⏱️ Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
};

['SIGINT', 'SIGTERM'].forEach(sig => {
  process.on(sig as NodeJS.Signals, () => shutdown(sig));
});

// Safety nets for unknown crashes
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught exception:', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled rejection:', reason);
  shutdown('unhandledRejection');
});

export default app;
