# Currency Conversion Setup

This application now uses **live exchange rates** from [exchangerate-api.com](https://www.exchangerate-api.com) instead of static conversion rates.

## Setting Up Your API Key

### 1. Get Your API Key

1. Visit [https://www.exchangerate-api.com](https://www.exchangerate-api.com)
2. Sign up for a free account
3. Copy your API key from the dashboard

### 2. Add API Key to Backend

**For Development:**

1. Navigate to `apps/api/` directory
2. Create or edit your `.env` file (copy from `.env.example` if needed)
3. Add the following line:
   ```
   EXCHANGE_RATE_API_KEY=your_actual_api_key_here
   ```

**For Production (Render.com or other hosting):**

1. Go to your hosting dashboard (e.g., Render.com)
2. Navigate to your API service's environment variables
3. Add a new environment variable:
   - **Key:** `EXCHANGE_RATE_API_KEY`
   - **Value:** Your actual API key

## How It Works

### Backend (API Server)

- **Service:** `apps/api/src/services/currencyService.ts`
  - Fetches exchange rates from exchangerate-api.com
  - Caches rates for 1 hour to minimize API calls
  - Falls back to static rates if API is unavailable

- **Endpoint:** `GET /api/currency/rates`
  - Returns current exchange rates for all supported currencies (NZD, USD, AUD, EUR, GBP)
  - Includes caching metadata

- **Endpoint:** `POST /api/currency/refresh`
  - Forces a refresh of exchange rates
  - Useful for testing or manual updates

### Frontend (Web App)

- **Service:** `apps/web/src/services/currency/exchangeRateService.ts`
  - Fetches rates from the backend API
  - Caches rates locally for 1 hour

- **Hook:** `apps/web/src/features/hooks/useCurrency.ts`
  - React hook for managing currency state with live rates
  - Automatically refreshes rates every hour
  - Provides loading states and error handling

- **Component:** `apps/web/src/shared/ui/CurrencySelector.tsx`
  - Updated to display all supported currencies
  - Shows live exchange rate status
  - Displays last update timestamp

## Supported Currencies

- **NZD** (New Zealand Dollar) - Base currency
- **USD** (US Dollar)
- **AUD** (Australian Dollar)
- **EUR** (Euro)
- **GBP** (British Pound)

## Feature Flag

The dynamic currency updates are controlled by the `AUTO_CURRENCY_UPDATE` feature flag in `apps/web/src/lib/constants/index.ts`:

```typescript
export const FEATURES = {
  AUTO_CURRENCY_UPDATE: true, // Set to false to use static rates
  // ... other features
};
```

## API Rate Limits

The free tier of exchangerate-api.com allows:
- **1,500 requests per month**
- With 1-hour caching, this supports approximately **50,000 user sessions per month**

## Fallback Behavior

If the API is unavailable or the key is not configured:
1. The system automatically falls back to static exchange rates
2. A warning is logged in the console
3. Users still see approximate rates (from January 2024)

## Testing

### Test Backend API Locally

```bash
# Start the API server
cd apps/api
npm run dev

# Test the endpoint
curl http://localhost:10000/api/currency/rates

# Force refresh
curl -X POST http://localhost:10000/api/currency/refresh
```

### Test Frontend Locally

1. Start both API and web servers:
   ```bash
   # Terminal 1 - API
   cd apps/api
   npm run dev

   # Terminal 2 - Web
   cd apps/web
   npm run dev
   ```

2. Open the shop in your browser
3. Click the currency selector in the top-right
4. You should see all 5 supported currencies with live rates
5. The tooltip will show "Live rates updated [date]"

## Troubleshooting

### "Exchange rates are approximate" message shows instead of live rates

**Cause:** Either the feature flag is disabled or the API key is not configured.

**Solution:**
1. Check that `AUTO_CURRENCY_UPDATE` is `true` in constants
2. Verify your API key is set in the backend `.env` file
3. Restart the API server after adding the key

### Rates not updating

**Cause:** Rates are cached for 1 hour to reduce API calls.

**Solution:**
- Wait for the cache to expire (1 hour)
- Or call the refresh endpoint: `POST /api/currency/refresh`
- Or restart the API server to clear the cache

### API errors in console

**Cause:** Invalid API key or rate limit exceeded.

**Solution:**
1. Verify your API key is correct
2. Check your usage at [exchangerate-api.com](https://www.exchangerate-api.com)
3. The system will automatically fall back to static rates

## Architecture Diagram

```
┌─────────────────┐
│  exchangerate   │
│    -api.com     │ ← External API (1,500 requests/month)
└────────┬────────┘
         │
         │ Fetch rates (hourly)
         ↓
┌─────────────────┐
│  Backend API    │
│  /api/currency  │ ← Caches rates for 1 hour
└────────┬────────┘
         │
         │ GET /api/currency/rates
         ↓
┌─────────────────┐
│  Frontend App   │
│  useCurrency()  │ ← Caches rates for 1 hour, auto-refresh
└─────────────────┘
```

## Security Notes

- API key is stored **only on the backend** (never exposed to frontend)
- Requests are made from server-to-server, not client-to-API
- Frontend only communicates with your own backend API
- This prevents API key exposure and unauthorized usage
