// ============================================================================
// lib/api/endpoints.ts - Centralized endpoint definitions
// ============================================================================

/**
 * API endpoint paths
 * Single source of truth for all API routes
 * 
 * IMPORTANT: All endpoints include the /api prefix because the backend
 * mounts all routes at app.use("/api", routes)
 */
export const ENDPOINTS = {
  // Health checks (no /api prefix - mounted at root)
  HEALTH: '/health',
  
  // Authentication - CORRECTED PATHS
  AUTH: {
    LOGIN: '/api/auth/admin/login',      // ✅ Full path with /api prefix
    LOGOUT: '/api/auth/admin/logout',    // ✅ Full path with /api prefix
    CHECK: '/api/auth/admin/check'       // ✅ Full path with /api prefix (was VERIFY)
  },

  // Cards
  CARDS: {
    LIST: '/api/cards',
    COUNT: '/api/cards/count',
    FILTERS: '/api/cards/filters',
    BY_ID: (id: number) => `/api/cards/${id}`
  },

  // Storefront
  STOREFRONT: {
    CARDS: '/api/storefront/cards',
    FILTERS: '/api/storefront/filters'
  },

  // Orders
  ORDERS: {
    LIST: '/api/admin/orders',
    BY_ID: (id: number) => `/api/admin/orders/${id}`,
    STATUS: (id: number) => `/api/admin/orders/${id}/status`,
    CREATE: '/api/orders'
  },

  // Inventory
  INVENTORY: {
    LIST: '/api/admin/inventory',
    UPDATE: '/api/admin/inventory/update',
    BULK: '/api/admin/inventory/bulk'
  },

  // Analytics
  ANALYTICS: {
    OVERVIEW: '/api/admin/analytics/overview',
    SALES: '/api/admin/analytics/sales'
  }
} as const;

/**
 * Build query string from params
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(value)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}