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

  // Single or comma-separated origins
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Optional email/SMTP settings
  EMAIL_FROM: z.string().email().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

// ---------- TYPES ----------
export type Env = z.infer<typeof EnvSchema>;

// ---------- VALIDATION ----------
export const env: Env = EnvSchema.parse(process.env);
