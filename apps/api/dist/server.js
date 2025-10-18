"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/server.ts
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = require("express-rate-limit");
// ⚠️ NodeNext ESM: include .js extension for local imports
const index_js_1 = __importDefault(require("./routes/index.js"));
const app = (0, express_1.default)();
// Behind Render/NGINX → trust proxy for correct IPs
app.set("trust proxy", 1);
// Security headers (loosen CORP to allow cross-origin if you host web elsewhere)
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
// Parsers
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: 10 * 1024 * 1024 })); // 10MB
app.use(express_1.default.urlencoded({ extended: true, limit: 10 * 1024 * 1024 }));
// CORS allowlist (comma-separated)
const allowlist = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) || [];
app.use((0, cors_1.default)({
    origin(origin, cb) {
        if (!origin || allowlist.includes(origin))
            return cb(null, true);
        return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
}));
app.options(/.*/, (0, cors_1.default)());
// ---------- RATE LIMITS (v7) ----------
// Type as RequestHandler so Express picks the right overload
const apiLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
});
const adminLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: "draft-8",
    legacyHeaders: false,
});
const loginLimiter = (0, express_rate_limit_1.rateLimit)({
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
app.use("/api", index_js_1.default);
// Errors (keep last)
app.use(
// eslint-disable-next-line @typescript-eslint/no-unused-vars
(err, _req, res, _next) => {
    if (err?.message?.startsWith("CORS blocked")) {
        return res.status(403).json({ error: err.message });
    }
    console.error("❌ API error:", err);
    res.status(500).json({ error: "Internal server error" });
});
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
