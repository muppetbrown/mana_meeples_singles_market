// apps/api/src/lib/authUtils.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import type { Secret, SignOptions } from "jsonwebtoken";
import type { CookieOptions } from "express";
import { env } from "./env.js";

// Types for JWT payload
export interface JWTPayload {
  username: string;
  role: string;
  exp?: number;
  iat?: number;
}

export interface DecodedJWT {
  username: string;
  role: string;
  exp: number;
  iat: number;
}

/**
 * Create a JWT token for authentication
 */
export const createJWT = (payload: Omit<JWTPayload, 'exp' | 'iat'>): string => {
  return jwt.sign(
    payload,
    env.JWT_SECRET as Secret,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    } as SignOptions
  );
};

/**
 * Verify and decode JWT token
 */
export const verifyJWT = (token: string): DecodedJWT => {
  return jwt.verify(token, env.JWT_SECRET) as DecodedJWT;
};

/**
 * Check if JWT token needs refresh (expires within 15 minutes)
 */
export const shouldRefreshToken = (decoded: DecodedJWT): boolean => {
  const now = Math.floor(Date.now() / 1000);
  const timeToExpiry = decoded.exp - now;
  return timeToExpiry < 900; // 15 minutes
};

/**
 * Validate admin credentials using bcrypt
 * FIXED: Added comprehensive error handling to prevent server crashes
 */
export async function validateCredentials(
  username: string,
  password: string
): Promise<boolean> {
  try {
    // Validate inputs
    if (!username || !password) {
      console.error("❌ validateCredentials: Missing username or password");
      return false;
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      console.error("❌ validateCredentials: Invalid input types");
      return false;
    }

    const adminUsername = env.ADMIN_USERNAME;
    const adminPasswordHash = env.ADMIN_PASSWORD_HASH;
    
    // Validate environment variables are set
    if (!adminUsername || !adminPasswordHash) {
      console.error("❌ validateCredentials: Missing ADMIN_USERNAME or ADMIN_PASSWORD_HASH in environment");
      return false;
    }

    // Check username first (fast fail)
    if (username !== adminUsername) {
      console.log(`❌ validateCredentials: Username mismatch (expected: ${adminUsername}, got: ${username})`);
      return false;
    }

    // Validate hash format
    if (!adminPasswordHash.startsWith("$2a$") && !adminPasswordHash.startsWith("$2b$")) {
      console.error("❌ validateCredentials: ADMIN_PASSWORD_HASH is not a valid bcrypt hash");
      console.error(`   Hash starts with: ${adminPasswordHash.substring(0, 10)}`);
      return false;
    }

    // Compare password with hash
    console.log("🔍 validateCredentials: Comparing password with hash...");
    const isMatch = await bcrypt.compare(password, adminPasswordHash);
    
    if (isMatch) {
      console.log("✅ validateCredentials: Password matches!");
    } else {
      console.log("❌ validateCredentials: Password does not match");
    }

    return isMatch;

  } catch (error) {
    // Critical: Catch ALL errors to prevent server crash
    console.error("❌ validateCredentials: Unexpected error:", error);
    console.error("   Error name:", error instanceof Error ? error.name : 'Unknown');
    console.error("   Error message:", error instanceof Error ? error.message : String(error));
    console.error("   Error stack:", error instanceof Error ? error.stack : 'No stack');
    
    // Return false instead of throwing - don't crash the server!
    return false;
  }
}

/**
 * Get standardized cookie configuration for authentication
 * 
 * Behavior based on environment variables:
 * - If COOKIE_DOMAIN is set: Use it (for same parent domain: .manaandmeeples.co.nz)
 * - If COOKIE_DOMAIN is not set: Use undefined (for cross-origin: different domains)
 * - If CROSS_ORIGIN=true: Use SameSite=none (required for cross-origin)
 * - If CROSS_ORIGIN=false: Use SameSite=lax (more secure for same parent domain)
 */
export const getAuthCookieConfig = (): CookieOptions => {
  const isProduction = env.NODE_ENV === "production";
  const isCrossOrigin = env.CROSS_ORIGIN;
  
  // Only set domain if explicitly configured AND not cross-origin
  // When domains share parent (shop.X.com + api.X.com), set domain to .X.com
  // When domains are different (X.onrender.com + Y.com), domain must be undefined
  const cookieDomain = env.COOKIE_DOMAIN && !isCrossOrigin 
    ? env.COOKIE_DOMAIN 
    : undefined;

  return {
    httpOnly: true,
    secure: isProduction,
    // Cross-origin requires SameSite=none, same parent domain can use lax
    sameSite: isProduction && isCrossOrigin ? "none" : isProduction ? "lax" : "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: "/",
    domain: cookieDomain,
  };
};

/**
 * Get cookie configuration for CSRF tokens
 */
export const getCSRFCookieConfig = (httpOnly: boolean = true): CookieOptions => {
  const isProduction = env.NODE_ENV === "production";
  const isCrossOrigin = env.CROSS_ORIGIN;
  
  const cookieDomain = env.COOKIE_DOMAIN && !isCrossOrigin 
    ? env.COOKIE_DOMAIN 
    : undefined;

  return {
    httpOnly,
    secure: isProduction,
    sameSite: isProduction && isCrossOrigin ? "none" : isProduction ? "lax" : "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: "/",
    domain: cookieDomain,
  };
};

/**
 * Add timing attack protection by introducing a delay
 */
export const addSecurityDelay = (): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, 1000));
};