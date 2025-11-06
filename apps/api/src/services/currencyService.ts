// apps/api/src/services/currencyService.ts
import * as dotenv from "dotenv";
dotenv.config();

interface ExchangeRateResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: {
    [key: string]: number;
  };
}

interface CachedRates {
  rates: {
    [key: string]: number;
  };
  lastUpdated: number;
  expiresAt: number;
}

let cachedRates: CachedRates | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const BASE_CURRENCY = 'NZD'; // Base currency for the shop
const SUPPORTED_CURRENCIES = ['NZD', 'USD', 'AUD', 'EUR', 'GBP'];

/**
 * Fetches exchange rates from exchangerate-api.com
 * Uses NZD as the base currency
 */
async function fetchExchangeRates(): Promise<{ [key: string]: number }> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ EXCHANGE_RATE_API_KEY not configured, using fallback static rates');
    return getFallbackRates();
  }

  try {
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${BASE_CURRENCY}`;
    console.log(`🌍 Fetching exchange rates from API for base currency: ${BASE_CURRENCY}`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Exchange rate API returned status ${response.status}`);
    }

    const data: ExchangeRateResponse = await response.json();

    if (data.result !== 'success') {
      throw new Error('Exchange rate API returned unsuccessful result');
    }

    // Extract only the currencies we support
    const rates: { [key: string]: number } = {};
    for (const currency of SUPPORTED_CURRENCIES) {
      if (data.conversion_rates[currency]) {
        rates[currency] = data.conversion_rates[currency];
      }
    }

    console.log('✅ Exchange rates fetched successfully:', rates);
    return rates;
  } catch (error: unknown) {
    console.error(
      '❌ Failed to fetch exchange rates:',
      error instanceof Error ? error.message : String(error)
    );
    console.log('Using fallback static rates');
    return getFallbackRates();
  }
}

/**
 * Fallback static rates if API fails or is not configured
 * These are approximate rates from January 2024
 */
function getFallbackRates(): { [key: string]: number } {
  return {
    NZD: 1.0,
    USD: 0.61,
    AUD: 0.92,
    EUR: 0.55,
    GBP: 0.48,
  };
}

/**
 * Gets exchange rates with caching
 * Rates are cached for 1 hour to reduce API calls
 */
export async function getExchangeRates(): Promise<{
  rates: { [key: string]: number };
  lastUpdated: number;
  cached: boolean;
}> {
  const now = Date.now();

  // Check if we have valid cached rates
  if (cachedRates && now < cachedRates.expiresAt) {
    console.log('💾 Using cached exchange rates');
    return {
      rates: cachedRates.rates,
      lastUpdated: cachedRates.lastUpdated,
      cached: true,
    };
  }

  // Fetch fresh rates
  const rates = await fetchExchangeRates();

  // Update cache
  cachedRates = {
    rates,
    lastUpdated: now,
    expiresAt: now + CACHE_DURATION,
  };

  return {
    rates,
    lastUpdated: now,
    cached: false,
  };
}

/**
 * Gets a specific currency pair rate
 * @param from - Source currency code (e.g., 'NZD')
 * @param to - Target currency code (e.g., 'USD')
 */
export async function getExchangeRate(from: string, to: string): Promise<number | null> {
  const { rates } = await getExchangeRates();

  // If both currencies are the same, rate is 1
  if (from === to) {
    return 1.0;
  }

  // If from is our base currency (NZD), we have the direct rate
  if (from === BASE_CURRENCY && rates[to]) {
    return rates[to];
  }

  // If to is our base currency, we need to invert
  if (to === BASE_CURRENCY && rates[from]) {
    return 1 / rates[from];
  }

  // For cross rates (e.g., USD to EUR), we need to convert through base
  if (rates[from] && rates[to]) {
    // Convert from -> NZD -> to
    const fromToBase = 1 / rates[from];
    const baseToTarget = rates[to];
    return fromToBase * baseToTarget;
  }

  console.warn(`⚠️ Exchange rate not available for ${from} to ${to}`);
  return null;
}

/**
 * Clears the cached exchange rates
 * Useful for testing or forcing a refresh
 */
export function clearExchangeRatesCache(): void {
  cachedRates = null;
  console.log('🗑️ Exchange rates cache cleared');
}
