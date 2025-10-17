// @ts-expect-error TS(7016): Could not find a declaration file for module 'pg'.... Remove this comment to see the full error message
import { Pool } from 'pg';
import { env } from './env';


export const pool = new Pool({ connectionString: env.DATABASE_URL, max: 20, idleTimeoutMillis: 30_000 });


// @ts-expect-error TS(7016): Could not find a declaration file for module 'pg'.... Remove this comment to see the full error message
export async function withConn<T>(fn: (client: import('pg').PoolClient) => Promise<T>) {
const client = await pool.connect();
try { return await fn(client); } finally { client.release(); }
}


export async function healthcheck() {
const { rows } = await pool.query('select 1 as ok');
return rows[0]?.ok === 1;
}