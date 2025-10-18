"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
// src/db.ts
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30_000,
});
async function query(text, params = []) {
    const res = await pool.query(text, params);
    return res.rows;
}
