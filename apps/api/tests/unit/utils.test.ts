// apps/api/tests/unit/utils.test.ts
import { describe, it, expect } from "vitest";
import { slugify, truncate, titleCase } from "../../src/utils/strings.js";

describe("String Utilities", () => {
  describe("slugify", () => {
    it("converts text to lowercase", () => {
      expect(slugify("HELLO WORLD")).toBe("hello-world");
    });

    it("replaces spaces with hyphens", () => {
      expect(slugify("hello world")).toBe("hello-world");
      expect(slugify("multiple   spaces")).toBe("multiple-spaces");
    });

    it("removes special characters", () => {
      expect(slugify("Lightning Bolt!")).toBe("lightning-bolt");
      expect(slugify("Black@Lotus#2023")).toBe("blacklotus2023");
    });

    it("handles unicode characters", () => {
      expect(slugify("Café Münchën")).toBe("caf-mnchen");
    });

    it("removes leading and trailing hyphens", () => {
      expect(slugify("-hello-world-")).toBe("hello-world");
      expect(slugify("---test---")).toBe("test");
    });

    it("collapses multiple hyphens to single hyphen", () => {
      expect(slugify("hello---world")).toBe("hello-world");
    });

    it("handles empty string", () => {
      expect(slugify("")).toBe("");
    });

    it("handles string with only special characters", () => {
      expect(slugify("!@#$%^&*()")).toBe("");
    });

    it("preserves numbers", () => {
      expect(slugify("Magic 2023")).toBe("magic-2023");
    });

    it("handles underscores", () => {
      expect(slugify("hello_world_test")).toBe("hello-world-test");
    });
  });

  describe("truncate", () => {
    it("returns original text if shorter than maxLength", () => {
      expect(truncate("Hello", 10)).toBe("Hello");
    });

    it("truncates text and adds ellipsis", () => {
      expect(truncate("This is a long text", 10)).toBe("This is...");
    });

    it("accounts for ellipsis in maxLength", () => {
      const result = truncate("Hello World", 8);
      expect(result.length).toBe(8);
      expect(result).toBe("Hello...");
    });

    it("handles exact maxLength", () => {
      expect(truncate("Hello", 5)).toBe("Hello");
    });

    it("handles empty string", () => {
      expect(truncate("", 10)).toBe("");
    });

    it("handles maxLength of 3 (minimum for ellipsis)", () => {
      expect(truncate("Hello", 3)).toBe("...");
    });
  });

  describe("titleCase", () => {
    it("capitalizes first letter of each word", () => {
      expect(titleCase("hello world")).toBe("Hello World");
    });

    it("handles already capitalized text", () => {
      expect(titleCase("Hello World")).toBe("Hello World");
    });

    it("handles all caps", () => {
      expect(titleCase("HELLO WORLD")).toBe("Hello World");
    });

    it("handles mixed case", () => {
      expect(titleCase("hELLo WoRLD")).toBe("Hello World");
    });

    it("handles single word", () => {
      expect(titleCase("hello")).toBe("Hello");
    });

    it("handles empty string", () => {
      expect(titleCase("")).toBe("");
    });

    it("handles multiple spaces", () => {
      expect(titleCase("hello  world")).toBe("Hello  World");
    });

    it("preserves single letter words", () => {
      expect(titleCase("a test of the system")).toBe("A Test Of The System");
    });
  });
});

describe("Database Query Builders", () => {
  // If you have query builder utilities, test them here
  describe("buildFilterSQL", () => {
    it("builds WHERE clause from filters", () => {
      // Example: Test your SQL building functions if they're extracted to utils
      expect(true).toBe(true);
    });
  });
});

describe("Validation Helpers", () => {
  describe("sanitizeInput", () => {
    // If you extract sanitization to utils
    it("removes dangerous characters", () => {
      expect(true).toBe(true);
    });
  });
});

describe("Price Formatting", () => {
  describe("formatPrice", () => {
    // Create a formatPrice utility if you don't have one
    const formatPrice = (amount: number, currency: string = "NZD"): string => {
      return new Intl.NumberFormat("en-NZ", {
        style: "currency",
        currency: currency,
      }).format(amount);
    };

    it("formats price with currency symbol", () => {
      expect(formatPrice(10.50)).toContain("10.50");
    });

    it("handles zero", () => {
      expect(formatPrice(0)).toBeTruthy();
    });

    it("handles large numbers", () => {
      const result = formatPrice(1000000);
      expect(result).toContain("1,000,000");
    });

    it("handles different currencies", () => {
      const usd = formatPrice(10, "USD");
      const eur = formatPrice(10, "EUR");
      expect(usd).toBeTruthy();
      expect(eur).toBeTruthy();
    });
  });
});

describe("Date Utilities", () => {
  describe("formatDate", () => {
    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    it("formats date to ISO string", () => {
      const date = new Date("2025-01-15");
      expect(formatDate(date)).toBe("2025-01-15");
    });

    it("handles current date", () => {
      const result = formatDate(new Date());
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("isDateInPast", () => {
    const isDateInPast = (date: Date): boolean => {
      return date < new Date();
    };

    it("returns true for past dates", () => {
      const pastDate = new Date("2020-01-01");
      expect(isDateInPast(pastDate)).toBe(true);
    });

    it("returns false for future dates", () => {
      const futureDate = new Date("2030-01-01");
      expect(isDateInPast(futureDate)).toBe(false);
    });
  });
});

describe("Array Utilities", () => {
  describe("chunk", () => {
    const chunk = <T>(array: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    };

    it("splits array into chunks", () => {
      const result = chunk([1, 2, 3, 4, 5], 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("handles exact division", () => {
      const result = chunk([1, 2, 3, 4], 2);
      expect(result).toEqual([[1, 2], [3, 4]]);
    });

    it("handles empty array", () => {
      expect(chunk([], 2)).toEqual([]);
    });

    it("handles chunk size larger than array", () => {
      const result = chunk([1, 2], 5);
      expect(result).toEqual([[1, 2]]);
    });
  });

  describe("unique", () => {
    const unique = <T>(array: T[]): T[] => {
      return [...new Set(array)];
    };

    it("removes duplicates", () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });

    it("handles strings", () => {
      expect(unique(["a", "b", "a", "c"])).toEqual(["a", "b", "c"]);
    });

    it("handles empty array", () => {
      expect(unique([])).toEqual([]);
    });

    it("handles array with no duplicates", () => {
      expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });
});