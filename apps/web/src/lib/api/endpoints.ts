// ============================================================================
// lib/api/endpoints.ts - Centralized endpoint definitions
// ============================================================================

/**
 * API endpoint paths
 * Single source of truth for all API routes
 */
export const ENDPOINTS = {
  // Health checks
  HEALTH: '/health',
  
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    VERIFY: '/auth/verify'
  },

  // Cards
  CARDS: {
    LIST: '/cards/cards',
    COUNT: '/cards/count',
    FILTERS: '/cards/filters',
    BY_ID: (id: number) => `/cards/${id}`
  },

  // Storefront
  STOREFRONT: {
    CARDS: '/storefront/cards',
    FILTERS: '/storefront/filters'
  },

  // Orders
  ORDERS: {
    LIST: '/admin/orders',
    BY_ID: (id: number) => `/admin/orders/${id}`,
    STATUS: (id: number) => `/admin/orders/${id}/status`,
    CREATE: '/orders'
  },

  // Inventory
  INVENTORY: {
    LIST: '/admin/inventory',
    UPDATE: '/admin/inventory/update',
    BULK: '/admin/inventory/bulk'
  },

  // Analytics
  ANALYTICS: {
    OVERVIEW: '/admin/analytics/overview',
    SALES: '/admin/analytics/sales'
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
        value.forEach(v => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Using the API client
import { api, ENDPOINTS } from '@/lib/api';
import { StorefrontCard } from '@/types';

// Simple GET
const cards = await api.get<StorefrontCard[]>(ENDPOINTS.STOREFRONT.CARDS);

// GET with params
const filteredCards = await api.get<StorefrontCard[]>(
  ENDPOINTS.STOREFRONT.CARDS,
  { game: 'mtg', inStockOnly: true }
);

// POST with body
const order = await api.post(ENDPOINTS.ORDERS.CREATE, {
  items: cartItems,
  customer: customerData
});

// PATCH
await api.patch(ENDPOINTS.ORDERS.STATUS(orderId), {
  status: 'confirmed'
});

// With Zod validation
const CardsSchema = z.array(z.object({
  id: z.number(),
  name: z.string()
}));

const validatedCards = await api.get(
  ENDPOINTS.CARDS.LIST,
  undefined,
  CardsSchema
);

// Error handling
import { useErrorHandler } from '@/services/error/handler';

const { handleError } = useErrorHandler();

try {
  await api.get(ENDPOINTS.CARDS.LIST);
} catch (error) {
  const formattedError = handleError(error);
  showToast(formattedError.title, formattedError.message);
}
*/