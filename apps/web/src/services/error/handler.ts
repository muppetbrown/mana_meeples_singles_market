// ============================================================================
// services/error/handler.ts - Centralized error handling
// ============================================================================

import { ErrorType, FormattedError, ErrorTemplate } from './types';

/**
 * User-friendly error messages by type
 */
const ERROR_TEMPLATES: Record<ErrorType, ErrorTemplate> = {
  [ErrorType.NETWORK]: {
    title: 'Connection Error',
    message: 'Please check your internet connection and try again.',
    action: 'Retry'
  },
  [ErrorType.AUTH]: {
    title: 'Authentication Error',
    message: 'Your session has expired. Please log in again.',
    action: 'Login'
  },
  [ErrorType.VALIDATION]: {
    title: 'Validation Error',
    message: 'Please check your input and try again.',
    action: 'Fix'
  },
  [ErrorType.API]: {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again later.',
    action: 'Retry'
  },
  [ErrorType.UNKNOWN]: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again.',
    action: 'Retry'
  }
};

/**
 * HTTP status code ranges
 */
const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  BAD_REQUEST: 400,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
} as const;

/**
 * Categorize error based on characteristics
 */
export function categorizeError(error: unknown): ErrorType {
  // Network errors
  if (!navigator.onLine || (error instanceof Error && error.name === 'TypeError' && error.message.includes('fetch'))) {
    return ErrorType.NETWORK;
  }

  // Extract status code with proper type checking
  const errorObj = error as Record<string, unknown>;
  const status = errorObj.status || (errorObj.response as Record<string, unknown>)?.status;

  // Authentication errors
  if (status === HTTP_STATUS.UNAUTHORIZED || status === HTTP_STATUS.FORBIDDEN) {
    return ErrorType.AUTH;
  }

  // Validation errors
  if (status === HTTP_STATUS.BAD_REQUEST || status === HTTP_STATUS.UNPROCESSABLE_ENTITY) {
    return ErrorType.VALIDATION;
  }

  // API errors
  if (status >= HTTP_STATUS.INTERNAL_SERVER_ERROR || (status >= 400 && status < 500)) {
    return ErrorType.API;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Format error for user display
 */
export function formatError(error: unknown, customMessage?: string): FormattedError {
  const category = categorizeError(error);
  const template = ERROR_TEMPLATES[category];

  return {
    type: category,
    title: template.title,
    message: customMessage || error.message || template.message,
    action: template.action,
    originalError: error,
    timestamp: new Date().toISOString()
  };
}

/**
 * Log error for monitoring (console in dev, service in prod)
 */
export function logError(error: unknown, context: Record<string, unknown> = {}): void {
  const formattedError = formatError(error);

  if (process.env.NODE_ENV === 'development') {
    console.error('Error occurred:', {
      ...formattedError,
      context,
      stack: error.stack
    });
  } else {
    // In production, send to monitoring service (Sentry, etc.)
    // Example: Sentry.captureException(error, { extra: context });
    console.error('Error:', formattedError.type, formattedError.message);
  }
}

/**
 * React hook for error handling
 */
export function useErrorHandler() {
  const handleError = (error: unknown, context?: Record<string, unknown>) => {
    logError(error, context);
    return formatError(error);
  };

  return { handleError, formatError, categorizeError };
}