// apps/web/src/features/admin/components/Cards/SingleCardPriceRefresh.tsx
import React, { useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useScryfallPriceFetcher } from './ScryfallPriceFetcher.js';
import type { ScryfallCard, ScryfallPriceData } from './ScryfallPriceFetcher.js';

import { api, ENDPOINTS } from '@/lib/api';

// -------------------- Types --------------------

export interface Card {
  id: number;
  name: string;
  set_name: string;
  set_id: number;
  scryfall_id: string | null;
  finish: string;
  price?: number;
}

interface SingleCardPriceRefreshProps {
  card: Card;
  onRefreshComplete?: (success: boolean, updatedCount: number) => void;
  className?: string;
  variant?: 'button' | 'icon'; // Display as full button or just icon
}

interface RefreshResult {
  success: boolean;
  updated: number;
  failed: number;
  message: string;
}

// -------------------- Component --------------------

/**
 * Single Card Price Refresh Component
 * 
 * Button 3: Refreshes prices for a specific card and all its variations
 * - Fetches ALL finish types (foil/nonfoil/etched) for this card
 * - Updates both card_pricing AND all card_inventory records
 * - Works even if quantity = 0
 * 
 * @example
 * // In AddToInventory modal:
 * <SingleCardPriceRefresh 
 *   card={selectedCard}
 *   onRefreshComplete={(success, count) => {
 *     if (success) {
 *       toast.success(`Updated ${count} variations`);
 *       refetchCardData();
 *     }
 *   }}
 *   variant="button"
 * />
 */
export const SingleCardPriceRefresh: React.FC<SingleCardPriceRefreshProps> = ({
  card,
  onRefreshComplete,
  className = '',
  variant = 'button',
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'fetching' | 'updating' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<RefreshResult | null>(null);
  
  const { fetchPrices } = useScryfallPriceFetcher();

  /**
   * Fetch all variations of this card from backend
   */
  const fetchCardVariations = async (): Promise<Card[]> => {
    try {
      const response = await api.get<{ cards: Card[] }>(
        `${ENDPOINTS.ADMIN.CARD_VARIATIONS}/${card.id}`
      );
      return response.cards;
    } catch (error) {
      console.error('Failed to fetch card variations:', error);
      throw new Error('Failed to fetch card variations');
    }
  };

  /**
   * Update prices for this specific card
   */
  const updateCardPrices = async (priceData: ScryfallPriceData[]): Promise<RefreshResult> => {
    try {
      const response = await api.post<any>(ENDPOINTS.ADMIN.REFRESH_CARD_PRICE, {
        prices: priceData,
        price_source: 'scryfall',
      });
      
      return {
        success: true,
        updated: response.updated,
        failed: response.failed,
        message: `Updated ${response.updated} variation${response.updated !== 1 ? 's' : ''}`,
      };
    } catch (error) {
      console.error('Failed to update card prices:', error);
      return {
        success: false,
        updated: 0,
        failed: 1,
        message: 'Failed to update prices',
      };
    }
  };

  /**
   * Main refresh handler
   */
  const handleRefresh = async (): Promise<void> => {
    if (!card.scryfall_id) {
      setStatus('error');
      setResult({
        success: false,
        updated: 0,
        failed: 1,
        message: 'This card has no Scryfall ID',
      });
      return;
    }

    try {
      setIsRefreshing(true);
      setStatus('fetching');
      setResult(null);

      // Fetch all variations of this card
      const variations = await fetchCardVariations();

      if (variations.length === 0) {
        throw new Error('No card variations found');
      }

      // Convert to Scryfall card format
      const scryfallCards: ScryfallCard[] = variations
        .filter(v => v.scryfall_id)
        .map(v => ({
          card_id: v.id,
          scryfall_id: v.scryfall_id as string,
          card_name: v.name,
          set_code: v.set_name,
          finish: v.finish.toLowerCase() as 'nonfoil' | 'foil' | 'etched',
        }));

      // Fetch prices from Scryfall
      const fetchResult = await fetchPrices(scryfallCards);

      if (fetchResult.success.length === 0) {
        throw new Error('No prices found for this card');
      }

      // Update prices in database
      setStatus('updating');
      const updateResult = await updateCardPrices(fetchResult.success);

      setResult(updateResult);
      setStatus(updateResult.success ? 'success' : 'error');

      // Notify parent component
      if (onRefreshComplete) {
        onRefreshComplete(updateResult.success, updateResult.updated);
      }

      // Auto-reset status after 3 seconds
      if (updateResult.success) {
        setTimeout(() => {
          setStatus('idle');
          setResult(null);
        }, 3000);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      setResult({
        success: false,
        updated: 0,
        failed: 1,
        message,
      });
      setStatus('error');
      console.error('Single card price refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Render icon-only variant
  if (variant === 'icon') {
    return (
      <button
        onClick={handleRefresh}
        disabled={isRefreshing || !card.scryfall_id}
        className={`
          p-2 rounded-lg transition-colors relative
          ${!card.scryfall_id
            ? 'text-slate-300 cursor-not-allowed'
            : status === 'success'
            ? 'text-green-600 bg-green-50'
            : status === 'error'
            ? 'text-red-600 bg-red-50'
            : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
          }
          ${className}
        `}
        title={
          !card.scryfall_id
            ? 'No Scryfall ID'
            : isRefreshing
            ? 'Refreshing prices...'
            : 'Refresh price for this card'
        }
        aria-label="Refresh card price"
      >
        {status === 'success' ? (
          <CheckCircle className="w-4 h-4" />
        ) : status === 'error' ? (
          <XCircle className="w-4 h-4" />
        ) : (
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        )}
      </button>
    );
  }

  // Render full button variant
  return (
    <div className={className}>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing || !card.scryfall_id}
        className={`
          flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all w-full
          ${!card.scryfall_id
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : status === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : status === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : isRefreshing
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 hover:border-blue-300'
          }
        `}
        aria-label="Refresh price for this card"
      >
        {status === 'success' ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>Price Updated</span>
          </>
        ) : status === 'error' ? (
          <>
            <XCircle className="w-4 h-4" />
            <span>Update Failed</span>
          </>
        ) : (
          <>
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Price'}</span>
          </>
        )}
      </button>

      {/* Status Message */}
      {result && status !== 'idle' && (
        <div className={`
          mt-2 text-xs px-3 py-2 rounded-lg flex items-start gap-2
          ${status === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
          }
        `}>
          {status === 'success' ? (
            <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      {/* Help Text */}
      {!card.scryfall_id && (
        <p className="mt-2 text-xs text-slate-500">
          This card has no Scryfall ID and cannot be refreshed
        </p>
      )}
    </div>
  );
};

export default SingleCardPriceRefresh;