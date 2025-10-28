/**
 * Error logging utility for production error tracking
 * Integrates with external logging services while maintaining privacy
 */

interface ErrorLogEntry {
  timestamp: number;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: {
    url: string;
    userAgent: string;
    userId?: string;
    component?: string;
    action?: string;
  };
  breadcrumbs?: Array<{
    timestamp: number;
    message: string;
    category: string;
    level: 'info' | 'warn' | 'error';
  }>;
}

class ErrorLogger {
  private breadcrumbs: Array<{
    timestamp: number;
    message: string;
    category: string;
    level: 'info' | 'warn' | 'error';
  }> = [];

  private readonly maxBreadcrumbs = 50;
  private readonly isProduction = import.meta.env.PROD;
  private readonly logEndpoint = import.meta.env.VITE_ERROR_LOG_ENDPOINT;

  /**
   * Add breadcrumb for error context
   */
  addBreadcrumb(message: string, category = 'general', level: 'info' | 'warn' | 'error' = 'info') {
    this.breadcrumbs.push({
      timestamp: Date.now(),
      message,
      category,
      level
    });

    // Keep only recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * Log error with context and breadcrumbs
   */
  async logError(error: Error, context?: {
    component?: string;
    action?: string;
    userId?: string;
  }) {
    const logEntry: ErrorLogEntry = {
      timestamp: Date.now(),
      error: {
        name: error.name,
        message: error.message,
        ...(error.stack ? { stack: error.stack } : {})
      },
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context
      },
      breadcrumbs: [...this.breadcrumbs] // Copy breadcrumbs
    };

    // Always log to console in development
    if (!this.isProduction) {
      console.group('🚨 Error Logger');
      console.error('Error:', error);
      console.log('Context:', logEntry.context);
      console.log('Breadcrumbs:', logEntry.breadcrumbs);
      console.groupEnd();
      return;
    }

    // In production, send to external logging service
    try {
      if (this.logEndpoint) {
        await this.sendToExternalLogger(logEntry);
      }

      // Also store locally for debugging
      this.storeLocalError(logEntry);

    } catch (logError) {
      // Fallback to console if external logging fails
      console.error('Failed to log error:', logError);
      console.error('Original error:', error);
    }
  }

  /**
   * Send error to external logging service (Sentry, LogRocket, etc.)
   */
  private async sendToExternalLogger(logEntry: ErrorLogEntry) {
    if (!this.logEndpoint) return;

    try {
      await fetch(this.logEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      // Silent fail - don't create error loops
      console.warn('Failed to send error to external logger:', error);
    }
  }

  /**
   * Store error locally for debugging
   */
  private storeLocalError(logEntry: ErrorLogEntry) {
    try {
      const storageKey = 'error_logs';
      const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');

      // Keep only recent errors (max 20)
      const updatedLogs = [...existingLogs, logEntry].slice(-20);

      localStorage.setItem(storageKey, JSON.stringify(updatedLogs));
    } catch (error) {
      // Ignore storage errors
      console.warn('Failed to store error locally:', error);
    }
  }

  /**
   * Get locally stored errors for debugging
   */
  getStoredErrors(): ErrorLogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('error_logs') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Clear stored errors
   */
  clearStoredErrors() {
    try {
      localStorage.removeItem('error_logs');
    } catch (error) {
      console.warn('Failed to clear stored errors:', error);
    }
  }

  /**
   * Log React component error with component info
   */
  logReactError(error: Error, errorInfo: { componentStack: string }) {
    this.addBreadcrumb(
      `React error in component: ${errorInfo.componentStack.split('\n')[1]?.trim() || 'Unknown'}`,
      'react',
      'error'
    );

    this.logError(error, {
      component: 'ErrorBoundary',
      action: 'componentDidCatch'
    });
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

// Add some default breadcrumbs for navigation
if (typeof window !== 'undefined') {
  // Track page navigation
  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    errorLogger.addBreadcrumb(`Navigation to: ${args[2]}`, 'navigation', 'info');
    return originalPushState.apply(this, args);
  };

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.addBreadcrumb(
      `Unhandled promise rejection: ${event.reason}`,
      'promise',
      'error'
    );
  });

  // Track network errors
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);

      if (!response.ok) {
        errorLogger.addBreadcrumb(
          `HTTP ${response.status} - ${args[0]}`,
          'network',
          'warn'
        );
      }

      return response;
    } catch (error) {
      errorLogger.addBreadcrumb(
        `Network error - ${args[0]}: ${error}`,
        'network',
        'error'
      );
      throw error;
    }
  };
}