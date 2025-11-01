// apps/web/src/features/admin/components/Cards/ScryfallPriceFetcher.tsx
import { useState, useCallback } from 'react';

// -------------------- Types --------------------

export interface ScryfallCard {
  card_id: number;
  scryfall_id: string;
  card_name: string;
  set_code: string;
  finish: 'nonfoil' | 'foil' | 'etched';
}

export interface ScryfallPriceData {
  card_id: number;
  scryfall_id: string;
  usd: number | null;
  usd_foil: number | null;
  usd_etched: number | null;
  finish: string;
  last_updated: string;
}

export interface FetchResult {
  success: ScryfallPriceData[];
  failed: {
    card_id: number;
    scryfall_id: string;
    error: string;
  }[];
}

interface UseScryfallPriceFetcherReturn {
  fetchPrices: (cards: ScryfallCard[]) => Promise<FetchResult>;
  isLoading: boolean;
  progress: {
    current: number;
    total: number;
  };
}

// -------------------- Constants --------------------

const SCRYFALL_API_BASE = 'https://api.scryfall.com';
const RATE_LIMIT_DELAY = 100; // Scryfall recommends 50-100ms between requests
const MAX_RETRIES = 3; // Maximum number of retry attempts for failed requests
const RETRY_DELAY_BASE = 1000; // Base delay for exponential backoff (1 second)
const REQUEST_TIMEOUT = 10000; // 10 second timeout for fetch requests

// -------------------- Helper Functions --------------------

/**
 * Delay execution for rate limiting
 */
const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with timeout
 * Wraps fetch with a timeout to prevent hanging requests
 */
async function fetchWithTimeout(url: string, timeoutMs: number = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - Scryfall API took too long to respond');
    }
    throw error;
  }
}

/**
 * Fetch card data from Scryfall by ID with retry logic
 * Implements exponential backoff for transient failures
 */
async function fetchCardFromScryfall(scryfallId: string): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(`${SCRYFALL_API_BASE}/cards/${scryfallId}`);

      if (!response.ok) {
        // Don't retry 404s - card doesn't exist
        if (response.status === 404) {
          throw new Error('Card not found on Scryfall');
        }

        // Don't retry 400s - bad request won't fix itself
        if (response.status === 400) {
          throw new Error(`Invalid Scryfall ID: ${scryfallId}`);
        }

        // Retry 429 (rate limit) and 5xx (server errors)
        if (response.status === 429 || response.status >= 500) {
          throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
        }

        // Other errors - don't retry
        throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Don't retry if it's a non-retryable error
      if (lastError.message.includes('not found') || lastError.message.includes('Invalid Scryfall ID')) {
        throw lastError;
      }

      // If this was the last attempt, throw the error
      if (attempt === MAX_RETRIES) {
        throw lastError;
      }

      // Calculate exponential backoff delay: 1s, 2s, 4s
      const delayMs = RETRY_DELAY_BASE * Math.pow(2, attempt);
      console.warn(`⚠️  Scryfall fetch failed for ${scryfallId} (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delayMs}ms...`, lastError.message);
      await delay(delayMs);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError || new Error('Failed to fetch from Scryfall');
}

/**
 * Safely parse a price string to a number, handling NaN cases
 * Returns null if the value is missing, empty, or invalid
 */
function safeParsePrice(priceString: string | null | undefined): number | null {
  if (!priceString) return null;
  const parsed = parseFloat(priceString);
  return !isNaN(parsed) ? parsed : null;
}

/**
 * Extract price based on finish type
 */
function extractPrice(scryfallData: any, finish: string): number | null {
  const prices = scryfallData.prices;

  if (!prices) return null;

  switch (finish.toLowerCase()) {
    case 'foil':
      return safeParsePrice(prices.usd_foil);
    case 'etched':
      return safeParsePrice(prices.usd_etched);
    case 'nonfoil':
    default:
      return safeParsePrice(prices.usd);
  }
}

// -------------------- Hook --------------------

/**
 * Hook for fetching prices from Scryfall API
 * 
 * This component handles:
 * - Individual Scryfall API calls
 * - Rate limiting (100ms between requests)
 * - Error handling per card
 * - Progress tracking
 * 
 * @example
 * const { fetchPrices, isLoading, progress } = useScryfallPriceFetcher();
 * 
 * const result = await fetchPrices([
 *   { card_id: 1, scryfall_id: 'abc-123', card_name: 'Lightning Bolt', set_code: 'DOM', finish: 'nonfoil' },
 *   { card_id: 2, scryfall_id: 'abc-123', card_name: 'Lightning Bolt', set_code: 'DOM', finish: 'foil' },
 * ]);
 */
export function useScryfallPriceFetcher(): UseScryfallPriceFetcherReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const fetchPrices = useCallback(async (cards: ScryfallCard[]): Promise<FetchResult> => {
    setIsLoading(true);
    setProgress({ current: 0, total: cards.length });

    const success: ScryfallPriceData[] = [];
    const failed: FetchResult['failed'] = [];

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];

      try {
        // Fetch card data from Scryfall
        const scryfallData = await fetchCardFromScryfall(card.scryfall_id);
        
        // Extract the appropriate price based on finish
        const price = extractPrice(scryfallData, card.finish);
        
        // Build price data object
        const priceData: ScryfallPriceData = {
          card_id: card.card_id,
          scryfall_id: card.scryfall_id,
          usd: safeParsePrice(scryfallData.prices?.usd),
          usd_foil: safeParsePrice(scryfallData.prices?.usd_foil),
          usd_etched: safeParsePrice(scryfallData.prices?.usd_etched),
          finish: card.finish,
          last_updated: new Date().toISOString(),
        };

        success.push(priceData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        failed.push({
          card_id: card.card_id,
          scryfall_id: card.scryfall_id,
          error: errorMessage,
        });

        console.error(`Failed to fetch price for card ${card.card_id} (${card.card_name}):`, errorMessage);
      }

      // Update progress
      setProgress({ current: i + 1, total: cards.length });

      // Rate limiting: wait between requests (except for the last one)
      if (i < cards.length - 1) {
        await delay(RATE_LIMIT_DELAY);
      }
    }

    setIsLoading(false);
    return { success, failed };
  }, []);

  return {
    fetchPrices,
    isLoading,
    progress,
  };
}

export default useScryfallPriceFetcher;
