# API Client Usage Guide

## Overview

This directory contains the centralized API client infrastructure for the application. The system is designed to prevent API breakage by enforcing consistent usage patterns across all components.

## Core Principles

1. **Always use the `api` client** - Never use raw `fetch()` calls
2. **Always use `ENDPOINTS` constants** - Never hardcode API paths
3. **Always use TypeScript types** - Leverage type safety for requests/responses
4. **Always handle errors properly** - Use try/catch with meaningful error messages

## Quick Start

```typescript
import { api, ENDPOINTS } from '@/lib/api';

// ✅ CORRECT: Using api client with ENDPOINTS
const cards = await api.get(ENDPOINTS.CARDS.LIST, { limit: 100 });

// ✅ CORRECT: Dynamic endpoint with parameters
const card = await api.get(ENDPOINTS.CARDS.BY_ID(42));

// ❌ WRONG: Hardcoded URL
const cards = await fetch('/api/cards');

// ❌ WRONG: Manual URL construction
const cards = await api.get(`/api/cards?limit=100`);
```

## Environment Configuration

### Development
The API client defaults to `http://localhost:10000` (the backend API server).

**Important:** Do NOT point to `localhost:5173` - that's the Vite dev server!

### Production
Set the `VITE_API_URL` environment variable:

```bash
# .env.production
VITE_API_URL=https://api.yourapp.com
```

## API Client Methods

### GET Request
```typescript
// Simple GET
const data = await api.get<ResponseType>(ENDPOINTS.CARDS.LIST);

// GET with query parameters
const data = await api.get<ResponseType>(
  ENDPOINTS.CARDS.LIST,
  {
    limit: 100,
    game_id: 5,
    search: 'dragon'
  }
);
```

### POST Request
```typescript
const result = await api.post<ResponseType>(
  ENDPOINTS.ADMIN.INVENTORY,
  {
    card_id: 123,
    quality: 'NM',
    price: 4.99,
    stock_quantity: 10
  }
);
```

### PUT/PATCH Request
```typescript
const result = await api.patch<ResponseType>(
  ENDPOINTS.ORDERS.UPDATE_STATUS(orderId),
  { status: 'shipped' }
);
```

### DELETE Request
```typescript
await api.delete(ENDPOINTS.ADMIN.INVENTORY_BY_ID(inventoryId));
```

## Adding New Endpoints

When the backend adds a new endpoint, follow these steps:

### 1. Add to ENDPOINTS Registry

Edit `apps/web/src/lib/api/endpoints.ts`:

```typescript
export const ENDPOINTS = {
  // ... existing endpoints

  CARDS: {
    LIST: `${BASE_URL}/cards`,
    COUNT: `${BASE_URL}/cards/count`,
    // Add your new endpoint here:
    STATS: `${BASE_URL}/cards/stats`,
    // Or with parameters:
    VARIATIONS: (id: number) => `${BASE_URL}/cards/${id}/variations`,
  }
}
```

### 2. Use in Your Component

```typescript
import { api, ENDPOINTS } from '@/lib/api';

// Use the new endpoint
const stats = await api.get(ENDPOINTS.CARDS.STATS);
const variations = await api.get(ENDPOINTS.CARDS.VARIATIONS(cardId));
```

### 3. TypeScript Types

Always provide response types for type safety:

```typescript
interface CardStats {
  total: number;
  by_game: Record<string, number>;
}

const stats = await api.get<CardStats>(ENDPOINTS.CARDS.STATS);
// Now stats is typed as CardStats
```

## Error Handling

The API client provides enhanced error information:

```typescript
try {
  const cards = await api.get(ENDPOINTS.CARDS.LIST);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', {
      status: error.status,
      message: error.message,
      data: error.data
    });

    // Handle specific status codes
    if (error.status === 404) {
      // Handle not found
    } else if (error.status === 401) {
      // Handle unauthorized
    }
  }
}
```

## Best Practices

### ✅ DO

- Use `api.get/post/put/patch/delete` for all API calls
- Use `ENDPOINTS` constants for all URLs
- Provide TypeScript types for responses
- Handle errors with try/catch
- Use query parameters as objects (not URLSearchParams)

### ❌ DON'T

