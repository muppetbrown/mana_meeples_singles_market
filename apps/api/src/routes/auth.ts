import express from "express";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";

const router = express.Router();

/**
 * POST /api/auth/admin/login
 * Authenticates admin and issues JWT cookie
 */
router.post("/admin/login", async (req: Request, res: Response) => {
  // Set JSON content type explicitly
  res.setHeader('Content-Type', 'application/json');

  try {
    const { username, password } = req.body;

    // Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      console.error("Invalid request body:", req.body);
      res.status(400).json({ error: "Invalid request format" });
      return;
    }

    if (!username || !password) {
      console.error("Missing credentials:", { username: !!username, password: !!password });
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const validUsername = process.env.ADMIN_USERNAME;
    const validPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!validUsername || !validPasswordHash) {
      console.error("Missing environment variables:", {
        hasUsername: !!validUsername,
        hasPasswordHash: !!validPasswordHash,
        usernameValue: validUsername || 'NOT SET',
        passwordHashPreview: validPasswordHash ? `${validPasswordHash.substring(0, 10)}...` : 'NOT SET'
      });
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    if (username !== validUsername) {
      console.log("Invalid username attempt:", { provided: username, expected: validUsername });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, validPasswordHash);
    if (!isValidPassword) {
      console.log("Invalid password attempt for user:", username);
      console.log("Password hash info:", {
        hashLength: validPasswordHash.length,
        hashPrefix: validPasswordHash.substring(0, 10),
        isBcryptFormat: validPasswordHash.startsWith('$2b$') || validPasswordHash.startsWith('$2a$')
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // ---- At this point, credentials are valid ----
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("Missing JWT_SECRET environment variable");
      res.status(500).json({ error: "Server misconfiguration: missing JWT_SECRET" });
      return;
    }

    // 👇 Fix 1: define a strongly typed SignOptions manually
    const signOptions: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN as unknown as number | undefined) ?? "24h",
    };

    // 👇 Fix 2: cast JWT_SECRET as Secret when calling jwt.sign
    const token = jwt.sign(
      { username, role: "admin" },
      JWT_SECRET as Secret,
      signOptions
    );

    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    console.log("Login successful for user:", username);
    res.status(200).json({
      success: true,
      message: "Login successful",
      expiresIn: signOptions.expiresIn,
    });
    return;
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed", details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined });
    return;
  }
});

/**
 * POST /api/auth/admin/logout
 */
router.post("/admin/logout", (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.clearCookie("adminToken");
  res.status(200).json({ success: true, message: "Logged out successfully" });
  return;
});

/**
 * GET /api/auth/admin/check
 */
router.get("/admin/auth/check", (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const token = req.cookies?.adminToken;
    if (!token) {
      res.status(401).json({ authenticated: false });
      return;
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("Missing JWT_SECRET environment variable in auth check");
      res.status(500).json({ error: "Server configuration error", authenticated: false });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      username: string;
      role: string;
      exp: number;
    };

    res.status(200).json({
      authenticated: true,
      user: { username: decoded.username, role: decoded.role },
      expiresAt: decoded.exp * 1000,
    });
    return;
  } catch (error) {
    console.log("Auth check failed:", error instanceof Error ? error.message : String(error));
    res.status(401).json({ authenticated: false });
    return;
  }
});

export default router;
