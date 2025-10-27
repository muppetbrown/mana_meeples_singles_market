import type { ErrorRequestHandler } from 'express';
import { logger } from '../lib/logger.js';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const path = (first?.path ?? []).join('.') || 'root';
    return res.status(400).json({ error: `${path}: ${first?.message || 'Invalid input'}` });
  }
  const status = (err && typeof err === 'object' && 'statusCode' in err && typeof (err as {statusCode: number}).statusCode === 'number')
    ? (err as {statusCode: number}).statusCode
    : 500;
  const code = (err && typeof err === 'object' && 'code' in err && typeof (err as {code: string}).code === 'string')
    ? (err as {code: string}).code
    : 'INTERNAL';
  logger.error({ err, path: req.path, code }, 'request failed');
  if (res.headersSent) return;
  const message = status === 500
    ? 'Internal server error'
    : String((err && typeof err === 'object' && 'message' in err) ? (err as {message: unknown}).message : err);
  res.status(status).json({ error: { code, message } });
};
