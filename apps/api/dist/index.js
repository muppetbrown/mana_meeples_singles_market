"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cards_1 = require("./routes/cards");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use(express_1.default.json({ limit: "1mb" }));
app.use((0, cors_1.default)({
    origin: [process.env.FRONTEND_ORIGIN ?? "*"],
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/cards", cards_1.cardsRouter);
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`API listening on :${port}`));
