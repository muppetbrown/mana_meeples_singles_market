import express from "express";
import helmet from "helmet";
import cors from "cors";
import type { CorsOptionsDelegate, CorsRequest } from "cors";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes/api.js";
import authRoutes from "./routes/auth.js";
import filtersRoutes from "./routes/filters.js";
import path from "path";
import fs from "fs";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  // ✅ Helmet baseline hardened; leave CSP disabled for SPA flexibility
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  /** ===============================
   *  ✅ CORS configuration
   *  =============================== */
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN)
    ? (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN)!
        .split(",")
        .map((s) => s.trim())
    : [];

  const corsDelegate: CorsOptionsDelegate<CorsRequest> = (
    req,
    cb: (err: Error | null, options?: cors.CorsOptions) => void
  ) => {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, { origin: true, credentials: true });
    } else {
      cb(new Error(`Not allowed by CORS: ${origin}`));
    }
  };

  app.use(cors(corsDelegate));
  app.options(/.*/, cors(corsDelegate));

  /** ===============================
   *  ✅ API routes
   *  =============================== */
  app.get("/health", (_req, res) =>
    res.json({ ok: true, service: "Mana & Meeples API", version: "1.0.0" })
  );

  // 🔍 Debug endpoint to check CORS configuration
  app.get("/cors-debug", (_req, res) => {
    res.json({
      allowedOrigins,
      envVars: {
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || null,
        ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || null,
      },
      requestOrigin: _req.headers.origin || null,
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/filters", filtersRoutes);
  app.use("/api", apiRoutes);

  /** ===============================
   *  ✅ Enhanced static + header handling
   *  =============================== */
  const __dirname = path.resolve();
  const frontendDist = path.join(__dirname, "../web/dist");

  const oneYear = 31536000;

  // Explicit favicon route with correct type
  app.get("/favicon.ico", (_req, res) => {
    const file = path.join(frontendDist, "favicon.ico");
    if (fs.existsSync(file)) {
      res.type("image/x-icon");
      res.setHeader("Cache-Control", "public, max-age=604800"); // 7 days
      return res.sendFile(file);
    }
    return res.status(404).end();
  });

  // Explicit manifest route with correct type + short cache
  app.get("/manifest.webmanifest", (_req, res) => {
    const file = path.join(frontendDist, "manifest.webmanifest");
    if (fs.existsSync(file)) {
      res.type("application/manifest+json");
      res.setHeader("Cache-Control", "max-age=180, must-revalidate"); // <=180s
      return res.sendFile(file);
    }
    return res.status(404).end();
  });

  // Static assets with smart caching
  app.use(
    express.static(frontendDist, {
      setHeaders: (res, filePath) => {
        // Ensure safe sniffing
        res.setHeader("X-Content-Type-Options", "nosniff");

        // HTML always no-store (fixes audit "Target should not be cached")
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-store, must-revalidate");
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          return;
        }

        // Fingerprinted assets: long cache
        if (/\.[0-9a-f]{8,}\.(js|css|png|jpg|svg|woff2?)$/i.test(filePath)) {
          res.setHeader("Cache-Control", `public, max-age=${oneYear}, immutable`);
        } else {
          // Default short cache for other static assets
          res.setHeader("Cache-Control", "public, max-age=180, must-revalidate");
        }
      },
    })
  );

  // SPA fallback route (for client-side routing)
  // ⚠️ CHANGED: Express 5.x requires "/*" instead of "*"
  app.get("/:path(.*)", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, must-revalidate");
    res.type("text/html; charset=utf-8");
    res.sendFile(path.join(frontendDist, "index.html"));
  });

  /** ===============================
   *  ✅ Error handlers
   *  =============================== */
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err?.message?.includes("CORS"))
        return res.status(403).json({ error: "CORS policy violation" });

      console.error("❌ API error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  );

  // Final 404 for API endpoints (not static)
  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  return app;
}