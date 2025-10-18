// apps/api/src/server.ts
import express, { RequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";

// ⚠️ NodeNext ESM: include .js extension for local imports
import routes from "./routes/index.js";

const app = express();

// Behind Render/NGINX → trust proxy for correct IPs
app.set("trust proxy", 1);

// Security headers (loosen CORP to allow cross-origin if you host web elsewhere)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Parsers
app.use(cookieParser());
app.use(express.json({ limit: 10 * 1024 * 1024 })); // 10MB
app.use(express.urlencoded({ extended: true, limit: 10 * 1024 * 1024 }));

// CORS allowlist (comma-separated)
const allowlist =
  (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) || [];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowlist.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.options(/.*/, cors());

// ---------- RATE LIMITS (v7) ----------
// Type as RequestHandler so Express picks the right overload
const apiLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const adminLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const loginLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

// Mount limiters to the actual prefixes you use
app.use("/api", apiLimiter);
app.use("/api/auth/admin", adminLimiter);
app.use("/api/auth/admin/login", loginLimiter);

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

// All API routes
app.use("/api", routes);

// Errors (keep last)
app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.message?.startsWith("CORS blocked")) {
      return res.status(403).json({ error: err.message });
    }
    console.error("❌ API error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Start
const PORT = Number(process.env.PORT) || 8080;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ API listening on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
["SIGINT", "SIGTERM"].forEach((sig) => {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
});
