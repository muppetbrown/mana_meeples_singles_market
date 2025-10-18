import type { ErrorRequestHandler } from 'express';
import { logger } from '../lib/logger.js';


export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
const status = (err as any).statusCode ?? 500;
const code = (err as any).code ?? 'INTERNAL';
logger.error({ err, path: req.path, code }, 'request failed');
if (res.headersSent) return;
res.status(status).json({ error: { code, message: status === 500 ? 'Internal server error' : String(err.message ?? err) } });
};