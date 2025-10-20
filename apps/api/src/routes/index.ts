// apps/api/src/routes/index.ts
import express from "express";

import apiRoutes from "./api.js";
import authRoutes from "./auth.js";
import variationsRoutes from "./variations.js";

const router = express.Router();

// Route grouping:
router.use("/auth", authRoutes);
router.use("/variations", variationsRoutes);

// Main catalog routes (cards, etc.)
router.use("/", apiRoutes);

// Healthcheck shortcut
router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Mana & Meeples API", version: "1.0.0" });
});

export default router;
