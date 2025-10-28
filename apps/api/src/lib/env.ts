// apps/api/src/lib/env.ts
import { z } from "zod";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ============================================
// Load environment variables HERE (not in server.ts)
// ============================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env then .env.local (local overrides production)
config({ path: path.resolve(__dirname, '../../.env') });
config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

console.log('🔧 env.ts: Environment variables loaded');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ MISSING');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✅ SET' : '❌ MISSING');
console.log('  ADMIN_USERNAME:', process.env.ADMIN_USERNAME || '❌ MISSING');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log();

// ============================================
// SCHEMA
// ============================================
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_EXPIRES_IN: z.string().default("24h"),

  // Admin authentication
  ADMIN_USERNAME: z.string().min(1, "ADMIN_USERNAME is required"),
  ADMIN_PASSWORD_HASH: z.string().min(1, "ADMIN_PASSWORD_HASH is required"),
  ADMIN_PASSWORD: z.string().optional(),

  // CORS settings
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  ADDITIONAL_CORS_ORIGINS: z.string().optional(),

  // Cookie settings
  COOKIE_DOMAIN: z.string().optional(),
  CROSS_ORIGIN: z.string().transform((v) => v === "true").default("false"),

  // Session Configuration
  SESSION_SECRET: z.string().optional(),

  // CSP Configuration
  CSP_CONNECT_SRC: z.string().optional(),

  // Optional email/SMTP settings
  OWNER_EMAIL: z.string().email().optional(),
  EMAIL_FROM: z.string().email().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z.string().transform((v) => v === "true").optional(),
  SMTP_FROM: z.string().email().optional(),
});

// ============================================
// TYPES & VALIDATION
// ============================================
export type Env = z.infer<typeof EnvSchema>;
export const env: Env = EnvSchema.parse(process.env);