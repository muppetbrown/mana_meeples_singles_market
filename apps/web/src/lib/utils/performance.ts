/**
 * Performance Monitoring Utilities
 * Helps identify slow components and API calls in development
 */

import { appConfig } from '@/lib/config';

/**
 * Measure execution time of a function
 * Logs to console in development mode
 */
export function measurePerformance<T>(
  label: string,
  fn: () => T,
  logThreshold: number = 100 // ms
): T {
  if (!appConfig.isDevelopment) {
    return fn();
  }

  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  if (duration > logThreshold) {
    console.warn(`⚠️ Slow execution: ${label} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Measure async function execution time
 */
export async function measurePerformanceAsync<T>(
  label: string,
  fn: () => Promise<T>,
  logThreshold: number = 1000 // ms
): Promise<T> {
  if (!appConfig.isDevelopment) {
    return fn();
  }

  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (duration > logThreshold) {
    console.warn(`⚠️ Slow async execution: ${label} took ${duration.toFixed(2)}ms`);
  } else {
    console.log(`✅ ${label} completed in ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Performance mark for complex operations
 * Use with performance.measure() to track operation duration
 */
export function mark(name: string): void {
  if (!appConfig.isDevelopment) return;
  performance.mark(name);
}

/**
 * Measure between two performance marks
 */
export function measureBetween(name: string, startMark: string, endMark: string): void {
  if (!appConfig.isDevelopment) return;

  try {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name)[0];
    if (measure && measure.duration > 100) {
      console.log(`⏱️ ${name}: ${measure.duration.toFixed(2)}ms`);
    }
  } catch (error) {
    console.warn('Performance measurement failed:', error);
  }
}

/**
 * Log component render time (use in useEffect)
 */
export function logRenderTime(componentName: string, startTime: number): void {
  if (!appConfig.isDevelopment) return;

  const renderTime = performance.now() - startTime;
  if (renderTime > 16) {
    // 16ms = 1 frame at 60fps
    console.warn(
      `🐌 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms (target: <16ms for 60fps)`
    );
  }
}

/**
 * Debounce function for performance optimization
 * Returns a debounced version of the provided function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 * Ensures function is called at most once per specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memory usage helper (for debugging)
 */
export function logMemoryUsage(): void {
  if (!appConfig.isDevelopment) return;

  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.group('💾 Memory Usage');
    console.log('Used:', (memory.usedJSHeapSize / 1048576).toFixed(2), 'MB');
    console.log('Total:', (memory.totalJSHeapSize / 1048576).toFixed(2), 'MB');
    console.log('Limit:', (memory.jsHeapSizeLimit / 1048576).toFixed(2), 'MB');
    console.groupEnd();
  }
}
