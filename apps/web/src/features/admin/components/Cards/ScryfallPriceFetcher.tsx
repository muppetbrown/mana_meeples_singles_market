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

// -------------------- Helper Functions --------------------

/**
 * Delay execution for rate limiting
 */
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch card data from Scryfall by ID
 */
async function fetchCardFromScryfall(scryfallId: string): Promise<any> {
  const response = await fetch(`${SCRYFALL_API_BASE}/cards/${scryfallId}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Card not found on Scryfall');
    }
    throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Extract price based on finish type
 */
function extractPrice(scryfallData: any, finish: string): number | null {
  const prices = scryfallData.prices;
  
  if (!prices) return null;
  
  switch (finish.toLowerCase()) {
    case 'foil':
      return prices.usd_foil ? parseFloat(prices.usd_foil) : null;
    case 'etched':
      return prices.usd_etched ? parseFloat(prices.usd_etched) : null;
    case 'nonfoil':
    default:
      return prices.usd ? parseFloat(prices.usd) : null;
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
          usd: scryfallData.prices?.usd ? parseFloat(scryfallData.prices.usd) : null,
          usd_foil: scryfallData.prices?.usd_foil ? parseFloat(scryfallData.prices.usd_foil) : null,
          usd_etched: scryfallData.prices?.usd_etched ? parseFloat(scryfallData.prices.usd_etched) : null,
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
