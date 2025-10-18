import express from "express";
import helmet from "helmet";
import cors, { CorsOptionsDelegate, CorsRequest } from "cors";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes/api.js";
import authRoutes from "./routes/auth.js";
import filtersRoutes from "./routes/filters.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  const allowedOrigins = process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(",").map((s) => s.trim())
    : [];

  const corsDelegate: CorsOptionsDelegate<CorsRequest> = (
    req,
    cb: (err: Error | null, options?: cors.CorsOptions) => void
  ) => {
    const origin = req.headers.origin; // ✅ correct for CorsRequest type

    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, { origin: true, credentials: true });
    } else {
      cb(new Error(`Not allowed by CORS: ${origin}`));
    }
  };

  app.use(cors(corsDelegate));
  app.options(/.*/, cors(corsDelegate));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "Mana & Meeples API", version: "1.0.0" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/filters", filtersRoutes);
  app.use("/api", apiRoutes);

  // error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.message?.includes("CORS")) return res.status(403).json({ error: "CORS policy violation" });
    console.error("❌ API error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  return app;
}
