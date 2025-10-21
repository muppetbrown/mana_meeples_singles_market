// apps/api/tests/integration/card.search.test.ts
import { describe, it, beforeEach, expect } from "vitest";
import request from "supertest";
import { resetDb } from "../setup/testEnv.js";
import { seedCards } from "../setup/db.js";

// ✅ import the named export (ESM + NodeNext needs the .js extension)
import { createApp } from "../../src/app.js";

const app = createApp();

describe("GET /api/cards", () => {
  beforeEach(async () => {
    await resetDb();
    await seedCards();
  });

  it("returns cards matching a search query", async () => {
    const res = await request(app).get("/api/cards").query({ q: "lightning" }).expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
  });
});
