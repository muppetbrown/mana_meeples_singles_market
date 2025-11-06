// apps/web/src/services/currency/exchangeRateService.ts
import { api } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { CURRENCY_CONFIG } from '@/lib/constants';
import { z } from 'zod';

// Response schema for the exchange rate API
const ExchangeRateResponseSchema = z.object({
  success: z.boolean(),
  rates: z.record(z.number()),
  lastUpdated: z.number(),
  cached: z.boolean(),
  expiresIn: z.number(),
});

export type ExchangeRateResponse = z.infer<typeof ExchangeRateResponseSchema>;

// Currency info with rate
export interface CurrencyWithRate {
  code: string;
  symbol: string;
  name: string;
  rate: number;
}

// Cache for exchange rates
interface CachedRates {
  rates: Record<string, number>;
  lastUpdated: number;
  expiresAt: number;
}

let cachedRates: CachedRates | null = null;

/**
 * Fetches exchange rates from the API
 * Results are cached for 1 hour to minimize API calls
 */
export async function fetchExchangeRates(): Promise<ExchangeRateResponse> {
  const now = Date.now();

  // Check if we have valid cached rates
  if (cachedRates && now < cachedRates.expiresAt) {
    console.log('💾 Using cached exchange rates');
    return {
      success: true,
      rates: cachedRates.rates,
      lastUpdated: cachedRates.lastUpdated,
      cached: true,
      expiresIn: cachedRates.expiresAt - now,
    };
  }

  try {
    console.log('🌍 Fetching exchange rates from API');
    const response = await api.get<ExchangeRateResponse>(
      ENDPOINTS.CURRENCY.RATES,
      undefined,
      ExchangeRateResponseSchema
    );

    // Update cache
    cachedRates = {
      rates: response.rates,
      lastUpdated: response.lastUpdated,
      expiresAt: now + response.expiresIn,
    };

    return response;
  } catch (error) {
    console.error('❌ Failed to fetch exchange rates from API:', error);

    // If we have stale cached rates, use them as fallback
    if (cachedRates) {
      console.log('⚠️ Using stale cached rates as fallback');
      return {
        success: false,
        rates: cachedRates.rates,
        lastUpdated: cachedRates.lastUpdated,
        cached: true,
        expiresIn: 0,
      };
    }

    // If no cache, return fallback static rates
    console.log('⚠️ Using fallback static rates');
    return {
      success: false,
      rates: getFallbackRates(),
      lastUpdated: Date.now(),
      cached: false,
      expiresIn: 0,
    };
  }
}

/**
 * Gets fallback static rates (from constants)
 */
function getFallbackRates(): Record<string, number> {
  const rates: Record<string, number> = {};

  CURRENCY_CONFIG.SUPPORTED_CURRENCIES.forEach(currency => {
    rates[currency.code] = currency.rate;
  });

  return rates;
}

/**
 * Gets all supported currencies with current exchange rates
 */
export async function getSupportedCurrencies(): Promise<CurrencyWithRate[]> {
  const { rates } = await fetchExchangeRates();

  return CURRENCY_CONFIG.SUPPORTED_CURRENCIES.map(currency => ({
    ...currency,
    rate: rates[currency.code] ?? currency.rate, // Use API rate or fallback to static
  }));
}

/**
 * Gets a specific currency with current exchange rate
 */
export async function getCurrencyWithRate(code: string): Promise<CurrencyWithRate | null> {
  const currencies = await getSupportedCurrencies();
  return currencies.find(c => c.code === code) || null;
}

/**
 * Clears the exchange rate cache
 * Useful for forcing a refresh
 */
export function clearExchangeRatesCache(): void {
  cachedRates = null;
  console.log('🗑️ Exchange rates cache cleared');
}

/**
 * Manually refreshes exchange rates from the API
 */
export async function refreshExchangeRates(): Promise<ExchangeRateResponse> {
  try {
    console.log('🔄 Manually refreshing exchange rates');
    clearExchangeRatesCache();

    const response = await api.post<ExchangeRateResponse>(
      ENDPOINTS.CURRENCY.REFRESH,
      undefined,
      ExchangeRateResponseSchema
    );

    // Update cache
    cachedRates = {
      rates: response.rates,
      lastUpdated: response.lastUpdated,
      expiresAt: Date.now() + CURRENCY_CONFIG.UPDATE_INTERVAL,
    };

    return response;
  } catch (error) {
    console.error('❌ Failed to refresh exchange rates:', error);
    throw error;
  }
}
