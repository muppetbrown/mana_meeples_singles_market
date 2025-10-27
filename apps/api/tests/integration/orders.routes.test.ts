// apps/api/tests/integration/orders.routes.test.ts
import { beforeAll, afterAll, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { startPostgres, stopPostgres, bootstrapMinimalSchema, resetDb } from "../setup/testEnv.js";
import { seedCards, seedInventory, createTestOrder } from "../setup/db.js";

let createApp: () => Express;
let app: Express;
let authToken: string;

beforeAll(async () => {
  await startPostgres();
  await bootstrapMinimalSchema();
  
  const appModule = await import("../../src/app.js");
  createApp = appModule.createApp;
  app = createApp();

  // Login for admin routes
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

describe("POST /api/orders", () => {
  beforeEach(async () => {
    await seedInventory(1001, 10);
  });

  it("creates a new order with valid data", async () => {
    const orderData = {
      customer: {
        email: "customer@example.com",
        name: "John Doe",
        address: "123 Main St",
        phone: "+1234567890"
      },
      items: [
        {
          inventory_id: 1,
          card_id: 1001,
          card_name: "Lightning Bolt",
          quantity: 2,
          price: 5.99
        }
      ],
      total: 11.98,
      currency: "NZD",
      notes: "Please ship carefully"
    };

    const res = await request(app)
      .post("/api/orders")
      .send(orderData)
      .expect(201);

    expect(res.body).toHaveProperty("order");
    expect(res.body.order).toHaveProperty("id");
    expect(res.body.order.customer_email).toBe("customer@example.com");
    expect(res.body.order.total).toBe(11.98);
  });

  it("validates required customer fields", async () => {
    const invalidOrder = {
      customer: {
        // Missing email
        name: "John Doe"
      },
      items: [
        {
          inventory_id: 1,
          card_id: 1001,
          card_name: "Lightning Bolt",
          quantity: 1,
          price: 5.99
        }
      ],
      total: 5.99
    };

    const res = await request(app)
      .post("/api/orders")
      .send(invalidOrder)
      .expect(400);

    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toContain("email");
  });

  it("validates items array is not empty", async () => {
    const invalidOrder = {
      customer: {
        email: "customer@example.com",
        name: "John Doe"
      },
      items: [], // Empty items
      total: 0
    };

    const res = await request(app)
      .post("/api/orders")
      .send(invalidOrder)
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });

  it("validates item quantity limits", async () => {
    const invalidOrder = {
      customer: {
        email: "customer@example.com",
        name: "John Doe"
      },
      items: [
        {
          inventory_id: 1,
          card_id: 1001,
          card_name: "Lightning Bolt",
          quantity: 100, // Exceeds max of 10
          price: 5.99
        }
      ],
      total: 599.00
    };

    const res = await request(app)
      .post("/api/orders")
      .send(invalidOrder)
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });

  it("validates email format", async () => {
    const invalidOrder = {
      customer: {
        email: "invalid-email", // Invalid format
        name: "John Doe"
      },
      items: [
        {
          inventory_id: 1,
          card_id: 1001,
          card_name: "Lightning Bolt",
          quantity: 1,
          price: 5.99
        }
      ],
      total: 5.99
    };

    const res = await request(app)
      .post("/api/orders")
      .send(invalidOrder)
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });

  it("handles transaction rollback on inventory update failure", async () => {
    const orderData = {
      customer: {
        email: "customer@example.com",
        name: "John Doe"
      },
      items: [
        {
          inventory_id: 999999, // Non-existent inventory
          card_id: 1001,
          card_name: "Lightning Bolt",
          quantity: 1,
          price: 5.99
        }
      ],
      total: 5.99
    };

    const res = await request(app)
      .post("/api/orders")
      .send(orderData)
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });
});

describe("GET /api/admin/orders", () => {
  beforeEach(async () => {
    await createTestOrder();
    await createTestOrder();
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .get("/api/admin/orders")
      .expect(401);

    expect(res.body).toHaveProperty("error");
  });

  it("returns paginated orders list", async () => {
    const res = await request(app)
      .get("/api/admin/orders")
      .set("Cookie", authToken)
      .expect(200);

    expect(res.body).toHaveProperty("orders");
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.orders.length).toBeGreaterThan(0);
  });

  it("filters orders by status", async () => {
    const res = await request(app)
      .get("/api/admin/orders")
      .set("Cookie", authToken)
      .query({ status: "pending" })
      .expect(200);

    expect(res.body.orders).toBeDefined();
    res.body.orders.forEach((order: Record<string, unknown>) => {
      expect(order.status).toBe("pending");
    });
  });

  it("supports pagination", async () => {
    const res = await request(app)
      .get("/api/admin/orders")
      .set("Cookie", authToken)
      .query({ limit: 1, offset: 0 })
      .expect(200);

    expect(res.body.orders.length).toBeLessThanOrEqual(1);
  });

  it("searches orders by customer email", async () => {
    const res = await request(app)
      .get("/api/admin/orders")
      .set("Cookie", authToken)
      .query({ search: "test@example.com" })
      .expect(200);

    expect(res.body.orders).toBeDefined();
  });
});

describe("GET /api/admin/orders/:id", () => {
  let orderId: number;

  beforeEach(async () => {
    orderId = await createTestOrder();
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .get(`/api/admin/orders/${orderId}`)
      .expect(401);

    expect(res.body).toHaveProperty("error");
  });

  it("returns order details", async () => {
    const res = await request(app)
      .get(`/api/admin/orders/${orderId}`)
      .set("Cookie", authToken)
      .expect(200);

    expect(res.body).toHaveProperty("order");
    expect(res.body.order.id).toBe(orderId);
    expect(res.body.order).toHaveProperty("customer_email");
  });

  it("returns 404 for non-existent order", async () => {
    const res = await request(app)
      .get("/api/admin/orders/999999")
      .set("Cookie", authToken)
      .expect(404);

    expect(res.body).toHaveProperty("error");
  });
});

describe("PATCH /api/admin/orders/:id/status", () => {
  let orderId: number;

  beforeEach(async () => {
    orderId = await createTestOrder();
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .send({ status: "confirmed" })
      .expect(401);

    expect(res.body).toHaveProperty("error");
  });

  it("updates order status", async () => {
    const res = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set("Cookie", authToken)
      .send({ status: "confirmed" })
      .expect(200);

    expect(res.body.order.status).toBe("confirmed");
  });

  it("validates status enum values", async () => {
    const res = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set("Cookie", authToken)
      .send({ status: "invalid_status" })
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });

  it("allows adding notes when updating status", async () => {
    const res = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set("Cookie", authToken)
      .send({ 
        status: "completed",
        notes: "Order shipped successfully"
      })
      .expect(200);

    expect(res.body.order.status).toBe("completed");
  });

  it("returns 404 for non-existent order", async () => {
    const res = await request(app)
      .patch("/api/admin/orders/999999/status")
      .set("Cookie", authToken)
      .send({ status: "confirmed" })
      .expect(404);

    expect(res.body).toHaveProperty("error");
  });
});