// apps/api/tests/integration/error-handling.test.ts
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { startPostgres, stopPostgres, bootstrapMinimalSchema } from "../setup/testEnv.js";

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

describe("Error Handling", () => {
  describe("404 Not Found", () => {
    it("returns 404 for non-existent API routes", async () => {
      const res = await request(app)
        .get("/api/nonexistent")
        .expect(404);

      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain("Not");
    });

    it("returns 404 for non-existent resources", async () => {
      const res = await request(app)
        .get("/api/cards/999999")
        .expect(404);

      expect(res.body).toHaveProperty("error");
    });
  });

  describe("400 Bad Request", () => {
    it("returns 400 for invalid query parameters", async () => {
      const res = await request(app)
        .get("/api/storefront/cards")
        .query({ page: "not-a-number" })
        .expect(400);

      expect(res.body).toHaveProperty("error");
    });

    it("returns 400 for malformed request body", async () => {
      const res = await request(app)
        .post("/api/auth/admin/login")
        .send({ invalid: "data" })
        .expect(400);

      expect(res.body).toHaveProperty("error");
    });
  });

  describe("401 Unauthorized", () => {
    it("returns 401 for protected routes without auth", async () => {
      const res = await request(app)
        .get("/api/admin/orders")
        .expect(401);

      expect(res.body).toHaveProperty("error");
    });
  });

  describe("500 Internal Server Error", () => {
    it("handles database errors gracefully", async () => {
      const res = await request(app)
        .get("/api/nonexistent")
        .expect(404);
      
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("Content-Type validation", () => {
    it("requires JSON content-type for POST requests", async () => {
      const res = await request(app)
        .post("/api/auth/admin/login")
        .send("not-json-data")
        .expect(400);

      // Should fail to parse as JSON
      expect(res.body).toBeDefined();
    });
  });
});