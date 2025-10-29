/**
 * API Endpoint Constants
 * 
 * CRITICAL: All endpoints include the /api prefix because the Express app
 * mounts all routes under /api in app.ts
 * 
 * Example: ENDPOINTS.CARDS = '/cards/cards'
 * IN APPS.TS, ALL ROUTES ARE MOUNTED ON = app.use("/api", routes);
 * Results in: http://localhost:10000/api/cards/cards
 */

export const ENDPOINTS = {
  // ============================================================================
  // AUTHENTICATION
  // ============================================================================
  AUTH: {
    ADMIN_LOGIN: '/auth/admin/login',
    ADMIN_LOGOUT: '/auth/admin/logout',
    ADMIN_CHECK: '/auth/admin/check',
  },

  // ============================================================================
  // PUBLIC CARD ENDPOINTS
  // ============================================================================
  
  // Cards - mounted under /cards
  CARDS: '/cards/cards',                                    // List cards with variations
  CARD_DETAIL: (id: string | number) => `/cards/cards/${id}`,
  CARD_COUNT: '/cards/count',                              // Get total count with filters
  FILTERS: '/cards/filters',                               // Get filter options + games + sets
  
  // Storefront - mounted under /storefront (public-facing, includes inventory)
  STOREFRONT_CARDS: '/storefront/cards',                   // Cards with inventory data
  STOREFRONT_CARD: (id: string | number) => `/storefront/cards/${id}`,
  
  // Games & Sets - mounted at root level
  GAMES: '/games',                                         // List all games
  GAME_DETAIL: (id: string | number) => `/games/${id}`,
  SETS: '/sets',                                           // List all sets
  SET_DETAIL: (id: string | number) => `/sets/${id}`,
  
  // Search - mounted at root level
  SEARCH: '/search',                                       // Full text search
  SEARCH_AUTOCOMPLETE: '/search/autocomplete',             // Autocomplete suggestions
  
  // Variations - mounted under /variations
  VARIATIONS: (cardId: string | number) => `/variations/variations/${cardId}`,
  
  // Orders - public order creation
  ORDERS: '/orders',                                       // Create order (POST)
  ORDER_DETAIL: (id: string | number) => `/orders/${id}`, // Get order details (GET)

  // ============================================================================
  // ADMIN ENDPOINTS (Require Authentication)
  // ============================================================================
  ADMIN: {
    // Order Management - ✅ IMPLEMENTED
    ORDERS: '/admin/orders',                                        // List all orders
    ORDER_DETAIL: (id: string | number) => `/admin/orders/${id}`,  // Get order with items
    UPDATE_ORDER_STATUS: (id: string | number) => `/admin/orders/${id}/status`, // Update status

    // Inventory Management - ✅ IMPLEMENTED
    INVENTORY: '/admin/inventory',                                  // List inventory (paginated)
    INVENTORY_ITEM: (id: string | number) => `/admin/inventory/${id}`, // Update/delete inventory
    INVENTORY_EXPORT: '/admin/inventory/export',                    // Export to CSV
    INVENTORY_BULK_IMPORT: '/admin/inventory/bulk-import',         // Bulk import from CSV/JSON
  },

  // ============================================================================
  // HEALTH & DIAGNOSTICS
  // ============================================================================
  HEALTH: '/health',                                           // Basic health check
  HEALTHZ: '/healthz',                                     // Kubernetes-style health
  READYZ: '/readyz',                                       // Readiness check
} as const;

/**
 * Helper function to build query strings
 */
export function buildQueryString(params: Record<string, string | number | boolean | string[]>): string {
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
export function withQuery(endpoint: string, params?: Record<string, string | number | boolean | string[]>): string {
  if (!params || Object.keys(params).length === 0) {
    return endpoint;
  }
  return endpoint + buildQueryString(params);
}

// Type exports for better type safety
export type Endpoint = typeof ENDPOINTS;

/**
 * ============================================================================
 * IMPORTANT NOTES FOR DEVELOPERS
 * ============================================================================
 * 
 * 1. ALL-CARDS VIEW:
 *    The old `/api/admin/all-cards` endpoint DOES NOT EXIST.
 *    Instead, use: ENDPOINTS.CARDS with limit parameter
 *    
 *    Example: `/api/cards/cards?limit=1000`
 *    
 *    ⚠️  WARNING: Using limit=1000 will:
 *    - Return max 1000 cards (or fewer if you don't have that many)
 *    - NOT provide pagination metadata
 *    - Silently truncate if you have >1000 cards
 *    
 *    RECOMMENDED: Use ENDPOINTS.CARD_COUNT to check total first:
 *    
 *    ```typescript
 *    const countRes = await api.get(ENDPOINTS.CARD_COUNT);
 *    const total = countRes.count;
 *    
 *    if (total > 1000) {
 *      // Show warning: "Showing first 1000 of {total} cards"
 *      // OR implement pagination
 *    }
 *    
 *    const cardsRes = await api.get(withQuery(ENDPOINTS.CARDS, { limit: 1000 }));
 *    ```
 * 
 * 2. CARD DETAIL:
 *    For admin purposes, use the public ENDPOINTS.CARDS or ENDPOINTS.STOREFRONT_CARD
 *    There is no special admin-only card detail endpoint.
 * 
 * 3. NOT YET IMPLEMENTED:
 *    - Analytics dashboard
 *    - Bulk price refresh
 *    - Bulk foil creation
 *    - Admin variations management
 *    - Card import tools
 * 
 * 4. PAGINATION:
 *    Most list endpoints support pagination:
 *    - page: Page number (default: 1)
 *    - per_page: Items per page (default: 50, max: varies by endpoint)
 *    - sort: Sort field
 *    - order: 'asc' or 'desc'
 */