- Use raw `fetch()` calls
- Hardcode API paths like `/api/cards`
- Manually construct query strings
- Ignore TypeScript types
- Swallow errors silently

## Debugging API Issues

When API calls fail, check the browser console for detailed error logs:

```
❌ API Error: {
  method: "GET",
  endpoint: "/api/cards/count",
  status: 404,
  statusText: "Not Found",
  url: "http://localhost:10000/api/cards/count",
  errorMessage: "Not Found",
  params: { game_id: 5 }
}
```

This tells you:
1. What HTTP method was used
2. Which endpoint was called
3. The full constructed URL
4. What parameters were sent
5. The error response from the server

## Common Issues and Solutions

### Issue: "API Error: Not Found (404)"

**Cause:** The endpoint doesn't exist in the backend

**Solution:**
1. Check if the endpoint is defined in `ENDPOINTS`
2. Verify the endpoint exists in the backend routes
3. Check if you're using the correct HTTP method (GET vs POST, etc.)

### Issue: "Invalid API URL"

**Cause:** Malformed endpoint or base URL

**Solution:**
1. Check that `VITE_API_URL` is set correctly
2. Verify the endpoint path starts with `/api`
3. Check for typos in the endpoint name

### Issue: "Failed to build URL"

**Cause:** Invalid parameters or endpoint structure

**Solution:**
1. Ensure parameters are passed as a plain object
2. Check that dynamic endpoints (like `BY_ID(id)`) are called as functions
3. Verify parameter values are not undefined

## Testing Endpoints

Before deploying, verify all endpoints work:

```typescript
// Create a test script
const testEndpoints = async () => {
  try {
    // Test each major endpoint
    await api.get(ENDPOINTS.CARDS.LIST, { limit: 1 });
    console.log('✅ CARDS.LIST works');

    await api.get(ENDPOINTS.CARDS.COUNT);
    console.log('✅ CARDS.COUNT works');

    await api.get(ENDPOINTS.CARDS.FILTERS);
    console.log('✅ CARDS.FILTERS works');

  } catch (error) {
    console.error('❌ Endpoint test failed:', error);
  }
};
```

## Architecture Notes

### Why This System?

This centralized API system solves several problems:

1. **Prevents hardcoded URLs** - All endpoints in one place
2. **Type safety** - TypeScript catches errors at compile time
3. **Consistent error handling** - Unified error messages
4. **Environment awareness** - Automatically uses correct API URL
5. **Easier maintenance** - Change endpoint once, affects all callers

### File Structure

```
apps/web/src/lib/api/
├── index.ts          # Exports api client and ENDPOINTS
├── client.ts         # ApiClient class implementation
├── endpoints.ts      # ENDPOINTS constants registry
└── README.md         # This file
```

### When to Update

Update this system when:

- ✅ Backend adds new endpoints
- ✅ Backend changes endpoint paths
- ✅ You find a component using `fetch()` directly
- ✅ You find hardcoded API paths

## Support

If you encounter issues with the API client:

1. Check the browser console for detailed error logs
2. Review this documentation
3. Check that your endpoint is in the `ENDPOINTS` registry
4. Verify the backend route actually exists
5. Check environment variables are set correctly

## Examples from Codebase

### CardsTab.tsx - Fetching Cards with Filters

```typescript
const fetchCards = async () => {
  const params: Record<string, unknown> = {
    limit: 1000
  };

  if (selectedGame !== 'all') {
    params.game_id = gameId;
  }

  const data = await api.get<{ cards?: Card[] }>(
    ENDPOINTS.CARDS.LIST,
    params
  );
  setCards(data?.cards ?? []);
};
```

### AddToCartModal - Fetching Inventory Options

```typescript
const { data } = useQuery({
  queryKey: ['inventory-options', cardId],
  queryFn: async () => {
    return await api.get<{ options: InventoryOption[] }>(
      ENDPOINTS.CARDS.INVENTORY(cardId)
    );
  },
});
```

### AdminDashboard - Posting Data

```typescript
const handleLogin = async () => {
  try {
    await api.post(ENDPOINTS.AUTH.ADMIN_LOGIN, {
      username,
      password
    });
    navigate('/admin/dashboard');
  } catch (error) {
    setError('Login failed');
  }
};
```
