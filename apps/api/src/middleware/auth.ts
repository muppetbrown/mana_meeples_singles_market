import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import {
  verifyJWT,
  createJWT,
  shouldRefreshToken,
  validateCredentials,
  getAuthCookieConfig,
  getCSRFCookieConfig,
  addSecurityDelay,
} from "../lib/authUtils.js";
import { env } from "../lib/env.js";

/**
 * JWT-based admin authentication
 */
export const adminAuthJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

    const decoded = verifyJWT(token);

    if (decoded.role !== "admin") {
      console.warn("❌ User does not have admin role");
      res.status(403).json({
        error: "Admin access required",
        authenticated: false,
      });
      return;
    }

    // Refresh token if expiring within 15 minutes
    if (shouldRefreshToken(decoded)) {
      const refreshToken = createJWT({
        username: decoded.username,
        role: decoded.role,
      });

      res.cookie("adminToken", refreshToken, getAuthCookieConfig());
      console.log(`🔄 JWT refreshed for ${decoded.username}`);
    }

    // Extend Request type properly instead of using 'as any'
    (req as Request & { user: { username: string; role: string; exp: number; iat: number } }).user = {
      username: decoded.username,
      role: decoded.role,
      exp: decoded.exp,
      iat: decoded.iat,
    };

    next();
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "TokenExpiredError") {
      console.warn("❌ Token expired");
      res.status(401).json({
        error: "Token expired. Please login again.",
        authenticated: false,
      });
      return;
    }

    if (error instanceof Error && error.name === "JsonWebTokenError") {
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

/**
 * Legacy basic authentication (backwards compatibility)
 */
export const adminAuthBasic = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

    const isValid = await validateCredentials(username, password);
    if (!isValid) {
      await addSecurityDelay();
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    (req as Request & { user: { username: string; role: string } }).user = { username, role: "admin" };
    next();
  } catch (error) {
    console.error("Basic auth error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};

/**
 * Generate CSRF token and set cookies
 */
export const generateCSRFToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const csrfToken = crypto.randomBytes(32).toString("hex");

  res.cookie("csrfToken", csrfToken, getCSRFCookieConfig(false));
  res.cookie("_csrfSecret", csrfToken, getCSRFCookieConfig(true));

  (req as Request & { csrfToken: string }).csrfToken = csrfToken;
  next();
};

/**
 * Validate CSRF token for state-changing requests
 */
export const validateCSRFToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return next();
  }

  const clientToken = req.headers["x-csrf-token"] || (req.body && typeof req.body === 'object' && '_csrfToken' in req.body ? req.body._csrfToken : undefined);
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

/**
 * Combined admin authentication + CSRF protection
 */
export const adminAuthWithCSRF = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  validateCSRFToken(req, res, (err?: unknown) => {
    if (err) return next(err);
    adminAuthJWT(req, res, next);
  });
};

export default {
  adminAuthJWT,
  adminAuthBasic,
  generateCSRFToken,
  validateCSRFToken,
  adminAuthWithCSRF,
};
