// apps/api/tests/unit/slugify.test.ts
import { describe, it, expect } from "vitest";
// Adjust import to your utils location
import { slugify } from "../../src/utils/strings.js";

describe("slugify", () => {
  it("creates URL-safe, lowercase slugs", () => {
    expect(slugify("Lightning Bolt!")).toBe("lightning-bolt");
  });
});
