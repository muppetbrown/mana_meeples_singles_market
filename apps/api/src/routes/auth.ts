import { Router } from 'express';
// @ts-expect-error TS(7016): Could not find a declaration file for module 'bcry... Remove this comment to see the full error message
import bcrypt from 'bcrypt';
// @ts-expect-error TS(7016): Could not find a declaration file for module 'json... Remove this comment to see the full error message
import jwt from 'jsonwebtoken';
// @ts-expect-error TS(2307): Cannot find module 'zod' or its corresponding type... Remove this comment to see the full error message
import { z } from 'zod';
import { env } from '../lib/env';
import { withConn } from '../lib/db';


// @ts-expect-error TS(2742): The inferred type of 'auth' cannot be named withou... Remove this comment to see the full error message
export const auth = Router();


const LoginSchema = z.object({ username: z.string().min(3).max(64), password: z.string().min(8).max(128) });


auth.post('/login', async (req, res) => {
const parsed = LoginSchema.safeParse(req.body);
if (!parsed.success) return res.status(400).json({ error: { code: 'BAD_BODY', message: parsed.error.issues[0].message } });
const { username, password } = parsed.data;
const row = await withConn(async (c) => {
const { rows } = await c.query(`SELECT id, username, password_hash, role FROM users WHERE username = $1`, [username]);
return rows[0];
});
if (!row) return res.status(401).json({ error: { code: 'AUTH', message: 'Invalid credentials' } });
const ok = await bcrypt.compare(password, row.password_hash);
if (!ok) return res.status(401).json({ error: { code: 'AUTH', message: 'Invalid credentials' } });
const token = jwt.sign({ sub: String(row.id), role: row.role ?? 'admin' }, env.JWT_SECRET, { expiresIn: '1h' });
res.json({ token });
});