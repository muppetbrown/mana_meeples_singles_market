import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { Secret, SignOptions } from "jsonwebtoken";

const router = express.Router();

/**
 * POST /api/auth/admin/login
 * Authenticates admin and issues JWT cookie
 */
router.post("/admin/login", async (req: Request, res: Response) => {
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

    const isValidPassword = await bcrypt.compare(password, validPasswordHash);
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

    res.json({
      success: true,
      message: "Login successful",
      expiresIn: signOptions.expiresIn,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * POST /api/auth/admin/logout
 */
router.post("/admin/logout", (_req: Request, res: Response) => {
  res.clearCookie("adminToken");
  res.json({ success: true, message: "Logged out successfully" });
});

/**
 * GET /api/auth/admin/check
 */
router.get("/admin/auth/check", (req: Request, res: Response) => {
  try {
    const token = req.cookies?.adminToken;
    if (!token) {
      res.status(401).json({ authenticated: false });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      username: string;
      role: string;
      exp: number;
    };

    res.json({
      authenticated: true,
      user: { username: decoded.username, role: decoded.role },
      expiresAt: decoded.exp * 1000,
    });
  } catch {
    res.status(401).json({ authenticated: false });
  }
});

export default router;
