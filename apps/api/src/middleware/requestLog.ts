import type { RequestHandler } from 'express';
import { logger } from '../lib/logger.js';


export const requestLog: RequestHandler = (req, _res, next) => {
const start = Date.now();
const id = Math.random().toString(36).slice(2);
(req as any).id = id;
logger.info({ id, method: req.method, path: req.path }, '→ request');
_res.on('finish', () => logger.info({ id, status: _res.statusCode, ms: Date.now() - start }, '← response'));
next();
};