// apps/api/tests/integration/cards.search.test.ts
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { startPostgres, stopPostgres, bootstrapMinimalSchema } from "../setup/testEnv.js";
import { seedCards } from "../setup/db.js";

// Import createApp AFTER startPostgres sets DATABASE_URL
let createApp: any;
let app: any;

beforeAll(async () => {
  // CRITICAL: Start postgres and set DATABASE_URL BEFORE importing createApp
  await startPostgres();
  await bootstrapMinimalSchema();
  await seedCards();
  
  // Now import createApp (which will load db.ts with correct DATABASE_URL)
  const appModule = await import("../../src/app.js");
  createApp = appModule.createApp;
  app = createApp();
}, 60_000);

afterAll(async () => {
  await stopPostgres();
});

describe("GET /api/cards/cards", () => {
  it("returns at least one seeded card", async () => {
    // Route structure: app.use("/api", routes) -> router.use("/cards", cardsRoutes) -> router.get("/cards", ...)
    // Final path: /api/cards/cards
    const res = await request(app).get("/api/cards/cards").expect(200);
    
    // The response should have { cards: [...] } structure
    const cards = res.body?.cards || res.body?.data || res.body;
    
    expect(cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Lightning Bolt" }),
    ]));
  });
});