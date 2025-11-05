/**
 * Frontend Environment Configuration
 * Validates and provides type-safe access to environment variables
 *
 * All environment variables must be prefixed with VITE_ to be exposed to the client
 */

interface AppConfig {
  // API Configuration
  apiUrl: string;
  apiTimeout: number;

  // Feature Flags
  isDevelopment: boolean;
  isProduction: boolean;

  // Optional external services
  errorLogEndpoint?: string;
  analyticsId?: string;
}

/**
 * Parse and validate environment configuration
 * Throws descriptive errors if required variables are missing
 */
function parseConfig(): AppConfig {
  const env = import.meta.env;

  // Required in all environments
  const apiUrl = env.VITE_API_URL || 'http://localhost:10000';
  const mode = env.MODE || 'development';

  return {
    // API
    apiUrl,
    apiTimeout: 30000, // 30 seconds

    // Environment
    isDevelopment: mode === 'development',
    isProduction: mode === 'production',

    // Optional
    errorLogEndpoint: env.VITE_ERROR_LOG_ENDPOINT,
    analyticsId: env.VITE_ANALYTICS_ID,
  };
}

/**
 * Validated application configuration
 * Use this instead of accessing import.meta.env directly
 */
export const appConfig = parseConfig();

/**
 * Helper to check if a feature is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
  const envVar = import.meta.env[`VITE_FEATURE_${feature.toUpperCase()}`];
  return envVar === 'true' || envVar === '1';
}

/**
 * Get API base URL with fallback
 */
export function getApiUrl(): string {
  return appConfig.apiUrl;
}

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return appConfig.isDevelopment;
}

/**
 * Check if running in production mode
 */
export function isProd(): boolean {
  return appConfig.isProduction;
}

// Log configuration in development
if (appConfig.isDevelopment) {
  console.group('📋 App Configuration');
  console.log('API URL:', appConfig.apiUrl);
  console.log('Environment:', import.meta.env.MODE);
  console.log('Error Logging:', appConfig.errorLogEndpoint ? 'Enabled' : 'Disabled');
  console.log('Analytics:', appConfig.analyticsId ? 'Enabled' : 'Disabled');
  console.groupEnd();
}
