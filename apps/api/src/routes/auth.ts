import express from "express";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";

const router = express.Router();

// Simplified response debugging middleware - no method overrides
const debugResponse = (req: Request, res: Response, next: express.NextFunction) => {
  console.log(`\n=== RESPONSE DEBUG FOR ${req.method} ${req.url} ===`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`Body:`, JSON.stringify(req.body, null, 2));

  // Listen for response events without overriding methods
  res.on('finish', () => {
    console.log(`🔍 Response finished - Status: ${res.statusCode}, Headers sent: ${res.headersSent}`);
  });

  res.on('close', () => {
    console.log(`🔍 Response closed - Status: ${res.statusCode}`);
  });

  console.log(`=== DEBUG MIDDLEWARE SETUP COMPLETE ===\n`);
  next();
};

// Global request logging middleware
router.use((req: Request, res: Response, next: express.NextFunction) => {
  console.log(`\n🚀 INCOMING REQUEST: ${req.method} ${req.originalUrl || req.url}`);
  console.log(`🚀 Timestamp: ${new Date().toISOString()}`);
  console.log(`🚀 User-Agent: ${req.headers['user-agent'] || 'N/A'}`);
  console.log(`🚀 Content-Type: ${req.headers['content-type'] || 'N/A'}`);
  console.log(`🚀 Accept: ${req.headers['accept'] || 'N/A'}`);
  console.log(`🚀 Origin: ${req.headers['origin'] || 'N/A'}`);
  console.log(`🚀 Raw body type: ${typeof req.body}`);
  console.log(`🚀 Raw body: ${JSON.stringify(req.body)}`);
  console.log(`🚀 Query params: ${JSON.stringify(req.query)}`);
  console.log(`🚀 Request complete: true\n`);

  next();
});

// Apply debug middleware to all auth routes
router.use(debugResponse);

/**
 * POST /api/auth/admin/login
 * Authenticates admin and issues JWT cookie
 */
router.post("/admin/login", async (req: Request, res: Response) => {
  console.log("=== ADMIN LOGIN START ===");
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  try {
    const { username, password } = req.body;

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      console.error("Invalid request body");
      return res.status(400).json({ error: "Invalid request format" });
    }

    if (!username || !password) {
      console.error("Missing credentials");
      return res.status(400).json({ error: "Username and password are required" });
    }

    const validUsername = process.env.ADMIN_USERNAME;
    const validPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!validUsername || !validPasswordHash) {
      console.error("Missing environment variables");
      return res.status(500).json({ error: "Server configuration error" });
    }

    if (username !== validUsername) {
      console.log("Invalid username attempt");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, validPasswordHash);
    if (!isValidPassword) {
      console.log("Invalid password attempt");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log("Credentials validated, creating JWT");

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("Missing JWT_SECRET environment variable");
      return res.status(500).json({ error: "Server misconfiguration" });
    }

    const token = jwt.sign(
      { username, role: "admin" },
      JWT_SECRET as Secret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
      } as SignOptions
    );

    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    const responseData = {
      success: true,
      message: "Login successful",
      expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    };

    console.log("Sending login success response");
    return res.status(200).json(responseData);

  } catch (error) {
    console.error("Login error:", error instanceof Error ? error.message : String(error));
    return res.status(500).json({
      error: "Login failed",
      details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
});

/**
 * POST /api/auth/admin/logout
 */
router.post("/admin/logout", (_req: Request, res: Response) => {
  console.log("Admin logout request");

  res.clearCookie("adminToken");

  return res.status(200).json({ success: true, message: "Logged out successfully" });
});

/**
 * GET /api/auth/admin/check
 */
router.get("/admin/auth/check", (req: Request, res: Response) => {
  console.log("Admin auth check request");

  try {
    const token = req.cookies?.adminToken;
    if (!token) {
      console.log("No admin token found");
      return res.status(401).json({ authenticated: false });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("Missing JWT_SECRET environment variable");
      return res.status(500).json({ error: "Server configuration error", authenticated: false });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      username: string;
      role: string;
      exp: number;
    };

    return res.status(200).json({
      authenticated: true,
      user: { username: decoded.username, role: decoded.role },
      expiresAt: decoded.exp * 1000,
    });
  } catch (error) {
    console.error("Auth check failed:", error instanceof Error ? error.message : String(error));
    return res.status(401).json({ authenticated: false, error: "Token verification failed" });
  }
});

export default router;
