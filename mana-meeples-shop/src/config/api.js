// API Configuration
// This file centralizes API URL configuration for all components

const getApiUrl = () => {
  // Enhanced debugging for production issues
  console.log('🔍 API URL Resolution Debug:');
  console.log('  REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  window.location.hostname:', typeof window !== 'undefined' ? window.location.hostname : 'N/A');

  // Priority order:
  // 1. Explicit REACT_APP_API_URL from environment
  if (process.env.REACT_APP_API_URL) {
    console.log('✅ Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }

  // 2. Production environment auto-detection
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;

    // Special handling for known production domain
    if (hostname === 'manaandmeeples.co.nz' || hostname === 'www.manaandmeeples.co.nz') {
      console.log('✅ Using production domain fallback for known hostname');
      return 'https://manaandmeeples.co.nz/api';
    }

    const portSuffix = port && port !== '80' && port !== '443' ? `:${port}` : '';
    const detectedUrl = `${protocol}//${hostname}${portSuffix}/api`;
    console.log('✅ Using auto-detected URL:', detectedUrl);
    return detectedUrl;
  }

  // 3. If all else fails, and we're on a production-like hostname, force production API
  if (typeof window !== 'undefined' &&
      (window.location.hostname.includes('manaandmeeples') ||
       window.location.hostname.includes('render') ||
       !window.location.hostname.includes('localhost'))) {
    console.log('⚠️  Forcing production API URL as fallback');
    return 'https://manaandmeeples.co.nz/api';
  }

  // 4. Development fallback
  console.log('⚠️  Using development fallback');
  return 'http://localhost:10000/api';
};

export const API_URL = getApiUrl();

// Export a function for components that need to check the URL dynamically
export const getAPIUrl = () => API_URL;

// For debugging - always log the API URL to help troubleshoot connection issues
if (typeof window !== 'undefined') {
  console.log('🔗 Final API URL configured as:', API_URL);
  console.log('🌐 Current hostname:', window.location.hostname);
  console.log('🏗️ Build environment:', process.env.NODE_ENV);
  console.log('🔧 All process.env.REACT_APP_* variables:',
    Object.keys(process.env)
      .filter(key => key.startsWith('REACT_APP_'))
      .reduce((obj, key) => {
        obj[key] = process.env[key];
        return obj;
      }, {})
  );
} else {
  console.log('🔗 API URL configured as (server-side):', API_URL);
}