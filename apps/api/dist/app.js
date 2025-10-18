"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
// apps/api/src/app.ts
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const api_1 = __importDefault(require("./routes/api"));
const auth_1 = __importDefault(require("./routes/auth"));
const filters_1 = __importDefault(require("./routes/filters"));
function createApp() {
    const app = (0, express_1.default)();
    app.set("trust proxy", 1);
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }));
    app.use(express_1.default.json({ limit: "1mb" }));
    app.use((0, cookie_parser_1.default)());
    const allowed = (process.env.CORS_ORIGINS || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
    app.use((0, cors_1.default)({
        origin(origin, cb) {
            if (!origin || allowed.includes(origin))
                return cb(null, true);
            return cb(new Error("Not allowed by CORS"));
        },
        credentials: true,
    }));
    app.options("*", (0, cors_1.default)());
    // Health
    app.get("/health", (_req, res) => res.json({ ok: true }));
    // Routes
    app.use("/api/auth", auth_1.default);
    app.use("/api/filters", filters_1.default);
    app.use("/api", api_1.default);
    // Errors
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((err, _req, res, _next) => {
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
