// apps/web/src/features/admin/components/Cards/PriceRefreshButtons.tsx
import React, { useState, useCallback } from 'react';
import { RefreshCw, DollarSign, AlertCircle, CheckCircle, XCircle, Package, Zap } from 'lucide-react';
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
    created_card_pricing: number;
    updated_card_pricing: number;
    updated_inventory: number;
  };
}

interface PriceRefreshButtonsProps {
  cards: Card[];
  onRefreshComplete?: (result: PriceUpdateResult, buttonType: string) => void;
  className?: string;
}

type ButtonType = 'initialize' | 'refresh-inventory' | 'idle';
type RefreshStatus = 'idle' | 'fetching' | 'updating' | 'complete' | 'error';

// -------------------- Constants --------------------

const BATCH_SIZE = 50;

// -------------------- Component --------------------

/**
 * Price Refresh Buttons Component
 * 
 * Provides 3 distinct price refresh operations:
 * 1. Initialize Prices - Create pricing for cards without any pricing records
 * 2. Refresh Inventory Prices - Update prices for cards currently in stock
 * 3. (Per-card refresh button is in the AddToInventory modal)
 * 
 * @example
 * <PriceRefreshButtons 
 *   cards={allCards}
 *   onRefreshComplete={(result, type) => console.log('Refresh complete:', type, result)}
 * />
 */
