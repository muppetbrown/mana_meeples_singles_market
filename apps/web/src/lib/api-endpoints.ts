/**
 * Centralized API endpoint definitions
 * Single source of truth for all frontend API calls
 */

const API_BASE = process.env.VITE_API_URL || '';

export const API_ENDPOINTS = {
  // Health checks
  HEALTH: `${API_BASE}/health`,
  HEALTHZ: `${API_BASE}/healthz`,
  READYZ: `${API_BASE}/readyz`,

  // Public card endpoints
  CARDS: `${API_BASE}/cards`,
  CARDS_COUNT: `${API_BASE}/cards/count`,
  
  // Variations
  VARIATIONS: `${API_BASE}/variations`,
  variationsByCard: (cardId: string | number) => `${API_BASE}/variations/${cardId}`,

  // Search
  SEARCH_AUTOCOMPLETE: `${API_BASE}/search/autocomplete`,

  // Games & Sets
  GAMES: `${API_BASE}/games`,
  gameById: (id: string | number) => `${API_BASE}/games/${id}`,
  SETS: `${API_BASE}/sets`,
  setById: (id: string | number) => `${API_BASE}/sets/${id}`,

  // Public orders
  ORDERS: `${API_BASE}/orders`,
  orderById: (orderId: string) => `${API_BASE}/orders/${orderId}`,

  // Authentication
  AUTH: {
    LOGIN: `${API_BASE}/admin/login`,
    LOGOUT: `${API_BASE}/admin/logout`,
    CHECK: `${API_BASE}/admin/auth/check`,
  },

  // Admin - Orders
  ADMIN_ORDERS: {
    LIST: `${API_BASE}/admin/orders`,
    byId: (orderId: string) => `${API_BASE}/admin/orders/${orderId}`,
    updateStatus: (orderId: string) => `${API_BASE}/admin/orders/${orderId}/status`,
  },

  // Admin - Inventory
  ADMIN_INVENTORY: {
    LIST: `${API_BASE}/admin/inventory`,
    CREATE: `${API_BASE}/admin/inventory`,
    byId: (id: string | number) => `${API_BASE}/admin/inventory/${id}`,
    EXPORT: `${API_BASE}/admin/inventory/export`,
    BULK_IMPORT: `${API_BASE}/admin/inventory/bulk-import`,
  },

  // Admin - Analytics
  ADMIN_ANALYTICS: `${API_BASE}/admin/analytics`,

  // Admin - Card Management
  ADMIN_CARDS: {
    LIST: `${API_BASE}/admin/cards`,
    ALL: `${API_BASE}/admin/all-cards`,
    IMPORT: `${API_BASE}/admin/import-card-data`,
    REFRESH_PRICES: `${API_BASE}/admin/refresh-prices`,
    BULK_CREATE_FOILS: `${API_BASE}/admin/bulk-create-foils`,
    BULK_CREATE_VARIATIONS: `${API_BASE}/admin/bulk-create-variations`,
    variationsById: (cardId: string | number) => `${API_BASE}/admin/variations/${cardId}`,
  },

  // Filters (if needed)
  FILTERS: `${API_BASE}/filters`,
} as const;

/**
 * Type-safe API methods
 */
