// @ts-expect-error TS(7016): Could not find a declaration file for module 'pg'.... Remove this comment to see the full error message
import { Pool } from "pg";
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export async function query<T = unknown>(text: string, params: unknown[] = []) {
const res = await pool.query<T>(text, params);
return res.rows;
}