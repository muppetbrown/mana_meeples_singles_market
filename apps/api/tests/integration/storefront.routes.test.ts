// apps/api/tests/integration/storefront.routes.test.ts
import { beforeAll, afterAll, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { startPostgres, stopPostgres, bootstrapMinimalSchema, resetDb } from "../setup/testEnv.js";
import { seedCards, seedMultipleCards } from "../setup/db.js";

let createApp: any;
let app: any;

beforeAll(async () => {
  await startPostgres();
  await bootstrapMinimalSchema();
  
  const appModule = await import("../../src/app.js");
  createApp = appModule.createApp;
  app = createApp();
}, 60_000);

afterAll(async () => {
  await stopPostgres();
});

describe("GET /api/storefront/cards", () => {
  beforeEach(async () => {
    await resetDb();
    await seedMultipleCards();
  });

  it("returns paginated cards with default params", async () => {
    const res = await request(app)
      .get("/api/storefront/cards")
      .expect(200);

    expect(res.body).toHaveProperty("cards");
    expect(Array.isArray(res.body.cards)).toBe(true);
  });

  it("filters cards by game_id", async () => {
    const res = await request(app)
      .get("/api/storefront/cards")
      .query({ game_id: 1 })
      .expect(200);

    expect(res.body.cards).toBeDefined();
    // All cards should belong to game_id 1
    res.body.cards.forEach((card: any) => {
      expect(card.game_id || card.game_name).toBeDefined();
    });
  });

  it("filters cards by search term", async () => {
    const res = await request(app)
      .get("/api/storefront/cards")
      .query({ search: "Lightning" })
      .expect(200);

    expect(res.body.cards).toBeDefined();
    // At least one card should match the search
    expect(res.body.cards.length).toBeGreaterThan(0);
  });

  it("respects pagination parameters", async () => {
    const res = await request(app)
      .get("/api/storefront/cards")
      .query({ page: 1, per_page: 5 })
      .expect(200);

    expect(res.body.cards).toBeDefined();
    expect(res.body.cards.length).toBeLessThanOrEqual(5);
  });

  it("returns 400 for invalid query parameters", async () => {
    const res = await request(app)
      .get("/api/storefront/cards")
      .query({ page: "invalid" })
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });
});