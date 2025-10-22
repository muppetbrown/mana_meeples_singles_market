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
 */
export async function validateCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const adminUsername = env.ADMIN_USERNAME;
  const adminPassword = env.ADMIN_PASSWORD || env.ADMIN_PASSWORD_HASH;
  
  if (username !== adminUsername) {
    return false;
  }
  // Check if password is already hashed (starts with $2a$ or $2b$)
  if (adminPassword.startsWith("$2")) {
    return await bcrypt.compare(password, adminPassword);
  }
  // Plain text comparison (dev/test only!)
  return password === adminPassword;
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