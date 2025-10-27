// apps/api/tests/integration/inventory.routes.test.ts
import { beforeAll, afterAll, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { startPostgres, stopPostgres, bootstrapMinimalSchema, resetDb } from "../setup/testEnv.js";
import { seedCards, seedInventory } from "../setup/db.js";

let createApp: () => Express;
let app: Express;
let authToken: string;

beforeAll(async () => {
  await startPostgres();
  await bootstrapMinimalSchema();
  
  const appModule = await import("../../src/app.js");
  createApp = appModule.createApp;
  app = createApp();

  // Login to get auth token for admin routes
  const loginRes = await request(app)
    .post("/api/auth/admin/login")
    .send({
      username: process.env.ADMIN_USERNAME || "admin",
      password: process.env.ADMIN_PASSWORD || "test_password"
    });
  
  authToken = loginRes.headers["set-cookie"][0];
}, 60_000);

afterAll(async () => {
  await stopPostgres();
});

beforeEach(async () => {
  await resetDb();
  await seedCards();
});

describe("POST /api/admin/inventory", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/api/admin/inventory")
      .send({
        card_id: 1001,
        quality: "Near Mint",
        foil_type: "Regular",
        price: 5.99,
        stock_quantity: 10,
        language: "English"
      })
      .expect(401);

    expect(res.body).toHaveProperty("error");
  });

  it("creates new inventory with valid data", async () => {
    const res = await request(app)
      .post("/api/admin/inventory")
      .set("Cookie", authToken)
      .send({
        card_id: 1001,
        quality: "Near Mint",
        foil_type: "Regular",
        price: 5.99,
        stock_quantity: 10,
        language: "English"
      })
      .expect(200);

    expect(res.body).toHaveProperty("inventory");
    expect(res.body.inventory.card_id).toBe(1001);
    expect(res.body.inventory.quality).toBe("Near Mint");
    expect(res.body.inventory.stock_quantity).toBe(10);
  });

  it("updates existing inventory on conflict", async () => {
    // Create initial inventory
    await request(app)
      .post("/api/admin/inventory")
      .set("Cookie", authToken)
      .send({
        card_id: 1001,
        quality: "Near Mint",
        foil_type: "Regular",
        price: 5.99,
        stock_quantity: 10,
        language: "English"
      });

    // Update with same card/variation
    const res = await request(app)
      .post("/api/admin/inventory")
      .set("Cookie", authToken)
      .send({
        card_id: 1001,
        quality: "Near Mint",
        foil_type: "Regular",
        price: 7.99,
        stock_quantity: 20,
        language: "English"
      })
      .expect(200);

    expect(res.body.inventory.price).toBe(7.99);
    expect(res.body.inventory.stock_quantity).toBe(20);
  });

  it("rejects invalid card_id", async () => {
    const res = await request(app)
      .post("/api/admin/inventory")
      .set("Cookie", authToken)
      .send({
        card_id: "invalid",
        quality: "Near Mint",
        foil_type: "Regular",
        price: 5.99,
        stock_quantity: 10,
        language: "English"
      })
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });

  it("rejects negative stock quantity", async () => {
    const res = await request(app)
      .post("/api/admin/inventory")
      .set("Cookie", authToken)
      .send({
        card_id: 1001,
        quality: "Near Mint",
        foil_type: "Regular",
        price: 5.99,
        stock_quantity: -5,
        language: "English"
      })
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });

  it("rejects missing required fields", async () => {
    const res = await request(app)
      .post("/api/admin/inventory")
      .set("Cookie", authToken)
      .send({
        card_id: 1001,
        // Missing quality, foil_type, language
        price: 5.99,
        stock_quantity: 10
      })
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });
});

describe("GET /api/admin/inventory", () => {
  beforeEach(async () => {
    await seedInventory(1001, 10);
    await seedInventory(1001, 5); // Different variation
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .get("/api/admin/inventory")
      .expect(401);

    expect(res.body).toHaveProperty("error");
  });

  it("returns paginated inventory list", async () => {
    const res = await request(app)
      .get("/api/admin/inventory")
      .set("Cookie", authToken)
      .expect(200);

    expect(res.body).toHaveProperty("inventory");
    expect(Array.isArray(res.body.inventory)).toBe(true);
  });

  it("filters inventory by card_id", async () => {
    const res = await request(app)
      .get("/api/admin/inventory")
      .set("Cookie", authToken)
      .query({ card_id: 1001 })
      .expect(200);

    expect(res.body.inventory).toBeDefined();
    res.body.inventory.forEach((item: Record<string, unknown>) => {
      expect(item.card_id).toBe(1001);
    });
  });
});

describe("PATCH /api/admin/inventory/:id", () => {
  let inventoryId: number;

  beforeEach(async () => {
    inventoryId = await seedInventory(1001, 10);
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .patch(`/api/admin/inventory/${inventoryId}`)
      .send({ stock_quantity: 20 })
      .expect(401);

    expect(res.body).toHaveProperty("error");
  });

  it("updates inventory stock quantity", async () => {
    const res = await request(app)
      .patch(`/api/admin/inventory/${inventoryId}`)
      .set("Cookie", authToken)
      .send({ stock_quantity: 25 })
      .expect(200);

    expect(res.body.inventory.stock_quantity).toBe(25);
  });

  it("updates inventory price", async () => {
    const res = await request(app)
      .patch(`/api/admin/inventory/${inventoryId}`)
      .set("Cookie", authToken)
      .send({ price: 9.99 })
      .expect(200);

    expect(res.body.inventory.price).toBe(9.99);
  });

  it("returns 404 for non-existent inventory", async () => {
    const res = await request(app)
      .patch("/api/admin/inventory/999999")
      .set("Cookie", authToken)
      .send({ stock_quantity: 20 })
      .expect(404);

    expect(res.body).toHaveProperty("error");
  });
});

describe("DELETE /api/admin/inventory/:id", () => {
  let inventoryId: number;

  beforeEach(async () => {
    inventoryId = await seedInventory(1001, 10);
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .delete(`/api/admin/inventory/${inventoryId}`)
      .expect(401);

    expect(res.body).toHaveProperty("error");
  });

  it("deletes inventory item", async () => {
    const res = await request(app)
      .delete(`/api/admin/inventory/${inventoryId}`)
      .set("Cookie", authToken)
      .expect(200);

    expect(res.body).toHaveProperty("success");
    
    // Verify it's deleted
    const getRes = await request(app)
      .get(`/api/admin/inventory/${inventoryId}`)
      .set("Cookie", authToken)
      .expect(404);
  });

  it("returns 404 for non-existent inventory", async () => {
    const res = await request(app)
      .delete("/api/admin/inventory/999999")
      .set("Cookie", authToken)
      .expect(404);

    expect(res.body).toHaveProperty("error");
  });
});