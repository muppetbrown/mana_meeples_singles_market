// apps/api/src/routes/index.ts
import express from "express";

import apiRoutes from "./api.js";
import authRoutes from "./auth.js";
import variationsRoutes from "./variations.js";
import filtersRoutes from "./filters.js";
import ordersRoutes from "./orders.js";
import inventoryRoutes from "./inventory.js";
import additionalRoutes from "./additional.js";

const router = express.Router();

// --- Route grouping ---
router.use("/auth", authRoutes);
router.use("/filters", filtersRoutes);
router.use("/variations", variationsRoutes);

// ✅ NEW: Order management
router.use("/", ordersRoutes);

// ✅ NEW: Inventory management  
router.use("/", inventoryRoutes);

// ✅ NEW: Sets, Games, Search
router.use("/", additionalRoutes);

// The main catalog API routes (cards, inventory, etc.)
router.use("/", apiRoutes);

// Healthcheck shortcut (optional convenience)
router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Mana & Meeples API", version: "1.0.0" });
});

export default router;