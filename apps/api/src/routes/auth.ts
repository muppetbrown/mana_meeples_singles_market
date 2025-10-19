import express from "express";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Secret, SignOptions } from "jsonwebtoken";

const router = express.Router();

// Enhanced response debugging middleware
const debugResponse = (req: Request, res: Response, next: express.NextFunction) => {
  console.log(`\n=== ENHANCED RESPONSE DEBUG MIDDLEWARE FOR ${req.method} ${req.url} ===`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Request headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`Request body:`, JSON.stringify(req.body, null, 2));

  // Track response state changes
  const logResponseState = (phase: string) => {
    console.log(`--- Response state during ${phase} ---`);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Finished: ${res.finished}`);
    console.log(`Headers sent: ${res.headersSent}`);
    console.log(`Writable: ${res.writable}`);
    console.log(`Headers:`, JSON.stringify(res.getHeaders(), null, 2));
  };

  // Log initial state
  logResponseState("middleware setup");

  // Override res.status to track status changes
  const originalStatus = res.status.bind(res);
  res.status = function(code: number) {
    console.log(`🔍 STATUS: Setting status code to ${code}`);
    const result = originalStatus(code);
    logResponseState("after status()");
    return result;
  };

  // Override res.setHeader to track header changes
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function(name: string, value: string | string[] | number) {
    console.log(`🔍 HEADER: Setting ${name} = ${value}`);
    const result = originalSetHeader(name, value);
    logResponseState("after setHeader()");
    return result;
  };

  // Override res.json to add debugging
  const originalJson = res.json.bind(res);
  res.json = function(body?: any) {
    console.log(`🔍 JSON: res.json called with body:`, JSON.stringify(body, null, 2));
    logResponseState("before json()");

    try {
      const result = originalJson(body);
      console.log(`🔍 JSON: res.json execution completed`);
      logResponseState("after json()");

      // Add a small delay to check if response actually gets sent
      setTimeout(() => {
        console.log(`🔍 JSON: Response state 100ms after json():`, {
          finished: res.finished,
          headersSent: res.headersSent,
          statusCode: res.statusCode
        });
      }, 100);

      return result;
    } catch (error) {
      console.error(`🔍 JSON ERROR: Exception in res.json():`, error);
      logResponseState("error in json()");
      throw error;
    }
  };

  // Override res.send to add debugging
  const originalSend = res.send.bind(res);
  res.send = function(body?: any) {
    console.log(`🔍 SEND: res.send called with body:`, body);
    console.log(`🔍 SEND: Body type:`, typeof body);
    console.log(`🔍 SEND: Body length:`, body?.length || 'N/A');
    logResponseState("before send()");

    try {
      const result = originalSend(body);
      console.log(`🔍 SEND: res.send execution completed`);
      logResponseState("after send()");

      return result;
    } catch (error) {
      console.error(`🔍 SEND ERROR: Exception in res.send():`, error);
      logResponseState("error in send()");
      throw error;
    }
  };

  // Override res.end to catch any direct response endings
  const originalEnd = res.end.bind(res);
  res.end = function(...args: any[]) {
    console.log(`🔍 END: res.end called with ${arguments.length} args:`, Array.from(arguments));
    logResponseState("before end()");

    // Call original end with all arguments using apply to preserve exact argument handling
    const result = originalEnd.apply(res, args);

    console.log(`🔍 END: res.end execution completed`);
    logResponseState("after end()");

    return result;
  };

  // Listen for response finish event
  res.on('finish', () => {
    console.log(`🔍 EVENT: Response 'finish' event fired`);
    logResponseState("finish event");
  });

  // Listen for response close event
  res.on('close', () => {
    console.log(`🔍 EVENT: Response 'close' event fired`);
    logResponseState("close event");
  });

  console.log(`=== ENHANCED RESPONSE DEBUG MIDDLEWARE SETUP COMPLETE ===\n`);
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
  console.log("=== ADMIN LOGIN DEBUG START ===");
  console.log("Request headers:", JSON.stringify(req.headers, null, 2));
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  console.log("Request body type:", typeof req.body);
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  // Set JSON content type explicitly
  res.setHeader('Content-Type', 'application/json');
  console.log("Set Content-Type header to application/json");

  try {
    const { username, password } = req.body;
    console.log("Extracted credentials:", { username: !!username, hasPassword: !!password });

    // Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      console.error("Invalid request body:", req.body);
      return res.status(400).json({ error: "Invalid request format" });
    }

    if (!username || !password) {
      console.error("Missing credentials:", { username: !!username, password: !!password });
      return res.status(400).json({ error: "Username and password are required" });
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
      return res.status(500).json({ error: "Server configuration error" });
    }

    if (username !== validUsername) {
      console.log("Invalid username attempt:", { provided: username, expected: validUsername });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return res.status(401).json({ error: "Invalid credentials" });
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
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ---- At this point, credentials are valid ----
    console.log("Credentials validated, proceeding with JWT creation");

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("Missing JWT_SECRET environment variable");
      return res.status(500).json({ error: "Server misconfiguration: missing JWT_SECRET" });
    }
    console.log("JWT_SECRET found, length:", JWT_SECRET.length);

    // Create JWT token with proper type handling
    const token = jwt.sign(
      { username, role: "admin" },
      JWT_SECRET as Secret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
      } as SignOptions
    );
    console.log("JWT token created, length:", token.length);

    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });
    console.log("Cookie set with token");

    const responseData = {
      success: true,
      message: "Login successful",
      expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    };

    console.log("Preparing response data:", JSON.stringify(responseData, null, 2));
    console.log("Response headers before sending:", JSON.stringify(res.getHeaders(), null, 2));

    console.log("Login successful for user:", username);

    // Test JSON serialization before sending
    try {
      const jsonString = JSON.stringify(responseData);
      console.log("✅ JSON.stringify test successful. Serialized length:", jsonString.length);
      console.log("✅ Serialized JSON:", jsonString);
    } catch (serializationError) {
      console.error("❌ JSON.stringify test failed:", serializationError);
      return res.status(500).json({ error: "Response serialization failed" });
    }

    console.log("About to send JSON response...");
    console.log("Response object to send:", responseData);
    console.log("Response headers before status call:", JSON.stringify(res.getHeaders(), null, 2));

    const statusResponse = res.status(200);
    console.log("Status 200 set successfully");
    console.log("Response headers after status call:", JSON.stringify(statusResponse.getHeaders(), null, 2));

    const jsonResponse = statusResponse.json(responseData);
    console.log("res.json() call completed");

    console.log("JSON response object returned from res.json():", jsonResponse);
    console.log("Final response finished state:", res.finished);
    console.log("Final response headers sent state:", res.headersSent);
    console.log("Final response status:", res.statusCode);
    console.log("=== ADMIN LOGIN DEBUG END ===");

    return jsonResponse;
  } catch (error) {
    console.error("=== LOGIN ERROR CAUGHT ===");
    console.error("Error type:", typeof error);
    console.error("Error instanceof Error:", error instanceof Error);
    console.error("Full error object:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack available");
    console.error("Response headers at error:", JSON.stringify(res.getHeaders(), null, 2));
    console.error("Response finished at error:", res.finished);
    console.error("Response status code at error:", res.statusCode);

    const errorResponse = {
      error: "Login failed",
      details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined,
      timestamp: new Date().toISOString()
    };

    console.error("About to send error response:", JSON.stringify(errorResponse, null, 2));
    console.error("=== LOGIN ERROR DEBUG END ===");

    return res.status(500).json(errorResponse);
  }
});

/**
 * POST /api/auth/admin/logout
 */
router.post("/admin/logout", (_req: Request, res: Response) => {
  console.log("=== ADMIN LOGOUT DEBUG START ===");
  console.log("Logout request received");

  res.setHeader('Content-Type', 'application/json');
  console.log("Content-Type header set");

  res.clearCookie("adminToken");
  console.log("Admin token cookie cleared");

  const logoutResponse = { success: true, message: "Logged out successfully" };
  console.log("About to send logout response:", JSON.stringify(logoutResponse, null, 2));

  const response = res.status(200).json(logoutResponse);
  console.log("Logout response sent, status:", res.statusCode);
  console.log("=== ADMIN LOGOUT DEBUG END ===");

  return response;
});

/**
 * GET /api/auth/admin/check
 */
router.get("/admin/auth/check", (req: Request, res: Response) => {
  console.log("=== ADMIN AUTH CHECK DEBUG START ===");
  console.log("Auth check request received");
  console.log("Cookies:", JSON.stringify(req.cookies, null, 2));

  res.setHeader('Content-Type', 'application/json');
  console.log("Content-Type header set");

  try {
    const token = req.cookies?.adminToken;
    if (!token) {
      console.log("No admin token found in cookies");
      return res.status(401).json({ authenticated: false });
    }
    console.log("Admin token found, length:", token.length);

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("Missing JWT_SECRET environment variable in auth check");
      return res.status(500).json({ error: "Server configuration error", authenticated: false });
    }
    console.log("JWT_SECRET found for verification");

    const decoded = jwt.verify(token, JWT_SECRET) as {
      username: string;
      role: string;
      exp: number;
    };
    console.log("JWT token successfully decoded:", { username: decoded.username, role: decoded.role, exp: decoded.exp });

    const authResponse = {
      authenticated: true,
      user: { username: decoded.username, role: decoded.role },
      expiresAt: decoded.exp * 1000,
    };
    console.log("About to send auth check response:", JSON.stringify(authResponse, null, 2));

    const response = res.status(200).json(authResponse);
    console.log("Auth check response sent, status:", res.statusCode);
    console.log("=== ADMIN AUTH CHECK DEBUG END ===");

    return response;
  } catch (error) {
    console.error("=== AUTH CHECK ERROR ===");
    console.error("Auth check failed:", error instanceof Error ? error.message : String(error));
    console.error("Error type:", typeof error);
    console.error("Full error:", error);
    console.error("=== AUTH CHECK ERROR END ===");

    const errorResponse = { authenticated: false, error: "Token verification failed" };
    console.log("Sending auth error response:", JSON.stringify(errorResponse, null, 2));

    return res.status(401).json(errorResponse);
  }
});

export default router;
