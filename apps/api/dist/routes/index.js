"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/index.ts
const express_1 = __importDefault(require("express"));
const api_1 = __importDefault(require("./api"));
const auth_1 = __importDefault(require("./auth"));
const filters_1 = __importDefault(require("./filters"));
const variations_1 = __importDefault(require("./variations"));
const router = express_1.default.Router();
// --- Route grouping ---
// These prefixes ensure consistent, predictable API paths.
router.use("/auth", auth_1.default);
router.use("/filters", filters_1.default);
router.use("/variations", variations_1.default);
// The main catalog API routes (cards, inventory, etc.)
router.use("/", api_1.default);
// Healthcheck shortcut (optional convenience)
router.get("/health", (_req, res) => {
    res.json({ ok: true, service: "Mana & Meeples API", version: "1.0.0" });
});
exports.default = router;
