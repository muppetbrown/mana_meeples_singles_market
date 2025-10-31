// apps/web/src/features/admin/components/PriceManagementHeaderButtons.tsx
import React, { useState, useCallback } from 'react';
import { Zap, Package, RefreshCw } from 'lucide-react';
import { useScryfallPriceFetcher } from './Cards/ScryfallPriceFetcher.js';
import type { ScryfallCard, ScryfallPriceData } from './Cards/ScryfallPriceFetcher.js';
import { api, ENDPOINTS } from '@/lib/api';

// -------------------- Types --------------------

interface PriceUpdateResult {
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

interface PriceManagementHeaderButtonsProps {
  onOperationComplete?: (result: PriceUpdateResult, buttonType: string) => void;
}

type ButtonType = 'initialize' | 'refresh-inventory' | 'idle';

const BATCH_SIZE = 50;

// -------------------- Component --------------------

/**
 * Compact Price Management Buttons for Dashboard Header
 * Provides Initialize Prices and Refresh Inventory operations
 */
export const PriceManagementHeaderButtons: React.FC<PriceManagementHeaderButtonsProps> = ({
  onOperationComplete,
}) => {
  const [activeButton, setActiveButton] = useState<ButtonType>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { fetchPrices, isLoading: isFetchingPrices } = useScryfallPriceFetcher();

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
   * Fetch all cards from backend with pagination support
   */
  const fetchAllCards = async (): Promise<ScryfallCard[]> => {
    try {
      const allCards: any[] = [];
      let page = 1;
      const perPage = 1000; // Maximum allowed by backend
      let hasMore = true;

      // Fetch cards in pages until we get all of them
      while (hasMore) {
        const response = await api.get<{ cards: any[] }>(ENDPOINTS.CARDS.LIST, {
          page,
          per_page: perPage
        });

        if (response.cards && response.cards.length > 0) {
          allCards.push(...response.cards);
          hasMore = response.cards.length === perPage; // If we got less than perPage, we're done
          page++;
        } else {
          hasMore = false;
        }
      }

      return allCards
        .filter(card => card.scryfall_id !== null)
        .map(card => ({
          card_id: card.id,
          scryfall_id: card.scryfall_id as string,
          card_name: card.name,
          set_code: card.set_name,
          finish: card.finish?.toLowerCase() as 'nonfoil' | 'foil' | 'etched',
        }));
    } catch (error) {
      console.error('Failed to fetch cards:', error);
      return [];
    }
  };

  /**
   * Main refresh handler
   */
  const handleRefresh = async (buttonType: ButtonType, endpoint: string): Promise<void> => {
    try {
      setActiveButton(buttonType);
      setErrorMessage(null);

      // Fetch all cards
      const eligibleCards = await fetchAllCards();

      if (eligibleCards.length === 0) {
        setErrorMessage('No cards found with Scryfall IDs.');
        setActiveButton('idle');
        return;
      }

      // Process cards in batches
      const allSuccessfulPrices: ScryfallPriceData[] = [];
      const allFailures: Array<{ card_id: number; error: string }> = [];

      for (let i = 0; i < eligibleCards.length; i += BATCH_SIZE) {
        const batch = eligibleCards.slice(i, i + BATCH_SIZE);
        const fetchResult = await fetchPrices(batch);

        allSuccessfulPrices.push(...fetchResult.success);
        allFailures.push(...fetchResult.failed);
      }

      // Update prices in database
      const updateResult = await updatePricesInDatabase(allSuccessfulPrices, endpoint);

      // Set final result
      const finalResult: PriceUpdateResult = {
        ...updateResult,
        failed: allFailures.length,
      };

      // Notify parent component
      if (onOperationComplete) {
        onOperationComplete(finalResult, buttonType);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      setErrorMessage(message);
      console.error('Price refresh failed:', error);
      alert(`❌ Price operation failed: ${message}`);
    } finally {
      setTimeout(() => setActiveButton('idle'), 2000);
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

  return (
    <div className="flex items-center gap-2">
      {/* Initialize Prices Button */}
      <button
        onClick={handleInitializePrices}
        disabled={isRefreshing}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all
          text-sm border
          ${activeButton === 'initialize'
            ? 'bg-blue-50 border-blue-500 text-blue-700'
            : isRefreshing
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50'
          }
        `}
        aria-label="Initialize prices for cards without pricing"
        title="Create pricing for cards without price data"
      >
        {activeButton === 'initialize' ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
        <span className="hidden lg:inline">Initialize Prices</span>
      </button>

      {/* Refresh Inventory Button */}
      <button
        onClick={handleRefreshInventory}
        disabled={isRefreshing}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all
          text-sm border
          ${activeButton === 'refresh-inventory'
            ? 'bg-green-50 border-green-500 text-green-700'
            : isRefreshing
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-white border-green-200 text-green-700 hover:bg-green-50'
          }
        `}
        aria-label="Refresh prices for inventory cards"
        title="Update prices for cards in stock"
      >
        {activeButton === 'refresh-inventory' ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Package className="w-4 h-4" />
        )}
        <span className="hidden lg:inline">Refresh Inventory</span>
      </button>
    </div>
  );
};

export default PriceManagementHeaderButtons;
