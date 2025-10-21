// apps/api/tests/integration/auth.routes.test.ts
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

describe("POST /api/auth/admin/login", () => {
  it("rejects login with missing credentials", async () => {
    const res = await request(app)
      .post("/api/auth/admin/login")
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });

  it("rejects login with invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/admin/login")
      .send({
        username: "admin",
        password: "wrongpassword"
      })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it("accepts valid admin credentials and sets cookie", async () => {
    const res = await request(app)
      .post("/api/auth/admin/login")
      .send({
        username: process.env.ADMIN_USERNAME || "admin",
        password: process.env.ADMIN_PASSWORD || "your_test_password"
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toContain("adminToken");
  });
});

describe("POST /api/auth/admin/logout", () => {
  it("clears the admin token cookie", async () => {
    const res = await request(app)
      .post("/api/auth/admin/logout")
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toContain("adminToken=;");
  });
});

describe("GET /api/auth/admin/check", () => {
  it("returns 401 when no token provided", async () => {
    const res = await request(app)
      .get("/api/auth/admin/check")
      .expect(401);

    expect(res.body.authenticated).toBe(false);
  });

  it("returns authenticated status with valid token", async () => {
    // First login to get token
    const loginRes = await request(app)
      .post("/api/auth/admin/login")
      .send({
        username: process.env.ADMIN_USERNAME || "admin",
        password: process.env.ADMIN_PASSWORD || "your_test_password"
      });

    const cookies = loginRes.headers["set-cookie"];

    // Then check auth status
    const res = await request(app)
      .get("/api/auth/admin/check")
      .set("Cookie", cookies)
      .expect(200);

    expect(res.body.authenticated).toBe(true);
    expect(res.body.user).toHaveProperty("username");
  });
});