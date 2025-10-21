import { describe, it, expect } from "vitest";
import { validateCredentials } from "../../src/lib/authUtils.js";

describe("validateCredentials", () => {
  it("accepts a plausible email+password", () => {
    const r = validateCredentials.parse({ email: "a@b.com", password: "hunter2" });
    expect(r.email).toBe("a@b.com");
  });

  it("rejects a too-short password", () => {
    expect(() =>
      validateCredentials.parse({ email: "a@b.com", password: "x" })
    ).toThrow();
  });
});
