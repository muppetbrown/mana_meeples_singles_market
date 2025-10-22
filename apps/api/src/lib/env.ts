import * as dotenv from "dotenv";
import { z } from "zod";

// ✅ Always load .env from the project root (whether running src/ or dist/)
dotenv.config({
  path: process.cwd() + "/.env",
});

// ---------- SCHEMA ----------
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_EXPIRES_IN: z.string().default("24h"),

  // Admin authentication
  ADMIN_USERNAME: z.string().min(1, "ADMIN_USERNAME is required"),
  ADMIN_PASSWORD_HASH: z.string().min(1, "ADMIN_PASSWORD_HASH is required"),
  ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD is required"),

  // CORS settings
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  ADDITIONAL_CORS_ORIGINS: z.string().optional(),

  // Cookie settings
  COOKIE_DOMAIN: z.string().optional(),
  CROSS_ORIGIN: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

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
  SMTP_SECURE: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  SMTP_FROM: z.string().email().optional(),
});

// ---------- TYPES ----------
export type Env = z.infer<typeof EnvSchema>;

// ---------- VALIDATION ----------
export const env: Env = EnvSchema.parse(process.env);
