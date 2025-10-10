/**
 * Centralized Error Handling Service
 * Provides consistent error handling across the application with user-friendly messages
 */

// Error types for categorization
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  VALIDATION: 'VALIDATION',
  API: 'API',
  UNKNOWN: 'UNKNOWN'
};

// User-friendly error messages
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: {
    title: 'Connection Error',
    message: 'Please check your internet connection and try again.',
    action: 'Retry'
  },
  [ERROR_TYPES.AUTH]: {
    title: 'Authentication Error',
    message: 'Your session has expired. Please log in again.',
    action: 'Login'
  },
  [ERROR_TYPES.VALIDATION]: {
    title: 'Validation Error',
    message: 'Please check your input and try again.',
    action: 'Fix'
  },
  [ERROR_TYPES.API]: {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again later.',
    action: 'Retry'
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again.',
    action: 'Retry'
  }
};

/**
 * Categorize error based on type and status
 */
export const categorizeError = (error) => {
  // Network errors
  if (!navigator.onLine || (error.name === 'TypeError' && error.message.includes('fetch'))) {
    return ERROR_TYPES.NETWORK;
  }

  // Authentication errors
  if (error.status === 401 || error.status === 403) {
    return ERROR_TYPES.AUTH;
  }

  // Validation errors
  if (error.status === 400 || error.status === 422) {
    return ERROR_TYPES.VALIDATION;
  }

  // API errors
  if (error.status >= 500 || (error.status >= 400 && error.status < 500)) {
    return ERROR_TYPES.API;
  }

  return ERROR_TYPES.UNKNOWN;
};

/**
 * Format error for display to user
 */
export const formatError = (error, customMessage = null) => {
  const category = categorizeError(error);
  const template = ERROR_MESSAGES[category];

  return {
    type: category,
    title: template.title,
    message: customMessage || error.message || template.message,
    action: template.action,
    originalError: error,
    timestamp: new Date().toISOString()
  };
};

/**
 * Log error for debugging/monitoring
 */
export const logError = (error, context = {}) => {
  const formattedError = formatError(error);

  // In production, you'd send this to an error monitoring service like Sentry
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 ${formattedError.title}`);
    console.error('Error:', formattedError.originalError);
    console.log('Context:', context);
    console.log('Formatted:', formattedError);
    console.groupEnd();
  }

  // Return formatted error for further handling
  return formattedError;
};

/**
 * Handle API response errors consistently
 */
export const handleApiError = async (response, context = {}) => {
  let errorData = {
    status: response.status,
    statusText: response.statusText
  };

  try {
    const jsonError = await response.json();
    errorData = { ...errorData, ...jsonError };
  } catch (parseError) {
    // Response isn't JSON, use status text
    errorData.message = response.statusText || `HTTP ${response.status}`;
  }

  const error = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
  error.status = response.status;
  error.response = response;

  return logError(error, context);
};

/**
 * React Error Boundary helper
 */
export class ErrorBoundary extends Error {
  constructor(message, componentStack) {
    super(message);
    this.name = 'ErrorBoundary';
    this.componentStack = componentStack;
  }
}

/**
 * Hook for handling errors in components
 */
export const useErrorHandler = () => {
  const handleError = (error, context = {}) => {
    const formattedError = logError(error, context);

    // You could dispatch to a global error state here
    // or trigger a toast notification

    return formattedError;
  };

  const handleApiCall = async (apiCall, context = {}) => {
    try {
      const response = await apiCall();

      if (!response.ok) {
        throw await handleApiError(response, context);
      }

      return response;
    } catch (error) {
      throw handleError(error, context);
    }
  };

  return { handleError, handleApiCall };
};

/**
 * Global error event listeners for unhandled errors
 */
export const setupGlobalErrorHandling = () => {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, { type: 'unhandledrejection' });
    event.preventDefault(); // Prevent default browser behavior
  });

  // JavaScript errors
  window.addEventListener('error', (event) => {
    logError(event.error, {
      type: 'javascript',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
};

/**
 * Retry utility for failed operations
 */
export const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw logError(error, {
          attempts: maxRetries,
          operation: operation.name || 'anonymous'
        });
      }

      // Wait before retrying, with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }

  throw lastError;
};

const errorHandler = {
  ERROR_TYPES,
  categorizeError,
  formatError,
  logError,
  handleApiError,
  useErrorHandler,
  setupGlobalErrorHandling,
  withRetry
};

export default errorHandler;