import { describe, it, expect } from "vitest";
// Adjust import to your utils location
import { slugify } from "../../src/utils/strings";

describe("slugify", () => {
  it("creates URL-safe, lowercase slugs", () => {
    expect(slugify("Lightning Bolt!")).toBe("lightning-bolt");
  });
});
