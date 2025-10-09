// API Configuration
// Simplified build-time environment variable approach with single fallback

// Simple environment-based API URL with fallback
const API_URL = process.env.REACT_APP_API_URL || 'https://mana-meeples-singles-market.onrender.com/api';

// Log for debugging (minimal)
if (process.env.NODE_ENV !== 'production') {
  console.log('🔗 API URL:', API_URL);
}

export { API_URL };
export const getAPIUrl = () => API_URL;