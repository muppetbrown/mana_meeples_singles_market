"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const api_js_1 = __importDefault(require("./routes/api.js"));
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const filters_js_1 = __importDefault(require("./routes/filters.js"));
const path_1 = __importDefault(require("path"));
function createApp() {
    const app = (0, express_1.default)();
    app.set("trust proxy", 1);
    app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
    app.use(express_1.default.json({ limit: "1mb" }));
    app.use((0, cookie_parser_1.default)());
    const allowedOrigins = process.env.ALLOWED_ORIGIN
        ? process.env.ALLOWED_ORIGIN.split(",").map((s) => s.trim())
        : [];
    const corsDelegate = (req, cb) => {
        const origin = req.headers.origin; // ✅ correct for CorsRequest type
        if (!origin || allowedOrigins.includes(origin)) {
            cb(null, { origin: true, credentials: true });
        }
        else {
            cb(new Error(`Not allowed by CORS: ${origin}`));
        }
    };
    app.use((0, cors_1.default)(corsDelegate));
    app.options(/.*/, (0, cors_1.default)(corsDelegate));
    app.get("/health", (_req, res) => res.json({ ok: true, service: "Mana & Meeples API", version: "1.0.0" }));
    app.use("/api/auth", auth_js_1.default);
    app.use("/api/filters", filters_js_1.default);
    app.use("/api", api_js_1.default);
    // error handler
    app.use((err, _req, res, _next) => {
        if (err?.message?.includes("CORS"))
            return res.status(403).json({ error: "CORS policy violation" });
        console.error("❌ API error:", err);
        res.status(500).json({ error: "Internal server error" });
    });
    const __dirname = path_1.default.resolve();
    const frontendDist = path_1.default.join(__dirname, "../web/dist");
    app.use(express_1.default.static(frontendDist));
    app.get("*", (_req, res) => {
        res.sendFile(path_1.default.join(frontendDist, "index.html"));
    });
    app.use((_req, res) => res.status(404).json({ error: "Not found" }));
    return app;
}
