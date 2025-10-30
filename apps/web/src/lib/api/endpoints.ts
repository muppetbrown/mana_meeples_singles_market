// apps/web/src/lib/api/endpoints.ts
/**
 * API Endpoints Configuration
 * 
 * Centralized location for all API endpoint paths
 * Organized by feature domain for easy maintenance
 */

const BASE_URL = '/api';

export const ENDPOINTS = {
  // -------------------- Authentication --------------------
  AUTH: {
    LOGIN: `${BASE_URL}/auth/login`,
    ADMIN_LOGIN: `${BASE_URL}/auth/admin/login`, // Correct admin login endpoint
    LOGOUT: `${BASE_URL}/auth/admin/logout`,
    REGISTER: `${BASE_URL}/auth/register`,
    VERIFY: `${BASE_URL}/auth/verify`,
    REFRESH: `${BASE_URL}/auth/refresh`,
    ME: `${BASE_URL}/auth/me`,
  },

  // -------------------- Admin --------------------
  ADMIN: {
    // Pricing Management - 3 Button System
    INITIALIZE_PRICES: `${BASE_URL}/admin/pricing/initialize`,           // Button 1
    REFRESH_INVENTORY_PRICES: `${BASE_URL}/admin/pricing/refresh-inventory`, // Button 2
    REFRESH_CARD_PRICE: `${BASE_URL}/admin/pricing/refresh-card`,        // Button 3
    
    // Pricing Queries
    CARDS_WITHOUT_PRICING: `${BASE_URL}/admin/pricing/cards-without-pricing`,
    INVENTORY_CARDS: `${BASE_URL}/admin/pricing/inventory-cards`,
    CARD_VARIATIONS: `${BASE_URL}/admin/pricing/card-variations`,
    
    // Legacy endpoint (deprecated - use the 3 new endpoints above)
    UPDATE_PRICES: `${BASE_URL}/admin/pricing/update`,
    SCRYFALL_ELIGIBLE: `${BASE_URL}/admin/pricing/scryfall-eligible`,

    // Card Management
    CARDS: `${BASE_URL}/admin/cards`,
    CARD_BY_ID: (id: number) => `${BASE_URL}/admin/cards/${id}`,
    
    // Inventory Management
    INVENTORY: `${BASE_URL}/admin/inventory`,
    INVENTORY_BY_ID: (id: number) => `${BASE_URL}/admin/inventory/${id}`,
    
    // Import
    IMPORT_SCRYFALL: `${BASE_URL}/admin/import/scryfall`,
    IMPORT_STATUS: `${BASE_URL}/admin/import/status`,
  },

  // -------------------- Cards --------------------
  CARDS: {
    LIST: `${BASE_URL}/cards`,
    BY_ID: (id: number) => `${BASE_URL}/cards/${id}`,
    SEARCH: `${BASE_URL}/cards/search`,
    FILTERS: `${BASE_URL}/cards/filters`,
  },

  // -------------------- Inventory --------------------
  INVENTORY: {
    LIST: `${BASE_URL}/inventory`,
    BY_ID: (id: number) => `${BASE_URL}/inventory/${id}`,
    AVAILABLE: `${BASE_URL}/inventory/available`,
  },

  // -------------------- Cart --------------------
  CART: {
    GET: `${BASE_URL}/cart`,
    ADD: `${BASE_URL}/cart/add`,
    UPDATE: `${BASE_URL}/cart/update`,
    REMOVE: `${BASE_URL}/cart/remove`,
    CLEAR: `${BASE_URL}/cart/clear`,
  },

  // -------------------- Orders --------------------
  ORDERS: {
    LIST: `${BASE_URL}/orders`,
    BY_ID: (id: number) => `${BASE_URL}/orders/${id}`,
    CREATE: `${BASE_URL}/orders`,
    UPDATE_STATUS: (id: number) => `${BASE_URL}/orders/${id}/status`,
  },

  // -------------------- Users --------------------
  USERS: {
    PROFILE: `${BASE_URL}/users/profile`,
    UPDATE_PROFILE: `${BASE_URL}/users/profile`,
    ADDRESSES: `${BASE_URL}/users/addresses`,
    ADD_ADDRESS: `${BASE_URL}/users/addresses`,
  },

  // -------------------- Settings --------------------
  SETTINGS: {
    GET: `${BASE_URL}/settings`,
    UPDATE: `${BASE_URL}/settings`,
    GAMES: `${BASE_URL}/settings/games`,
  },
} as const;

export type EndpointKey = keyof typeof ENDPOINTS;

/**
 * Helper function to build query strings
 */
export const buildQueryString = (params: Record<string, any>): string => {
  const query = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => query.append(key, String(v)));
      } else {
        query.append(key, String(value));
      }
    }
  });
  
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Helper function to build URL with query params
 */
export const buildUrl = (endpoint: string, params?: Record<string, any>): string => {
  if (!params) return endpoint;
  return `${endpoint}${buildQueryString(params)}`;
};