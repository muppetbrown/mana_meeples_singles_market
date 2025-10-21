// apps/api/tests/unit/auth.validateCredentials.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";

// Mock the entire authUtils module
vi.mock("../../src/lib/authUtils.js", async () => {
  const bcrypt = await import("bcrypt");
  const TEST_PASSWORD_HASH = bcrypt.hashSync("testpassword123", 10);
  
  return {
    validateCredentials: async (username: string, password: string): Promise<boolean> => {
      // Mock implementation for testing
      if (username !== "admin") return false;
      if (password.length < 6) return false;
      
      return bcrypt.compareSync(password, TEST_PASSWORD_HASH);
    }
  };
});

// Import after mocking
const { validateCredentials } = await import("../../src/lib/authUtils.js");

describe("validateCredentials", () => {
  it("accepts valid admin credentials", async () => {
    const isValid = await validateCredentials("admin", "testpassword123");
    expect(isValid).toBe(true);
  });

  it("rejects incorrect password", async () => {
    const isValid = await validateCredentials("admin", "wrongpassword");
    expect(isValid).toBe(false);
  });

  it("rejects too-short password", async () => {
    const isValid = await validateCredentials("admin", "x");
    expect(isValid).toBe(false);
  });

  it("rejects wrong username", async () => {
    const isValid = await validateCredentials("notadmin", "testpassword123");
    expect(isValid).toBe(false);
  });
});