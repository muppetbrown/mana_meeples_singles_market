"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = express_1.default.Router();
/**
 * POST /api/auth/admin/login
 * Authenticates admin and issues JWT cookie
 */
router.post("/admin/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({ error: "Username and password are required" });
            return;
        }
        const validUsername = process.env.ADMIN_USERNAME;
        const validPasswordHash = process.env.ADMIN_PASSWORD_HASH;
        if (!validUsername || !validPasswordHash) {
            res.status(500).json({ error: "Server configuration error" });
            return;
        }
        if (username !== validUsername) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        const isValidPassword = await bcrypt_1.default.compare(password, validPasswordHash);
        if (!isValidPassword) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        // ---- At this point, credentials are valid ----
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            res.status(500).json({ error: "Server misconfiguration: missing JWT_SECRET" });
            return;
        }
        // 👇 Fix 1: define a strongly typed SignOptions manually
        const signOptions = {
            expiresIn: process.env.JWT_EXPIRES_IN ?? "24h",
        };
        // 👇 Fix 2: cast JWT_SECRET as Secret when calling jwt.sign
        const token = jsonwebtoken_1.default.sign({ username, role: "admin" }, JWT_SECRET, signOptions);
        res.cookie("adminToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000,
            path: "/",
        });
        res.json({
            success: true,
            message: "Login successful",
            expiresIn: signOptions.expiresIn,
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});
/**
 * POST /api/auth/admin/logout
 */
router.post("/admin/logout", (_req, res) => {
    res.clearCookie("adminToken");
    res.json({ success: true, message: "Logged out successfully" });
});
/**
 * GET /api/auth/admin/check
 */
router.get("/admin/auth/check", (req, res) => {
    try {
        const token = req.cookies?.adminToken;
        if (!token) {
            res.status(401).json({ authenticated: false });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        res.json({
            authenticated: true,
            user: { username: decoded.username, role: decoded.role },
            expiresAt: decoded.exp * 1000,
        });
    }
    catch {
        res.status(401).json({ authenticated: false });
    }
});
exports.default = router;
