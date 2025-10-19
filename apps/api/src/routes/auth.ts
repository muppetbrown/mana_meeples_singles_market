// apps/api/src/routes/auth.ts
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

/**
 * Simple request logging - NO response interception
 * CRITICAL: Do NOT override res.json or any response methods
 */
router.use((req: Request, _res: Response, next: express.NextFunction) => {
  console.log(`🔐 AUTH ${req.method} ${req.originalUrl || req.url} - ${new Date().toISOString()}`);
  next();
});

/**
 * POST /api/auth/admin/login
 * Authenticates admin and issues JWT cookie
 */
router.post("/admin/login", async (req: Request, res: Response): Promise<void> => {
  console.log("🔑 Admin login attempt - handler entered");

  try {
    const { username, password } = req.body;
    console.log("📋 Credentials received:", {
      username: username || "MISSING",
      hasPassword: !!password,
    });

    // Validate request body structure
    if (!req.body || typeof req.body !== "object") {
      console.error("❌ Invalid request body");
      res.status(400).json({ success: false, error: "Invalid request format" });
      return;
    }

    // Validate credentials presence
    if (!username || !password) {
      console.error("❌ Missing credentials");
      res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
      return;
    }

    console.log("🔍 Validating credentials...");
    const isValid = await validateCredentials(username, password);

    if (!isValid) {
      console.log("❌ Invalid credentials");
      await addSecurityDelay();
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    console.log("✅ Credentials valid, generating token...");
    const token = createJWT({ username, role: "admin" });
    console.log("🎫 Token generated");

    // Set cookie
    const cookieConfig = getAuthCookieConfig();
    console.log("🍪 Setting cookie with config:", {
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      domain: cookieConfig.domain || "(current domain)",
    });
    res.cookie("adminToken", token, cookieConfig);

    // Prepare response
    const responseData = {
      success: true,
      message: "Login successful",
      expiresIn: env.JWT_EXPIRES_IN,
    };

    console.log("📤 Sending response:", responseData);

    // Send response - this MUST be the last thing
    res.status(200).json(responseData);
    console.log("✅ Response sent successfully");
    return;

  } catch (error) {
    console.error("❌ Login error:", error);
    console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack");

    res.status(500).json({
      success: false,
      error: "Login failed",
      details:
        env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
    });
    return;
  }
});

/**
 * POST /api/auth/admin/logout
 */
router.post("/admin/logout", (_req: Request, res: Response): void => {
  console.log("🚪 Admin logout request");

  const cookieConfig = getAuthCookieConfig();
  res.clearCookie("adminToken", {
    httpOnly: cookieConfig.httpOnly,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    path: "/",
    domain: cookieConfig.domain,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

/**
 * GET /api/auth/admin/check
 */
router.get("/admin/auth/check", (req: Request, res: Response): void => {
  console.log("🔍 Admin auth check request");

  try {
    const token = req.cookies?.adminToken;

    if (!token) {
      console.log("❌ No admin token found");
      res.status(401).json({
        authenticated: false,
        error: "No authentication token",
      });
      return;
    }

    console.log("🔍 Verifying token...");
    const decoded = verifyJWT(token);

    if (decoded.role !== "admin") {
      console.log("❌ User does not have admin role");
      res.status(403).json({
        authenticated: false,
        error: "Insufficient permissions",
      });
      return;
    }

    console.log("✅ Auth check successful for:", decoded.username);

    res.status(200).json({
      authenticated: true,
      user: {
        username: decoded.username,
        role: decoded.role,
      },
      expiresAt: decoded.exp * 1000,
    });
    return;

  } catch (error) {
    console.error("❌ Auth check failed:", error instanceof Error ? error.message : String(error));

    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        res.status(401).json({
          authenticated: false,
          error: "Token expired",
        });
        return;
      }
      if (error.name === "JsonWebTokenError") {
        res.status(401).json({
          authenticated: false,
          error: "Invalid token",
        });
        return;
      }
    }

    res.status(401).json({
      authenticated: false,
      error: "Authentication failed",
    });
    return;
  }
});

export default router;