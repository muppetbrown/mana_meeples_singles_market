// apps/api/src/routes/index.ts
import express from "express";

import apiRoutes from "./api";
import authRoutes from "./auth";
import filtersRoutes from "./filters";
import variationsRoutes from "./variations";

const router = express.Router();

// --- Route grouping ---
// These prefixes ensure consistent, predictable API paths.

router.use("/auth", authRoutes);
router.use("/filters", filtersRoutes);
router.use("/variations", variationsRoutes);

// The main catalog API routes (cards, inventory, etc.)
router.use("/", apiRoutes);

// Healthcheck shortcut (optional convenience)
router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Mana & Meeples API", version: "1.0.0" });
});

export default router;
