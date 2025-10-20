// apps/api/src/routes/api.ts
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

// IMPORTANT: keep .js extensions to match ESM transpilation in this repo.
import cardsRouter from "./cards.js";
import variationsRouter from "./variations.js";

/**
 * Augment Express Request to hold validated values without heavy typing.
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
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

const router = express.Router();

/* ------------------------- Health & Diagnostics ------------------------- */

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

/* --------------------------- Mount Sub-Routers -------------------------- */

router.use(cardsRouter);
router.use(variationsRouter);

// If you later add sets, games, inventory, orders routes, mount them here:
// router.use(setsRouter);
// router.use(gamesRouter);
// router.use(inventoryRouter);
// router.use(ordersRouter);

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
