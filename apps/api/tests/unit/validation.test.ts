// apps/api/tests/unit/validation.test.ts
import { describe, it, expect } from "vitest";
import { z } from "zod";

// Import your validation schemas
// You may need to export these from your route files
const CardFiltersQuery = z.object({
  game: z.string().trim().optional(),
  game_id: z.coerce.number().int().optional(),
  set_id: z.coerce.number().int().optional(),
  search: z.string().trim().optional(),
});

const StorefrontQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(200).default(100),
  sort: z.enum(['name', 'number', 'rarity', 'created_at']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

describe("CardFiltersQuery validation", () => {
  it("accepts valid game filter", () => {
    const result = CardFiltersQuery.parse({ game: "mtg" });
    expect(result.game).toBe("mtg");
  });

  it("accepts valid game_id as string and coerces to number", () => {
    const result = CardFiltersQuery.parse({ game_id: "1" });
    expect(result.game_id).toBe(1);
  });

  it("trims whitespace from search terms", () => {
    const result = CardFiltersQuery.parse({ search: "  Lightning Bolt  " });
    expect(result.search).toBe("Lightning Bolt");
  });

  it("allows empty object (all filters optional)", () => {
    const result = CardFiltersQuery.parse({});
    expect(result).toEqual({});
  });

  it("rejects invalid game_id", () => {
    expect(() => CardFiltersQuery.parse({ game_id: "invalid" })).toThrow();
  });
});

describe("StorefrontQuery validation", () => {
  it("applies default values", () => {
    const result = StorefrontQuery.parse({});
    expect(result.page).toBe(1);
    expect(result.per_page).toBe(100);
    expect(result.sort).toBe('name');
    expect(result.order).toBe('asc');
  });

  it("enforces page minimum of 1", () => {
    expect(() => StorefrontQuery.parse({ page: 0 })).toThrow();
    expect(() => StorefrontQuery.parse({ page: -1 })).toThrow();
  });

  it("enforces per_page maximum of 200", () => {
    expect(() => StorefrontQuery.parse({ per_page: 201 })).toThrow();
  });

  it("validates sort enum values", () => {
    expect(() => StorefrontQuery.parse({ sort: 'invalid' })).toThrow();
    
    const validSorts = ['name', 'number', 'rarity', 'created_at'];
    validSorts.forEach(sort => {
      const result = StorefrontQuery.parse({ sort });
      expect(result.sort).toBe(sort);
    });
  });

  it("coerces string numbers to integers", () => {
    const result = StorefrontQuery.parse({ page: "5", per_page: "25" });
    expect(result.page).toBe(5);
    expect(result.per_page).toBe(25);
  });
});