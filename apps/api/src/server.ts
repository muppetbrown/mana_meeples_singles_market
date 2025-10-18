import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

// ---------- DATABASE ----------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false, require: true }
      : { rejectUnauthorized: false },
  max: Number(process.env.DB_POOL_MAX) || 10,
  min: Number(process.env.DB_POOL_MIN) || 2,
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 10000,
});

pool.on("error", (err) => console.error("⚠️ DB pool error:", err.message));

export const db = {
  async query<T>(text: string, params?: any[]): Promise<T[]> {
    const client = await pool.connect();
    try {
      const res = await client.query(text, params);
      return res.rows as T[];
    } finally {
      client.release();
    }
  },
};

// ---------- ENV CHECK ----------
function validateEnv() {
  const required = ["DATABASE_URL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("❌ Missing env vars:", missing.join(", "));
  } else {
    console.log("✅ Env validated");
  }
}
validateEnv();

// ---------- SECURITY ----------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", process.env.CSP_CONNECT_SRC || "*"],
      },
    },
  })
);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ---------- RATE LIMITS ----------
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
app.use("/api/", apiLimiter);
app.use("/api/admin/", adminLimiter);
app.use("/api/auth/admin/login", loginLimiter);

// ---------- ROUTES ----------
import authRoutes from "./routes/auth";
import apiRoutes from "./routes/api";
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);

// ---------- HEALTH ----------
app.get("/health", async (_req, res) => {
  let dbStatus = "unknown";
  try {
    await db.query("SELECT 1");
    dbStatus = "connected";
  } catch {
    dbStatus = "disconnected";
  }
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    database: dbStatus,
  });
});

// ---------- STATIC ----------
if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "mana-meeples-shop/build");
  app.use("/shop", express.static(buildPath, { maxAge: "1d" }));
  app.get("/shop/*", (_req, res) => res.sendFile(path.join(buildPath, "index.html")));
  app.get("/", (_req, res) => res.redirect("/shop"));
}

// ---------- ERRORS ----------
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("❌ Error:", err.message);
    if (err.message === "Not allowed by CORS") {
      return res.status(403).json({ error: "CORS policy violation" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ---------- START ----------
const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});

["SIGINT", "SIGTERM"].forEach((sig) =>
  process.on(sig, async () => {
    console.log(`🛑 ${sig} received`);
    await pool.end();
    server.close(() => process.exit(0));
  })
);
