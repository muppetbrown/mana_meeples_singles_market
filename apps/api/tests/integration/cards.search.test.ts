import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { startPostgres, stopPostgres, bootstrapMinimalSchema } from "../setup/testEnv.js";
import { seedCards } from "../setup/db.js";
import { createApp } from "../../src/app.js";

let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  await startPostgres();
  await bootstrapMinimalSchema();
  await seedCards();
  app = createApp();
}, 60_000);

afterAll(async () => {
  await stopPostgres();
});

describe("GET /api/cards", () => {
  it("returns at least one seeded card", async () => {
    const res = await request(app).get("/api/cards").expect(200);
    // shape tolerance: look for the seeded card by name or sku
    const arr = Array.isArray(res.body?.data) ? res.body.data : res.body;
    expect(arr).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Lightning Bolt" }),
    ]));
  });
});
