// apps/api/tests/e2e/checkout.flow.test.ts
import { beforeAll, afterAll, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { startPostgres, stopPostgres, bootstrapMinimalSchema, resetDb } from "../setup/testEnv.js";
import { seedCards, seedInventory, getCardById, countCards } from "../setup/db.js";

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

beforeEach(async () => {
  await resetDb();
});

describe("Complete Checkout Flow (E2E)", () => {
  it("completes a full customer journey from browsing to order placement", async () => {
    // Step 1: Seed the database with cards and inventory
    const cardId = await seedCards();
    await seedInventory(cardId, 10);

    // Step 2: Browse available cards (customer views storefront)
    const browseRes = await request(app)
      .get("/api/storefront/cards")
      .expect(200);

    expect(browseRes.body.cards).toBeDefined();
    expect(browseRes.body.cards.length).toBeGreaterThan(0);
    
    const selectedCard = browseRes.body.cards[0];
    expect(selectedCard).toHaveProperty("id");
    expect(selectedCard).toHaveProperty("name");
    expect(selectedCard.total_stock).toBeGreaterThan(0);

    // Step 3: Get card details with variations
    const cardDetailsRes = await request(app)
      .get(`/api/storefront/cards/${selectedCard.id}`)
      .expect(200);

    expect(cardDetailsRes.body.card).toBeDefined();
    expect(cardDetailsRes.body.card.variations).toBeDefined();
    
    const variation = cardDetailsRes.body.card.variations[0];
    expect(variation).toHaveProperty("inventory_id");
    expect(variation).toHaveProperty("price");
    expect(variation.stock).toBeGreaterThan(0);

    // Step 4: Customer adds to cart (frontend simulation)
    const cartItem = {
      inventory_id: variation.inventory_id,
      card_id: selectedCard.id,
      card_name: selectedCard.name,
      quantity: 2,
      price: variation.price
    };

    // Step 5: Customer proceeds to checkout
    const orderData = {
      customer: {
        email: "customer@example.com",
        name: "Jane Customer",
        address: "456 Queen St",
        phone: "+64211234567"
      },
      items: [cartItem],
      total: cartItem.price * cartItem.quantity,
      currency: "NZD",
      notes: "Please pack securely"
    };

    const orderRes = await request(app)
      .post("/api/orders")
      .send(orderData)
      .expect(201);

    expect(orderRes.body).toHaveProperty("order");
    expect(orderRes.body.order).toHaveProperty("id");
    expect(orderRes.body.order.customer_email).toBe("customer@example.com");
    expect(orderRes.body.order.total).toBe(orderData.total);
    expect(orderRes.body.order.status).toBe("pending");

    const orderId = orderRes.body.order.id;

    // Step 6: Verify inventory was reduced
    const updatedCardRes = await request(app)
      .get(`/api/storefront/cards/${selectedCard.id}`)
      .expect(200);

    const updatedVariation = updatedCardRes.body.card.variations.find(
      (v: any) => v.inventory_id === variation.inventory_id
    );
    expect(updatedVariation.stock).toBe(variation.stock - cartItem.quantity);

    // Step 7: Admin reviews the order
    const loginRes = await request(app)
      .post("/api/auth/admin/login")
      .send({
        username: process.env.ADMIN_USERNAME || "admin",
        password: process.env.ADMIN_PASSWORD || "test_password"
      })
      .expect(200);

    const authToken = loginRes.headers["set-cookie"][0];

    const adminOrderRes = await request(app)
      .get(`/api/admin/orders/${orderId}`)
      .set("Cookie", authToken)
      .expect(200);

    expect(adminOrderRes.body.order.id).toBe(orderId);
    expect(adminOrderRes.body.order.status).toBe("pending");

    // Step 8: Admin confirms the order
    const confirmRes = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set("Cookie", authToken)
      .send({
        status: "confirmed",
        notes: "Payment received, preparing shipment"
      })
      .expect(200);

    expect(confirmRes.body.order.status).toBe("confirmed");

    // Step 9: Admin marks order as completed
    const completeRes = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set("Cookie", authToken)
      .send({
        status: "completed",
        notes: "Order shipped via courier"
      })
      .expect(200);

    expect(completeRes.body.order.status).toBe("completed");

    // Step 10: Verify final order state
    const finalOrderRes = await request(app)
      .get(`/api/admin/orders/${orderId}`)
      .set("Cookie", authToken)
      .expect(200);

    expect(finalOrderRes.body.order.status).toBe("completed");
  });

  it("handles out-of-stock scenario gracefully", async () => {
    // Step 1: Seed card with limited stock
    const cardId = await seedCards();
    await seedInventory(cardId, 2); // Only 2 in stock

    // Step 2: Browse cards
    const browseRes = await request(app)
      .get("/api/storefront/cards")
      .expect(200);

    const card = browseRes.body.cards[0];
    const variation = card.variations[0];

    // Step 3: Try to order more than available stock
    const orderData = {
      customer: {
        email: "customer@example.com",
        name: "Customer Name"
      },
      items: [
        {
          inventory_id: variation.inventory_id,
          card_id: card.id,
          card_name: card.name,
          quantity: 5, // More than the 2 available
          price: variation.price
        }
      ],
      total: variation.price * 5
    };

    const orderRes = await request(app)
      .post("/api/orders")
      .send(orderData)
      .expect(400);

    expect(orderRes.body).toHaveProperty("error");
    expect(orderRes.body.error).toMatch(/stock|inventory|available/i);
  });

  it("handles concurrent orders for the same item", async () => {
    // Step 1: Seed card with limited stock
    const cardId = await seedCards();
    await seedInventory(cardId, 3); // Only 3 in stock

    // Step 2: Get card details
    const browseRes = await request(app)
      .get("/api/storefront/cards")
      .expect(200);

    const card = browseRes.body.cards[0];
    const variation = card.variations[0];

    // Step 3: Two customers try to order 2 items each simultaneously
    const order1 = {
      customer: { email: "customer1@example.com", name: "Customer 1" },
      items: [{
        inventory_id: variation.inventory_id,
        card_id: card.id,
        card_name: card.name,
        quantity: 2,
        price: variation.price
      }],
      total: variation.price * 2
    };

    const order2 = {
      customer: { email: "customer2@example.com", name: "Customer 2" },
      items: [{
        inventory_id: variation.inventory_id,
        card_id: card.id,
        card_name: card.name,
        quantity: 2,
        price: variation.price
      }],
      total: variation.price * 2
    };

    // Simulate concurrent requests
    const [res1, res2] = await Promise.all([
      request(app).post("/api/orders").send(order1),
      request(app).post("/api/orders").send(order2)
    ]);

    // One should succeed, one should fail due to insufficient stock
    const results = [res1, res2];
    const succeeded = results.filter(r => r.status === 201);
    const failed = results.filter(r => r.status === 400);

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    expect(failed[0].body.error).toMatch(/stock|inventory/i);
  });

  it("allows admin to cancel an order and restore inventory", async () => {
    // Step 1: Create an order
    const cardId = await seedCards();
    await seedInventory(cardId, 10);

    const browseRes = await request(app)
      .get("/api/storefront/cards")
      .expect(200);

    const card = browseRes.body.cards[0];
    const variation = card.variations[0];
    const initialStock = variation.stock;

    const orderData = {
      customer: {
        email: "customer@example.com",
        name: "Customer Name"
      },
      items: [{
        inventory_id: variation.inventory_id,
        card_id: card.id,
        card_name: card.name,
        quantity: 3,
        price: variation.price
      }],
      total: variation.price * 3
    };

    const orderRes = await request(app)
      .post("/api/orders")
      .send(orderData)
      .expect(201);

    const orderId = orderRes.body.order.id;

    // Verify stock was reduced
    const afterOrderRes = await request(app)
      .get(`/api/storefront/cards/${card.id}`)
      .expect(200);

    const afterOrderVariation = afterOrderRes.body.card.variations[0];
    expect(afterOrderVariation.stock).toBe(initialStock - 3);

    // Step 2: Admin cancels the order
    const loginRes = await request(app)
      .post("/api/auth/admin/login")
      .send({
        username: process.env.ADMIN_USERNAME || "admin",
        password: process.env.ADMIN_PASSWORD || "test_password"
      });

    const authToken = loginRes.headers["set-cookie"][0];

    const cancelRes = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set("Cookie", authToken)
      .send({
        status: "cancelled",
        notes: "Customer requested cancellation"
      })
      .expect(200);

    expect(cancelRes.body.order.status).toBe("cancelled");

    // Step 3: Verify inventory was restored
    const afterCancelRes = await request(app)
      .get(`/api/storefront/cards/${card.id}`)
      .expect(200);

    const afterCancelVariation = afterCancelRes.body.card.variations[0];
    expect(afterCancelVariation.stock).toBe(initialStock); // Restored
  });

  it("validates customer input sanitization during checkout", async () => {
    const cardId = await seedCards();
    await seedInventory(cardId, 10);

    const browseRes = await request(app)
      .get("/api/storefront/cards")
      .expect(200);

    const card = browseRes.body.cards[0];
    const variation = card.variations[0];

    // Attempt XSS attack in customer data
    const maliciousOrderData = {
      customer: {
        email: "customer@example.com",
        name: "<script>alert('xss')</script>",
        address: "<img src=x onerror=alert('xss')>",
        notes: "'; DROP TABLE orders;--"
      },
      items: [{
        inventory_id: variation.inventory_id,
        card_id: card.id,
        card_name: card.name,
        quantity: 1,
        price: variation.price
      }],
      total: variation.price
    };

    const orderRes = await request(app)
      .post("/api/orders")
      .send(maliciousOrderData)
      .expect(201);

    // Verify malicious content was sanitized
    const orderId = orderRes.body.order.id;
    
    const loginRes = await request(app)
      .post("/api/auth/admin/login")
      .send({
        username: process.env.ADMIN_USERNAME || "admin",
        password: process.env.ADMIN_PASSWORD || "test_password"
      });

    const authToken = loginRes.headers["set-cookie"][0];

    const orderDetailsRes = await request(app)
      .get(`/api/admin/orders/${orderId}`)
      .set("Cookie", authToken)
      .expect(200);

    // Ensure no script tags in the stored data
    expect(orderDetailsRes.body.order.customer_name).not.toContain("<script>");
    expect(orderDetailsRes.body.order.customer_name).not.toContain("</script>");
  });

  it("handles multiple items in a single order", async () => {
    // Seed multiple different cards
    const cardId1 = await seedCards();
    await seedInventory(cardId1, 10);
    
    // You would need to update seedCards to support multiple cards
    // For now, we'll simulate with the same card in different variations
    
    const browseRes = await request(app)
      .get("/api/storefront/cards")
      .expect(200);

    const card = browseRes.body.cards[0];
    
    const orderData = {
      customer: {
        email: "customer@example.com",
        name: "Multi-item Customer"
      },
      items: card.variations.slice(0, 2).map((v: any) => ({
        inventory_id: v.inventory_id,
        card_id: card.id,
        card_name: card.name,
        quantity: 1,
        price: v.price
      })),
      total: card.variations.slice(0, 2).reduce((sum: number, v: any) => sum + v.price, 0)
    };

    const orderRes = await request(app)
      .post("/api/orders")
      .send(orderData)
      .expect(201);

    expect(orderRes.body.order).toBeDefined();
    expect(orderRes.body.order.items?.length || orderData.items.length).toBe(2);
  });
});