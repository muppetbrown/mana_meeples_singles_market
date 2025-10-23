/**
 * API Endpoint Constants
 * All endpoints include the /api prefix as that's how they're mounted in Express
 */

export const ENDPOINTS = {
  // ============================================================================
  // AUTHENTICATION
  // ============================================================================
  AUTH: {
    ADMIN_LOGIN: '/api/auth/admin/login',
    ADMIN_LOGOUT: '/api/auth/admin/logout',
    ADMIN_CHECK: '/api/auth/admin/check',
  },

  // ============================================================================
  // PUBLIC STOREFRONT ENDPOINTS
  // ============================================================================
  CARDS: '/api/cards/cards',
  CARD_DETAIL: (id: string | number) => `/api/cards/cards/${id}`,
  GAMES: '/api/cards/games',
  SETS: '/api/cards/sets',
  FILTERS: '/api/cards/filters',
  ORDERS: '/api/cards/orders',
  
  // Card Variations
  VARIATIONS: (cardId: string | number) => `/api/variations/variations/${cardId}`,

  // ============================================================================
  // ADMIN ENDPOINTS (Require Authentication)
  // ============================================================================
  ADMIN: {
    // Order Management
    ORDERS: '/api/admin/orders',
    ORDER_DETAIL: (id: string | number) => `/api/admin/orders/${id}`,
    UPDATE_ORDER_STATUS: (id: string | number) => `/api/admin/orders/${id}/status`,

    // Card Management
    CARDS: '/api/admin/cards',
    ALL_CARDS: '/api/admin/all-cards',
    CARD_DETAIL: (id: string | number) => `/api/admin/cards/${id}`,

    // Inventory Management
    INVENTORY: '/api/admin/inventory',
    INVENTORY_ITEM: (id: string | number) => `/api/admin/inventory/${id}`,

    // Analytics
    ANALYTICS: '/api/admin/analytics',

    // Bulk Operations
    IMPORT_CARDS: '/api/admin/import-card-data',
    REFRESH_PRICES: '/api/admin/refresh-prices',
    BULK_CREATE_FOILS: '/api/admin/bulk-create-foils',
    BULK_CREATE_VARIATIONS: '/api/admin/bulk-create-variations',

    // Variations Management
    VARIATIONS: (cardId: string | number) => `/api/admin/variations/${cardId}`,
  },

  // ============================================================================
  // HEALTH CHECK (No /api prefix)
  // ============================================================================
  HEALTH: '/health',
} as const;

/**
 * Helper function to build query strings
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Handle arrays
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

/**
 * Helper to add query params to an endpoint
 */
export function withQuery(endpoint: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return endpoint;
  }
  return endpoint + buildQueryString(params);
}

// Type exports for better type safety
export type Endpoint = typeof ENDPOINTS;