// apps/api/src/app.ts
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes/api";
import authRoutes from "./routes/auth";
import filtersRoutes from "./routes/filters";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  const allowed = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || allowed.includes(origin)) return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
      },
      credentials: true,
    })
  );

  app.options("*", cors());

  // Health
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/filters", filtersRoutes);
  app.use("/api", apiRoutes);

  // Errors
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.message === "Not allowed by CORS") {
      return res.status(403).json({ error: "CORS policy violation" });
    }
    console.error("❌ API error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  // 404
  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  return app;
}
