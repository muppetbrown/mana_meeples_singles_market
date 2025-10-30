// apps/web/src/features/admin/components/Cards/PriceRefreshManager.tsx
import React, { useState, useCallback } from 'react';
import { RefreshCw, DollarSign, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useScryfallPriceFetcher } from './ScryfallPriceFetcher.js';
import type { ScryfallCard, ScryfallPriceData } from './ScryfallPriceFetcher.js';

import { api, ENDPOINTS } from '@/lib/api';

// -------------------- Types --------------------

export interface Card {
  id: number;
  name: string;
  set_name: string;
  scryfall_id: string | null;
  finish: string;
  price?: number;
  price_source?: string;
}

export interface PriceUpdateResult {
  total: number;
  updated: number;
  skipped: number;
  failed: number;
  details: {
    updated_card_pricing: number;
    updated_inventory: number;
  };
}

interface PriceRefreshManagerProps {
  cards: Card[];
  onRefreshComplete?: (result: PriceUpdateResult) => void;
  className?: string;
}

// -------------------- Constants --------------------

const BATCH_SIZE = 50; // Process 50 cards at a time to manage memory

// -------------------- Component --------------------

/**
 * Price Refresh Manager Component
 * 
 * This is the parent component that orchestrates the entire price refresh process:
 * 1. Filters cards that have scryfall_ids and price_source='scryfall'
 * 2. Batches cards for processing
 * 3. Delegates API calls to ScryfallPriceFetcher
 * 4. Sends price updates to the backend API
 * 5. Displays progress and results to the user
 * 
 * @example
 * <PriceRefreshManager 
 *   cards={allCards}
 *   onRefreshComplete={(result) => console.log('Refresh complete:', result)}
 * />
 */
export const PriceRefreshManager: React.FC<PriceRefreshManagerProps> = ({
  cards,
  onRefreshComplete,
  className = '',
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'fetching' | 'updating' | 'complete' | 'error'>('idle');
  const [result, setResult] = useState<PriceUpdateResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { fetchPrices, isLoading: isFetchingPrices, progress } = useScryfallPriceFetcher();

  /**
   * Filter cards that are eligible for Scryfall price updates
   */
  const getEligibleCards = useCallback((): ScryfallCard[] => {
    return cards
      .filter(card => {
        // Must have a scryfall_id
        if (!card.scryfall_id) return false;
        
        // Check if any related pricing/inventory has price_source='scryfall'
        // For now, we'll include all cards with scryfall_id
        // The backend will handle the price_source check
        return true;
      })
      .map(card => ({
        card_id: card.id,
        scryfall_id: card.scryfall_id as string,
        card_name: card.name,
        set_code: card.set_name, // You may want to map this to actual set code
        finish: card.finish.toLowerCase() as 'nonfoil' | 'foil' | 'etched',
      }));
  }, [cards]);

  /**
   * Send price updates to the backend API
   */
  const updatePricesInDatabase = async (priceData: ScryfallPriceData[]): Promise<PriceUpdateResult> => {
    try {
      const response = await api.post<PriceUpdateResult>(ENDPOINTS.ADMIN.UPDATE_PRICES, {
        prices: priceData,
      });
      
      return response;
    } catch (error) {
      console.error('Failed to update prices in database:', error);
      throw new Error('Failed to update prices in database');
    }
  };

  /**
   * Main refresh handler
   */
  const handleRefresh = async (): Promise<void> => {
    try {
      setIsRefreshing(true);
      setStatus('fetching');
      setErrorMessage(null);
      setResult(null);

      // Get cards eligible for price refresh
      const eligibleCards = getEligibleCards();

      if (eligibleCards.length === 0) {
        setErrorMessage('No cards found with Scryfall IDs. Please ensure cards are imported with Scryfall data.');
        setStatus('error');
        setIsRefreshing(false);
        return;
      }

      // Process cards in batches to manage memory and API rate limits
      const allSuccessfulPrices: ScryfallPriceData[] = [];
      const allFailures: Array<{ card_id: number; error: string }> = [];

      for (let i = 0; i < eligibleCards.length; i += BATCH_SIZE) {
        const batch = eligibleCards.slice(i, i + BATCH_SIZE);
        
        // Fetch prices from Scryfall
        const fetchResult = await fetchPrices(batch);
        
        allSuccessfulPrices.push(...fetchResult.success);
        allFailures.push(...fetchResult.failed);
      }

      // Update prices in database
      setStatus('updating');
      const updateResult = await updatePricesInDatabase(allSuccessfulPrices);

      // Set final result
      const finalResult: PriceUpdateResult = {
        ...updateResult,
        failed: allFailures.length,
      };

      setResult(finalResult);
      setStatus('complete');

      // Notify parent component
      if (onRefreshComplete) {
        onRefreshComplete(finalResult);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      setErrorMessage(message);
      setStatus('error');
      console.error('Price refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Calculate eligible cards count
   */
  const eligibleCount = getEligibleCards().length;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Scryfall Price Refresh</h3>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || eligibleCount === 0}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
            ${isRefreshing || eligibleCount === 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
          aria-label="Refresh prices from Scryfall"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Prices'}
        </button>
      </div>

      {/* Info */}
      <div className="mb-4 text-sm text-slate-600">
        <p>
          Updates prices from Scryfall for cards with <code className="px-1 py-0.5 bg-slate-100 rounded">price_source='scryfall'</code>.
        </p>
        <p className="mt-1">
          <strong>{eligibleCount}</strong> card{eligibleCount !== 1 ? 's' : ''} eligible for update
          {cards.length > eligibleCount && (
            <span className="text-slate-500">
              {' '}({cards.length - eligibleCount} skipped - no Scryfall ID)
            </span>
          )}
        </p>
      </div>

      {/* Progress Bar */}
      {isRefreshing && status === 'fetching' && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span>Fetching prices from Scryfall...</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Updating Status */}
      {status === 'updating' && (
        <div className="flex items-center gap-2 text-sm text-blue-600 mb-4">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Updating database...</span>
        </div>
      )}

      {/* Results */}
      {status === 'complete' && result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-2">Price Refresh Complete</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-green-800">
                <div>
                  <span className="font-medium">Total Processed:</span> {result.total}
                </div>
                <div>
                  <span className="font-medium">Updated:</span> {result.updated}
                </div>
                <div>
                  <span className="font-medium">Skipped:</span> {result.skipped}
                </div>
                <div>
                  <span className="font-medium">Failed:</span> {result.failed}
                </div>
              </div>
              {result.details && (
                <div className="mt-3 pt-3 border-t border-green-200 text-sm text-green-800">
                  <div><span className="font-medium">Card Pricing Table:</span> {result.details.updated_card_pricing} updated</div>
                  <div><span className="font-medium">Inventory Table:</span> {result.details.updated_inventory} updated</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">Price Refresh Failed</h4>
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Warning if no eligible cards */}
      {!isRefreshing && eligibleCount === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 mb-1">No Cards Available</h4>
              <p className="text-sm text-amber-800">
                No cards found with Scryfall IDs. Import cards from Scryfall to enable price updates.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceRefreshManager;
