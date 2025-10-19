import express from "express";
import type { Request, Response } from "express";
import {
  createJWT,
  verifyJWT,
  validateCredentials,
  getAuthCookieConfig,
  addSecurityDelay,
} from "../lib/authUtils.js";
import { env } from "../lib/env.js";

const router = express.Router();

// Comprehensive request logging for debugging empty responses
router.use((req: Request, res: Response, next: express.NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`\n=== AUTH REQUEST START ${timestamp} ===`);
  console.log(`🔐 ${req.method} ${req.originalUrl || req.url}`);
  console.log(`📋 Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`📦 Body:`, JSON.stringify(req.body, null, 2));
  console.log(`🍪 Cookies:`, JSON.stringify(req.cookies, null, 2));

  // Hook into response to log what's being sent
  const originalJson = res.json.bind(res);
  res.json = function(body?: any) {
    console.log(`📤 RESPONSE JSON:`, JSON.stringify(body, null, 2));
    console.log(`📊 Status Code:`, res.statusCode);
    console.log(`=== AUTH REQUEST END ===\n`);
    return originalJson(body);
  };

  next();
});

/**
 * POST /api/auth/admin/login
 * Authenticates admin and issues JWT cookie
 */
router.post("/admin/login", async (req: Request, res: Response) => {
  console.log("🔑 Admin login attempt - entering handler");
  console.log("🔍 Request body type:", typeof req.body);
  console.log("🔍 Request body content:", req.body);

  try {
    const { username, password } = req.body;
    console.log("🔍 Extracted credentials:", { username: username || 'MISSING', hasPassword: !!password });

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      console.error("❌ Invalid request body - type:", typeof req.body);
      console.error("❌ Request body value:", req.body);
      return res.status(400).json({ error: "Invalid request format" });
    }

    if (!username || !password) {
      console.error("❌ Missing credentials");
      return res.status(400).json({ error: "Username and password are required" });
    }

    const isValid = await validateCredentials(username, password);
    if (!isValid) {
      console.log("❌ Invalid credentials attempt");
      await addSecurityDelay();
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = createJWT({ username, role: "admin" });
    res.cookie("adminToken", token, getAuthCookieConfig());

    const responseData = {
      success: true,
      message: "Login successful",
      expiresIn: env.JWT_EXPIRES_IN,
    };

    console.log("✅ Admin login successful, preparing response");
    console.log("✅ Response data:", JSON.stringify(responseData, null, 2));
    console.log("✅ About to call res.status(200).json()");

    res.status(200).json(responseData);
    console.log("✅ res.json() call completed");

  } catch (error) {
    console.error("❌ Login error:", error instanceof Error ? error.message : String(error));
    res.status(500).json({
      error: "Login failed",
      details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
});

/**
 * POST /api/auth/admin/logout
 */
router.post("/admin/logout", (_req: Request, res: Response) => {
  console.log("🚪 Admin logout request");
  res.clearCookie("adminToken");
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

/**
 * GET /api/auth/admin/check
 */
router.get("/admin/auth/check", (req: Request, res: Response) => {
  console.log("🔍 Admin auth check request");

  try {
    const token = req.cookies?.adminToken;
    if (!token) {
      console.log("❌ No admin token found");
      return res.status(401).json({ authenticated: false });
    }

    const decoded = verifyJWT(token);

    console.log("✅ Admin auth check successful");
    return res.status(200).json({
      authenticated: true,
      user: { username: decoded.username, role: decoded.role },
      expiresAt: decoded.exp * 1000,
    });
  } catch (error) {
    console.error("❌ Auth check failed:", error instanceof Error ? error.message : String(error));
    return res.status(401).json({ authenticated: false, error: "Token verification failed" });
  }
});

export default router;
