import type { RequestHandler } from 'express';
// @ts-expect-error TS(7016): Could not find a declaration file for module 'json... Remove this comment to see the full error message
import jwt from 'jsonwebtoken';
import { env } from '../lib/env';


type Claims = { sub: string; role: 'admin' | 'user'; iat: number; exp: number };


export const requireAuth = (role: 'admin' | 'user' = 'user'): RequestHandler => (req, res, next) => {
try {
const hdr = req.header('authorization') ?? '';
const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
if (!token) return res.status(401).json({ error: { code: 'AUTH_MISSING', message: 'Missing token' } });
const claims = jwt.verify(token, env.JWT_SECRET, { clockTolerance: 5 }) as Claims;
if (role === 'admin' && claims.role !== 'admin') return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin only' } });
(req as any).user = claims;
next();
} catch (e) {
return res.status(401).json({ error: { code: 'AUTH_INVALID', message: 'Invalid token' } });
}
};