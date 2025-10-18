// apps/api/src/db.ts
// Re-export the real DB module. Using .js in the path keeps ESM/node16 happy.
export * from './lib/db.js';
