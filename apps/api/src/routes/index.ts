// apps/api/src/routes/index.ts
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

import authRoutes from "./auth.js";
import cardsRoutes from "./cards.js";
import variationsRoutes from "./variations.js";
//import filtersRoutes from "./filters.js";
import ordersRoutes from "./orders.js";
import inventoryRoutes from "./inventory.js";
import additionalRoutes from "./additional.js";
import storefrontRouter from './storefront.js'; //

const router = express.Router();

// --- Route grouping ---
router.use("/auth", authRoutes);
//router.use("/filters", filtersRoutes);
router.use("/variations", variationsRoutes);
router.use("/cards", cardsRoutes); // exposes /cards/cards, /cards/count, /cards/filters
router.use('/storefront', storefrontRouter);
router.use("/", ordersRoutes);
router.use("/", inventoryRoutes); // exposes /admin/inventory
router.use("/", additionalRoutes);

/**
 * Augment Express Request to hold validated values without heavy typing.
 */
declare global {
  namespace Express {
    interface Request {
      validated?: {
        query?: unknown;
        body?: unknown;
        params?: unknown;
      };
    }
  }
}

/* ------------------------- Health & Diagnostics ------------------------- */

router.get("/health", (_req, res) => {
  res.json({ 
    ok: true, 
    service: "Mana & Meeples API", 
    version: "1.0.0" 
  });
});

router.get("/healthz", (_req, res) => {
  res.json({
    status: "ok",
    service: "api",
    at: new Date().toISOString(),
  });
});

router.get("/readyz", (_req, res) => {
  res.json({
    status: "ready",
    deps: { db: "unknown" },
    at: new Date().toISOString(),
  });
});

/* ---------------------- Validation / Coercion Helpers ------------------- */

export const validateQuery =
  <S extends z.ZodTypeAny>(schema: S) =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parsed.error.flatten(),
      });
    }
    req.validated = { ...(req.validated ?? {}), query: parsed.data };
    next();
  };

export const validateParams =
  <S extends z.ZodTypeAny>(schema: S) =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid URL params",
        details: parsed.error.flatten(),
      });
    }
    req.validated = { ...(req.validated ?? {}), params: parsed.data };
    next();
  };

export const validateBody =
  <S extends z.ZodTypeAny>(schema: S) =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: parsed.error.flatten(),
      });
    }
    req.validated = { ...(req.validated ?? {}), body: parsed.data };
    next();
  };

/* ------------------------- 404 & Error Handling ------------------------- */

router.use((req, res, next) => {
  if (req.path.startsWith("/")) {
    return res.status(404).json({
      error: "Not Found",
      path: req.originalUrl,
    });
  }
  next();
});

router.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      (typeof err === "object" &&
        err !== null &&
        "status" in err &&
        typeof (err as any).status === "number" &&
        (err as any).status) || 500;

    const message =
      (typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as any).message === "string" &&
        (err as any).message) || "Internal Server Error";

    res.status(status).json({ error: message });
  }
);

export default router;