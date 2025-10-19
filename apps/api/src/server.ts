// apps/api/src/server.ts
import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './lib/env.js';

const app = createApp();

const PORT = env.PORT;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ API+Web listening on http://${HOST}:${PORT}`);
  console.log(`🔐 Environment variables status:`);
  console.log(`  ADMIN_USERNAME: ${env.ADMIN_USERNAME ? '✅ SET' : '❌ MISSING'}`);
  console.log(`  ADMIN_PASSWORD_HASH: ${env.ADMIN_PASSWORD_HASH ? '✅ SET' : '❌ MISSING'}`);
  console.log(`  JWT_SECRET: ${env.JWT_SECRET ? '✅ SET' : '❌ MISSING'}`);
  console.log(`  NODE_ENV: ${env.NODE_ENV}`);
  console.log(`  ALLOWED_ORIGINS: ${env.ALLOWED_ORIGINS || 'NOT SET'}`);
});

// Graceful shutdown
['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    console.log(`\n📴 Received ${sig}, shutting down gracefully...`);
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
});

export default app;