export const api = {
  // Generic GET/POST helpers
  get: async <T = any>(path: string, options?: RequestInit): Promise<T> => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  },

  post: async <T = any>(path: string, body?: any, options?: RequestInit): Promise<T> => {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      ...options,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  },

  // Cards
  getCards: (params?: URLSearchParams) => {
    const url = params ? `${API_ENDPOINTS.CARDS}?${params}` : API_ENDPOINTS.CARDS;
    return fetch(url);
  },
  
  getCardsCount: () => fetch(API_ENDPOINTS.CARDS_COUNT),

  // Variations
  getVariations: (params?: URLSearchParams) => {
    const url = params ? `${API_ENDPOINTS.VARIATIONS}?${params}` : API_ENDPOINTS.VARIATIONS;
    return fetch(url);
  },

  getVariationsByCard: (cardId: string | number) => 
    fetch(API_ENDPOINTS.variationsByCard(cardId)),

  // Search
  searchAutocomplete: (query: string) => 
    fetch(`${API_ENDPOINTS.SEARCH_AUTOCOMPLETE}?q=${encodeURIComponent(query)}`),

  // Games & Sets
  getGames: () => fetch(API_ENDPOINTS.GAMES),
  getGame: (id: string | number) => fetch(API_ENDPOINTS.gameById(id)),
  getSets: () => fetch(API_ENDPOINTS.SETS),
  getSet: (id: string | number) => fetch(API_ENDPOINTS.setById(id)),

  // Orders
  createOrder: (orderData: unknown) => 
    fetch(API_ENDPOINTS.ORDERS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    }),

  getOrder: (orderId: string) => fetch(API_ENDPOINTS.orderById(orderId)),

  // Auth
  login: (credentials: { username: string; password: string }) =>
    fetch(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include',
    }),

  logout: () =>
    fetch(API_ENDPOINTS.AUTH.LOGOUT, {
      method: 'POST',
      credentials: 'include',
    }),

  checkAuth: () =>
    fetch(API_ENDPOINTS.AUTH.CHECK, {
      credentials: 'include',
    }),

  // Admin - Orders
  admin: {
    getOrders: () =>
      fetch(API_ENDPOINTS.ADMIN_ORDERS.LIST, { credentials: 'include' }),

    getOrder: (orderId: string) =>
      fetch(API_ENDPOINTS.ADMIN_ORDERS.byId(orderId), { credentials: 'include' }),

    updateOrderStatus: (orderId: string, status: string) =>
      fetch(API_ENDPOINTS.ADMIN_ORDERS.updateStatus(orderId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include',
      }),

    // Inventory
    getInventory: (params?: URLSearchParams) => {
      const url = params 
        ? `${API_ENDPOINTS.ADMIN_INVENTORY.LIST}?${params}` 
        : API_ENDPOINTS.ADMIN_INVENTORY.LIST;
      return fetch(url, { credentials: 'include' });
    },

    createInventory: (data: unknown) =>
      fetch(API_ENDPOINTS.ADMIN_INVENTORY.CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      }),

    updateInventory: (id: string | number, data: unknown) =>
      fetch(API_ENDPOINTS.ADMIN_INVENTORY.byId(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      }),

    exportInventory: () =>
      fetch(API_ENDPOINTS.ADMIN_INVENTORY.EXPORT, { credentials: 'include' }),

    bulkImportInventory: (formData: FormData) =>
      fetch(API_ENDPOINTS.ADMIN_INVENTORY.BULK_IMPORT, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      }),

    // Analytics
    getAnalytics: () =>
      fetch(API_ENDPOINTS.ADMIN_ANALYTICS, { credentials: 'include' }),
  },
} as const;

/**
 * HTTP Method types for documentation
 */
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PATCH: 'PATCH',
  PUT: 'PUT',
  DELETE: 'DELETE',
} as const;

/**
 * Route documentation for analysis tools
 */
export const ROUTE_DOCUMENTATION = [
  // Health
  { method: 'GET', path: '/health' },
  { method: 'GET', path: '/healthz' },
  { method: 'GET', path: '/readyz' },

  // Cards
  { method: 'GET', path: '/cards' },
  { method: 'GET', path: '/cards/count' },

  // Variations
  { method: 'GET', path: '/variations' },
  { method: 'GET', path: '/variations/:card_id' },

  // Search
  { method: 'GET', path: '/search/autocomplete' },

  // Games & Sets
  { method: 'GET', path: '/games' },
  { method: 'GET', path: '/games/:id' },
  { method: 'GET', path: '/sets' },
  { method: 'GET', path: '/sets/:id' },

  // Orders
  { method: 'POST', path: '/orders' },
  { method: 'GET', path: '/orders/:orderId' },

  // Auth
  { method: 'POST', path: '/admin/login' },
  { method: 'POST', path: '/admin/logout' },
  { method: 'GET', path: '/admin/auth/check' },

  // Admin - Orders
  { method: 'GET', path: '/admin/orders' },
  { method: 'GET', path: '/admin/orders/:orderId' },
  { method: 'PATCH', path: '/admin/orders/:orderId/status' },

  // Admin - Inventory
  { method: 'GET', path: '/admin/inventory' },
  { method: 'POST', path: '/admin/inventory' },
  { method: 'PATCH', path: '/admin/inventory/:id' },
  { method: 'GET', path: '/admin/inventory/export' },
  { method: 'POST', path: '/admin/inventory/bulk-import' },

  // Admin - Analytics
  { method: 'GET', path: '/admin/analytics' },

  // Admin - Card Management (if implemented)
  { method: 'GET', path: '/admin/cards' },
  { method: 'GET', path: '/admin/all-cards' },
  { method: 'POST', path: '/admin/import-card-data' },
  { method: 'POST', path: '/admin/refresh-prices' },
  { method: 'POST', path: '/admin/bulk-create-foils' },
  { method: 'POST', path: '/admin/bulk-create-variations' },
  { method: 'GET', path: '/admin/variations/:card_id' },

  // Filters (if implemented)
  { method: 'GET', path: '/filters' },
] as const;