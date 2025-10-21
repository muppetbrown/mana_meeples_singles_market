// apps/api/tests/unit/auth.validateCredentials.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { validateCredentials } from "../../src/lib/authUtils.js";
import bcrypt from "bcrypt";

// Mock the environment for testing
beforeAll(() => {
  // Set test admin credentials
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync("testpassword123", 10);
});

describe("validateCredentials", () => {
  it("accepts valid admin credentials", async () => {
    // FIXED: validateCredentials is an async function that returns Promise<boolean>
    // It's NOT a Zod schema with .parse()
    const isValid = await validateCredentials("admin", "testpassword123");
    expect(isValid).toBe(true);
  });

  it("rejects incorrect password", async () => {
    const isValid = await validateCredentials("admin", "wrongpassword");
    expect(isValid).toBe(false);
  });

  it("rejects too-short password", async () => {
    // The function should reject short passwords
    const isValid = await validateCredentials("admin", "x");
    expect(isValid).toBe(false);
  });

  it("rejects wrong username", async () => {
    const isValid = await validateCredentials("notadmin", "testpassword123");
    expect(isValid).toBe(false);
  });
});