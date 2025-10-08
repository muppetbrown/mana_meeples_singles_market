// API Configuration
// This file centralizes API URL configuration for all components

const getApiUrl = () => {
  // Priority order:
  // 1. Explicit REACT_APP_API_URL from environment
  // 2. Auto-detect from current window location in production builds
  // 3. Known production domain fallback
  // 4. Development fallback to localhost

  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // In production builds, try to detect the API URL from current location
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;

    // Special handling for known production domain
    if (hostname === 'manaandmeeples.co.nz' || hostname === 'www.manaandmeeples.co.nz') {
      return 'https://manaandmeeples.co.nz/api';
    }

    const portSuffix = port && port !== '80' && port !== '443' ? `:${port}` : '';
    return `${protocol}//${hostname}${portSuffix}/api`;
  }

  // Development fallback
  return 'http://localhost:10000/api';
};

export const API_URL = getApiUrl();

// Export a function for components that need to check the URL dynamically
export const getAPIUrl = () => API_URL;

// For debugging - always log the API URL to help troubleshoot connection issues
if (typeof window !== 'undefined') {
  console.log('🔗 API URL configured as:', API_URL);
  console.log('🌐 Current hostname:', window.location.hostname);
  console.log('🏗️ Build environment:', process.env.NODE_ENV);
}