// API Configuration
// This file centralizes API URL configuration for all components

const getApiUrl = () => {
  // Enhanced debugging for production issues
  console.log('🔍 API URL Resolution Debug:');
  console.log('  REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  window.location.hostname:', typeof window !== 'undefined' ? window.location.hostname : 'N/A');

  // Priority order (FIXED: hostname detection comes first to override incorrect build-time env vars):
  // 1. Production domain override - force correct URL when on production domain
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;

    // Always use production API when on production domain, regardless of build-time env vars
    if (hostname === 'manaandmeeples.co.nz' || hostname === 'www.manaandmeeples.co.nz') {
      console.log('✅ FORCING production API for production domain (overriding build-time env)');
      return 'https://manaandmeeples.co.nz/api';
    }

    // Also check for any non-localhost hostname that might be production
    if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
      // If we're not on localhost but have a localhost API URL, it's likely a build-time error
      if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.includes('localhost')) {
        console.log('⚠️  OVERRIDING localhost API URL detected on non-localhost domain');
        return 'https://manaandmeeples.co.nz/api';
      }
    }
  }

  // 2. Explicit REACT_APP_API_URL from environment (only if it makes sense for current hostname)
  if (process.env.REACT_APP_API_URL) {
    // If we're on localhost, use the environment variable as-is
    if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
      console.log('✅ Using REACT_APP_API_URL for localhost:', process.env.REACT_APP_API_URL);
      return process.env.REACT_APP_API_URL;
    }

    // If we're not on localhost but the env var is reasonable (not localhost), use it
    if (!process.env.REACT_APP_API_URL.includes('localhost')) {
      console.log('✅ Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
      return process.env.REACT_APP_API_URL;
    }
  }

  // 3. Production environment auto-detection
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const portSuffix = port && port !== '80' && port !== '443' ? `:${port}` : '';
    const detectedUrl = `${protocol}//${hostname}${portSuffix}/api`;
    console.log('✅ Using auto-detected URL:', detectedUrl);
    return detectedUrl;
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