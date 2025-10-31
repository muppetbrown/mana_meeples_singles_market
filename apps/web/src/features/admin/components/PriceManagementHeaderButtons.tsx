// apps/web/src/features/admin/components/PriceManagementHeaderButtons.tsx
import React, { useState } from 'react';
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
   * Fetch cards for Initialize Prices (Button 1)
   * Uses dedicated endpoint that returns cards without pricing
   */
  const fetchCardsWithoutPricing = async (): Promise<ScryfallCard[]> => {
    try {
      const response = await api.get<{ cards: any[] }>(
        ENDPOINTS.ADMIN.CARDS_WITHOUT_PRICING
      );

      if (!response.cards || response.cards.length === 0) {
        console.log('ℹ️  No cards found without pricing');
        return [];
      }

      console.log(`✅ Found ${response.cards.length} cards without pricing`);

      // The backend returns the exact structure we need
      return response.cards.map(card => ({
        card_id: card.card_id,
        scryfall_id: card.scryfall_id,
        card_name: card.name,
        set_code: card.set_code || card.set_name,
        finish: card.finish?.toLowerCase() as 'nonfoil' | 'foil' | 'etched',
      }));
    } catch (error) {
      console.error('Failed to fetch cards without pricing:', error);
      return [];
    }
  };

  /**
   * Fetch cards for Refresh Inventory (Button 2)
   * Uses dedicated endpoint that returns inventory cards
   */
  const fetchInventoryCards = async (): Promise<ScryfallCard[]> => {
    try {
      const response = await api.get<{ cards: any[] }>(
        ENDPOINTS.ADMIN.INVENTORY_CARDS
      );

      if (!response.cards || response.cards.length === 0) {
        console.log('ℹ️  No inventory cards found');
        return [];
      }

      console.log(`✅ Found ${response.cards.length} inventory cards`);

      // The backend returns the exact structure we need
      return response.cards.map(card => ({
        card_id: card.card_id,
        scryfall_id: card.scryfall_id,
        card_name: card.name,
        set_code: card.set_code || card.set_name,
        finish: card.finish?.toLowerCase() as 'nonfoil' | 'foil' | 'etched',
      }));
    } catch (error) {
      console.error('Failed to fetch inventory cards:', error);
      return [];
    }
  };

  /**
   * Main refresh handler
   */
  const handleRefresh = async (
    buttonType: ButtonType,
    endpoint: string,
    fetchCardsFn: () => Promise<ScryfallCard[]>
  ): Promise<void> => {
    try {
      setActiveButton(buttonType);
      setErrorMessage(null);

      console.log(`🔄 Starting ${buttonType} operation...`);

      // Fetch cards using the appropriate function
      const eligibleCards = await fetchCardsFn();

      if (eligibleCards.length === 0) {
        setErrorMessage('No eligible cards found.');
        setActiveButton('idle');
        return;
      }

      console.log(`📦 Processing ${eligibleCards.length} cards in batches of ${BATCH_SIZE}...`);

      // Process cards in batches
      const allSuccessfulPrices: ScryfallPriceData[] = [];
      const allFailures: Array<{ card_id: number; error: string }> = [];

      for (let i = 0; i < eligibleCards.length; i += BATCH_SIZE) {
        const batch = eligibleCards.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(eligibleCards.length / BATCH_SIZE);
        
        console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} cards)...`);
        
        const fetchResult = await fetchPrices(batch);

        allSuccessfulPrices.push(...fetchResult.success);
        allFailures.push(...fetchResult.failed);
        
        console.log(`  ✅ Success: ${fetchResult.success.length}, ❌ Failed: ${fetchResult.failed.length}`);
      }

      console.log(`\n📊 Final Results:`);
      console.log(`  ✅ Successfully fetched: ${allSuccessfulPrices.length} prices`);
      console.log(`  ❌ Failed to fetch: ${allFailures.length} prices`);

      // Update prices in database
      if (allSuccessfulPrices.length > 0) {
        console.log(`💾 Updating prices in database...`);
        const updateResult = await updatePricesInDatabase(allSuccessfulPrices, endpoint);

        // Set final result
        const finalResult: PriceUpdateResult = {
          ...updateResult,
          failed: updateResult.failed + allFailures.length, // Include Scryfall fetch failures
        };

        console.log(`✅ Database update complete:`, finalResult);

        // Notify parent component
        if (onOperationComplete) {
          onOperationComplete(finalResult, buttonType);
        }
      } else {
        setErrorMessage('No prices were successfully fetched from Scryfall.');
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      setErrorMessage(message);
      console.error(`❌ ${buttonType} operation failed:`, error);
      alert(`❌ Price operation failed: ${message}`);
    } finally {
      setTimeout(() => setActiveButton('idle'), 2000);
    }
  };

  /**
   * Button 1: Initialize Prices
   * Fetches cards without pricing and creates initial price records
   */
  const handleInitializePrices = () => {
    handleRefresh(
      'initialize',
      ENDPOINTS.ADMIN.INITIALIZE_PRICES,
      fetchCardsWithoutPricing
    );
  };

  /**
   * Button 2: Refresh Inventory Prices
   * Fetches inventory cards and updates their prices
   */
  const handleRefreshInventory = () => {
    handleRefresh(
      'refresh-inventory',
      ENDPOINTS.ADMIN.REFRESH_INVENTORY_PRICES,
      fetchInventoryCards
    );
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

      {/* Error Display */}
      {errorMessage && (
        <div className="ml-2 text-sm text-red-600">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default PriceManagementHeaderButtons;