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
export const validateCredentials = async (
  username: string,
  password: string
): Promise<boolean> => {
  // Check username
  if (username !== env.ADMIN_USERNAME) {
    return false;
  }

  // Check password
  return await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
};

/**
 * Get standardized cookie configuration for authentication
 */
export const getAuthCookieConfig = (): CookieOptions => {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" && env.CROSS_ORIGIN
      ? "none"
      : "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: env.NODE_ENV === "production" ? env.COOKIE_DOMAIN : undefined,
  };
};

/**
 * Get cookie configuration for CSRF tokens
 */
export const getCSRFCookieConfig = (httpOnly: boolean = true): CookieOptions => {
  return {
    httpOnly,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" && env.CROSS_ORIGIN
      ? "none"
      : "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: env.NODE_ENV === "production" ? env.COOKIE_DOMAIN : undefined,
  };
};

/**
 * Add timing attack protection by introducing a delay
 */
export const addSecurityDelay = (): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, 1000));
};