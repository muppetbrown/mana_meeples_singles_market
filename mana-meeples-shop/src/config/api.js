// API Configuration
// This file centralizes API URL configuration for all components

const getApiUrl = () => {
  // Priority order:
  // 1. Explicit REACT_APP_API_URL from environment
  // 2. Auto-detect from current window location in production builds
  // 3. Development fallback to localhost

  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // In production builds, try to detect the API URL from current location
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const portSuffix = port && port !== '80' && port !== '443' ? `:${port}` : '';
    return `${protocol}//${hostname}${portSuffix}/api`;
  }

  // Development fallback
  return 'http://localhost:10000/api';
};

export const API_URL = getApiUrl();

// Export a function for components that need to check the URL dynamically
export const getAPIUrl = () => API_URL;

// For debugging - log the API URL in non-production environments
if (process.env.NODE_ENV !== 'production') {
  console.log('🔗 API URL configured as:', API_URL);
}