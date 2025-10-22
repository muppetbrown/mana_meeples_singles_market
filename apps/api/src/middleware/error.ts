import type { ErrorRequestHandler } from 'express';
import { logger } from '../lib/logger.js';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const path = (first?.path ?? []).join('.') || 'root';
    return res.status(400).json({ error: `${path}: ${first?.message || 'Invalid input'}` });
  }
  const status = (err as any)?.statusCode ?? 500;
  const code = (err as any)?.code ?? 'INTERNAL';
  logger.error({ err, path: req.path, code }, 'request failed');
  if (res.headersSent) return;
  res.status(status).json({ error: { code, message: status === 500 ? 'Internal server error' : String((err as any)?.message ?? err) } });
};
