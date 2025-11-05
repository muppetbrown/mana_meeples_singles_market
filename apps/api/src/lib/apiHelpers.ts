/**
 * API Helper Utilities
 * Shared utilities for API routes to eliminate duplication
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

export interface PaginationParams {
  page: number;
  per_page: number;
  sort: string;
  order: 'asc' | 'desc';
}

export interface PaginationResult {
  orderBy: string;
  limitOffset: string;
  offset: number;
  limit: number;
}

/**
 * Build SQL ORDER BY and LIMIT/OFFSET clauses for pagination
 * Eliminates duplication across cards.ts and storefront.ts
 */
export function buildPaginationSQL(
  tableAlias: string,
  params: PaginationParams,
  sortColumns: Record<string, string>
): PaginationResult {
  const { page, per_page, sort, order } = params;

  // Map sort field to SQL column
  const column = sortColumns[sort] || sortColumns['name'] || `${tableAlias}.name`;
  const safeOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  const orderBy = `ORDER BY ${column} ${safeOrder}`;
  const offset = (page - 1) * per_page;
  const limitOffset = `LIMIT ${per_page} OFFSET ${offset}`;

  return {
    orderBy,
    limitOffset,
    offset,
    limit: per_page,
  };
}

// ============================================================================
// ERROR HANDLING WRAPPER
// ============================================================================

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

/**
 * Wraps async route handlers with consistent error handling
 * Eliminates try-catch duplication across routes
 *
 * Usage:
 * router.get('/cards', asyncHandler(async (req, res) => {
 *   const data = await fetchCards();
 *   return res.json(data);
 * }));
 */
export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      logger.error('Route handler error', {
        method: req.method,
        path: req.path,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });

      // If response already sent, don't send another
      if (res.headersSent) {
        return next(err);
      }

      // Default error response
      const statusCode = err.statusCode || err.status || 500;
      return res.status(statusCode).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      });
    });
  };
}

// ============================================================================
// QUERY VALIDATION HELPER
// ============================================================================

/**
 * Standard response for validation errors
 */
export function validationError(res: Response, error: unknown): Response {
  return res.status(400).json({
    error: 'Invalid query parameters',
    details: error,
  });
}

// ============================================================================
// DATABASE ERROR HELPERS
// ============================================================================

export interface DbError {
  code?: string;
  detail?: string;
  message?: string;
  constraint?: string;
}

/**
 * Extract useful information from database errors
 */
export function formatDbError(err: unknown): DbError {
  if (!err || typeof err !== 'object') {
    return { message: String(err) };
  }

  const error = err as Record<string, unknown>;
  return {
    code: typeof error.code === 'string' ? error.code : undefined,
    detail: typeof error.detail === 'string' ? error.detail : undefined,
    message: error instanceof Error ? error.message : String(error),
    constraint: typeof error.constraint === 'string' ? error.constraint : undefined,
  };
}

/**
 * Check if error is a "not found" error (404)
 */
export function isNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;

  const error = err as Record<string, unknown>;

  // Check status code
  if (typeof error.status === 'number' && error.status === 404) {
    return true;
  }

  // Check error message
  if (typeof error.message === 'string') {
    const msg = error.message.toLowerCase();
    return msg.includes('not found') || msg.includes('404');
  }

  return false;
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Standard success response with data
 */
export function successResponse<T>(res: Response, data: T, statusCode: number = 200): Response {
  return res.status(statusCode).json(data);
}

/**
 * Standard error response
 */
export function errorResponse(
  res: Response,
  message: string,
  statusCode: number = 500,
  details?: unknown
): Response {
  return res.status(statusCode).json({
    error: message,
    ...(details && { details }),
  });
}

/**
 * Not found response
 */
export function notFoundResponse(res: Response, resource: string = 'Resource'): Response {
  return errorResponse(res, `${resource} not found`, 404);
}

// ============================================================================
// COMMON SORT COLUMN MAPPINGS
// ============================================================================

/**
 * Standard sort columns for card-related endpoints
 */
export const CARD_SORT_COLUMNS: Record<string, string> = {
  name: 'name',
  number: 'card_number',
  rarity: 'rarity',
  created_at: 'created_at',
  set: 'set_name',
  game: 'game_name',
};

/**
 * Get sort column with table alias
 */
export function getCardSortColumn(alias: string, sort: string): string {
  const column = CARD_SORT_COLUMNS[sort] || 'name';
  return `${alias}.${column}`;
}