export const PriceRefreshButtons: React.FC<PriceRefreshButtonsProps> = ({
  cards,
  onRefreshComplete,
  className = '',
}) => {
  const [activeButton, setActiveButton] = useState<ButtonType>('idle');
  const [status, setStatus] = useState<RefreshStatus>('idle');
  const [result, setResult] = useState<PriceUpdateResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { fetchPrices, isLoading: isFetchingPrices, progress } = useScryfallPriceFetcher();

  /**
   * Get cards eligible for each button type
   */
  const getEligibleCards = useCallback((buttonType: ButtonType): ScryfallCard[] => {
    return cards
      .filter(card => card.scryfall_id !== null)
      .map(card => ({
        card_id: card.id,
        scryfall_id: card.scryfall_id as string,
        card_name: card.name,
        set_code: card.set_name,
        finish: card.finish.toLowerCase() as 'nonfoil' | 'foil' | 'etched',
      }));
  }, [cards]);

  /**
   * Send price updates to the backend API
   */
  const updatePricesInDatabase = async (
    priceData: ScryfallPriceData[], 
    endpoint: string
  ): Promise<PriceUpdateResult> => {
    try {
      const response = await api.post<PriceUpdateResult>(endpoint, {
        prices: priceData,
        price_source: 'scryfall',
      });
      
      return response;
    } catch (error) {
      console.error('Failed to update prices in database:', error);
      throw new Error('Failed to update prices in database');
    }
  };

  /**
   * Fetch cards without pricing from backend
   */
  const fetchCardsWithoutPricing = async (): Promise<number> => {
    try {
      const response = await api.get<{ cards: any[]; count: number }>(
        ENDPOINTS.ADMIN.CARDS_WITHOUT_PRICING
      );
      return response.count;
    } catch (error) {
      console.error('Failed to fetch cards without pricing:', error);
      return 0;
    }
  };

  /**
   * Fetch inventory cards from backend
   */
  const fetchInventoryCards = async (): Promise<number> => {
    try {
      const response = await api.get<{ cards: any[]; count: number }>(
        ENDPOINTS.ADMIN.INVENTORY_CARDS
      );
      return response.count;
    } catch (error) {
      console.error('Failed to fetch inventory cards:', error);
      return 0;
    }
  };

  /**
   * Main refresh handler
   */
  const handleRefresh = async (buttonType: ButtonType, endpoint: string): Promise<void> => {
    try {
      setActiveButton(buttonType);
      setStatus('fetching');
      setErrorMessage(null);
      setResult(null);

      // Get cards eligible for price refresh
      const eligibleCards = getEligibleCards(buttonType);

      if (eligibleCards.length === 0) {
        setErrorMessage('No cards found with Scryfall IDs. Please ensure cards are imported with Scryfall data.');
        setStatus('error');
        setActiveButton('idle');
        return;
      }

      // Process cards in batches
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
      const updateResult = await updatePricesInDatabase(allSuccessfulPrices, endpoint);

      // Set final result
      const finalResult: PriceUpdateResult = {
        ...updateResult,
        failed: allFailures.length,
      };

      setResult(finalResult);
      setStatus('complete');

      // Notify parent component
      if (onRefreshComplete) {
        onRefreshComplete(finalResult, buttonType);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      setErrorMessage(message);
      setStatus('error');
      console.error('Price refresh failed:', error);
    } finally {
      setTimeout(() => setActiveButton('idle'), 3000); // Reset after 3 seconds
    }
  };

  /**
   * Button 1: Initialize Prices
   */
  const handleInitializePrices = () => {
    handleRefresh('initialize', ENDPOINTS.ADMIN.INITIALIZE_PRICES);
  };

  /**
   * Button 2: Refresh Inventory Prices
   */
  const handleRefreshInventory = () => {
    handleRefresh('refresh-inventory', ENDPOINTS.ADMIN.REFRESH_INVENTORY_PRICES);
  };

  const isRefreshing = activeButton !== 'idle';
  const eligibleCount = cards.filter(c => c.scryfall_id !== null).length;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-900">Price Management</h3>
      </div>

      {/* Info */}
      <div className="mb-6 text-sm text-slate-600 bg-slate-50 rounded-lg p-4">
        <p className="font-medium text-slate-700 mb-2">Available Actions:</p>
        <ul className="space-y-1 ml-4">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span><strong>Initialize Prices:</strong> Create pricing for cards that have no price data yet</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">2.</span>
            <span><strong>Refresh Inventory:</strong> Update prices for cards currently in stock</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">3.</span>
            <span><strong>Per-Card Refresh:</strong> Available in the "Add to Inventory" modal for individual cards</span>
          </li>
        </ul>
        <p className="mt-3 text-slate-500">
          <strong>{eligibleCount}</strong> card{eligibleCount !== 1 ? 's' : ''} with Scryfall IDs available for pricing operations
        </p>
      </div>

      {/* Button Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Button 1: Initialize Prices */}
        <button
          onClick={handleInitializePrices}
          disabled={isRefreshing || eligibleCount === 0}
          className={`
            flex items-center gap-3 px-6 py-4 rounded-lg font-medium transition-all
            border-2 text-left
            ${activeButton === 'initialize'
              ? 'bg-blue-50 border-blue-500 text-blue-700'
              : isRefreshing || eligibleCount === 0
              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-400'
            }
          `}
          aria-label="Initialize prices for cards without pricing"
        >
          <Zap className={`w-5 h-5 flex-shrink-0 ${activeButton === 'initialize' ? 'animate-pulse' : ''}`} />
          <div className="flex-1">
            <div className="font-semibold">Initialize Prices</div>
            <div className="text-xs mt-1 opacity-80">
              Create pricing for cards without price data
            </div>
          </div>
          {activeButton === 'initialize' && (
            <RefreshCw className="w-4 h-4 animate-spin" />
          )}
        </button>

        {/* Button 2: Refresh Inventory Prices */}
        <button
          onClick={handleRefreshInventory}
          disabled={isRefreshing || eligibleCount === 0}
          className={`
            flex items-center gap-3 px-6 py-4 rounded-lg font-medium transition-all
            border-2 text-left
            ${activeButton === 'refresh-inventory'
              ? 'bg-green-50 border-green-500 text-green-700'
              : isRefreshing || eligibleCount === 0
              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-white border-green-200 text-green-700 hover:bg-green-50 hover:border-green-400'
            }
          `}
          aria-label="Refresh prices for inventory cards"
        >
          <Package className={`w-5 h-5 flex-shrink-0 ${activeButton === 'refresh-inventory' ? 'animate-pulse' : ''}`} />
          <div className="flex-1">
            <div className="font-semibold">Refresh Inventory</div>
            <div className="text-xs mt-1 opacity-80">
              Update prices for cards in stock
            </div>
          </div>
          {activeButton === 'refresh-inventory' && (
            <RefreshCw className="w-4 h-4 animate-spin" />
          )}
        </button>
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
              <h4 className="font-semibold text-green-900 mb-2">Price Operation Complete</h4>
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
                <div className="mt-3 pt-3 border-t border-green-200 text-sm text-green-800 space-y-1">
                  {result.details.created_card_pricing > 0 && (
                    <div><span className="font-medium">Created Pricing Records:</span> {result.details.created_card_pricing}</div>
                  )}
                  {result.details.updated_card_pricing > 0 && (
                    <div><span className="font-medium">Updated Pricing Records:</span> {result.details.updated_card_pricing}</div>
                  )}
                  {result.details.updated_inventory > 0 && (
                    <div><span className="font-medium">Updated Inventory Records:</span> {result.details.updated_inventory}</div>
                  )}
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
              <h4 className="font-semibold text-red-900 mb-1">Price Operation Failed</h4>
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
                No cards found with Scryfall IDs. Import cards from Scryfall to enable price operations.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceRefreshButtons;