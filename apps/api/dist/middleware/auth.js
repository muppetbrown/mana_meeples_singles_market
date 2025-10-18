"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuthWithCSRF = exports.validateCSRFToken = exports.generateCSRFToken = exports.adminAuthBasic = exports.adminAuthJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * JWT-based admin authentication
 */
const adminAuthJWT = async (req, res, next) => {
    try {
        const token = req.cookies?.adminToken;
        if (!token) {
            console.warn("❌ No admin token found in cookies");
            res.status(401).json({
                error: "Authentication required",
                authenticated: false,
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "admin") {
            console.warn("❌ User does not have admin role");
            res.status(403).json({
                error: "Admin access required",
                authenticated: false,
            });
            return;
        }
        // Refresh token if expiring within 15 minutes
        const now = Math.floor(Date.now() / 1000);
        const timeToExpiry = decoded.exp - now;
        if (timeToExpiry < 900) {
            const refreshToken = jsonwebtoken_1.default.sign({ username: decoded.username, role: decoded.role }, process.env.JWT_SECRET, { expiresIn: "24h" });
            res.cookie("adminToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" &&
                    process.env.CROSS_ORIGIN === "true"
                    ? "none"
                    : "strict",
                maxAge: 24 * 60 * 60 * 1000,
                domain: process.env.NODE_ENV === "production"
                    ? process.env.COOKIE_DOMAIN
                    : undefined,
            });
            console.log(`🔄 JWT refreshed for ${decoded.username}`);
        }
        req.user = {
            username: decoded.username,
            role: decoded.role,
            exp: decoded.exp,
            iat: decoded.iat,
        };
        next();
    }
    catch (error) {
        if (error.name === "TokenExpiredError") {
            console.warn("❌ Token expired");
            res.status(401).json({
                error: "Token expired. Please login again.",
                authenticated: false,
            });
            return;
        }
        if (error.name === "JsonWebTokenError") {
            console.warn("❌ Invalid token");
            res.status(401).json({
                error: "Invalid token",
                authenticated: false,
            });
            return;
        }
        console.error("❌ Auth middleware error:", error);
        res.status(500).json({
            error: "Authentication error",
            authenticated: false,
        });
    }
};
exports.adminAuthJWT = adminAuthJWT;
/**
 * Legacy basic authentication (backwards compatibility)
 */
const adminAuthBasic = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Basic ")) {
            res.status(401).json({
                error: "Authentication required",
                hint: "Use Basic Auth with username:password",
            });
            return;
        }
        const base64Credentials = authHeader.split(" ")[1];
        const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
        const [username, password] = credentials.split(":");
        const validUsername = process.env.ADMIN_USERNAME;
        const validPasswordHash = process.env.ADMIN_PASSWORD_HASH;
        if (!validUsername || !validPasswordHash) {
            console.error("❌ Admin credentials not configured");
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
        req.user = { username, role: "admin" };
        next();
    }
    catch (error) {
        console.error("Basic auth error:", error);
        res.status(500).json({ error: "Authentication failed" });
    }
};
exports.adminAuthBasic = adminAuthBasic;
/**
 * Generate CSRF token and set cookies
 */
const generateCSRFToken = (req, res, next) => {
    const csrfToken = crypto_1.default.randomBytes(32).toString("hex");
    res.cookie("csrfToken", csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" &&
            process.env.CROSS_ORIGIN === "true"
            ? "none"
            : "strict",
        maxAge: 24 * 60 * 60 * 1000,
        domain: process.env.NODE_ENV === "production"
            ? process.env.COOKIE_DOMAIN
            : undefined,
    });
    res.cookie("_csrfSecret", csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" &&
            process.env.CROSS_ORIGIN === "true"
            ? "none"
            : "strict",
        maxAge: 24 * 60 * 60 * 1000,
        domain: process.env.NODE_ENV === "production"
            ? process.env.COOKIE_DOMAIN
            : undefined,
    });
    req.csrfToken = csrfToken;
    next();
};
exports.generateCSRFToken = generateCSRFToken;
/**
 * Validate CSRF token for state-changing requests
 */
const validateCSRFToken = (req, res, next) => {
    if (!["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
        return next();
    }
    const clientToken = req.headers["x-csrf-token"] || req.body?._csrfToken;
    const serverToken = req.cookies?._csrfSecret;
    if (!clientToken || !serverToken) {
        console.warn("❌ CSRF token missing");
        res.status(403).json({
            error: "CSRF token required",
            code: "CSRF_TOKEN_MISSING",
        });
        return;
    }
    if (clientToken !== serverToken) {
        console.warn("❌ CSRF token mismatch");
        res.status(403).json({
            error: "Invalid CSRF token",
            code: "CSRF_TOKEN_INVALID",
        });
        return;
    }
    next();
};
exports.validateCSRFToken = validateCSRFToken;
/**
 * Combined admin authentication + CSRF protection
 */
const adminAuthWithCSRF = (req, res, next) => {
    (0, exports.validateCSRFToken)(req, res, (err) => {
        if (err)
            return next(err);
        (0, exports.adminAuthJWT)(req, res, next);
    });
};
exports.adminAuthWithCSRF = adminAuthWithCSRF;
exports.default = {
    adminAuthJWT: exports.adminAuthJWT,
    adminAuthBasic: exports.adminAuthBasic,
    generateCSRFToken: exports.generateCSRFToken,
    validateCSRFToken: exports.validateCSRFToken,
    adminAuthWithCSRF: exports.adminAuthWithCSRF,
};
