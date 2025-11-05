// apps/web/src/shared/card/CardItem.tsx
/**
 * Card Item Component - Grid View Card Display
 *
 * A comprehensive card display component for grid layouts featuring a 3-dropdown
 * selection system for variations, quality, and language options.
 *
 * @module CardItem
 *
 * ## Features
 * - Responsive image display with modal zoom
 * - Three-tier selection system (Variation → Quality → Language)
 * - Mode-aware display (storefront/inventory/all)
 * - Real-time stock and price information
 * - Accessibility-compliant with ARIA labels and keyboard navigation
 *
 * ## Architecture
 * - **Grid View Only**: Designed for card grid layouts
 * - **BrowseBaseCard Format**: Works with grouped card variations
 * - **Progressive Disclosure**: Dropdowns appear based on availability
 * - **Optimized Images**: Uses OptimizedImage component with lazy loading
 *
 * ## Display Modes
 * - `storefront`: Customer-facing shop display with "Add to Cart" action
 * - `inventory`: Admin inventory management with "Manage" action
 * - `all`: Admin card database with "Add to Inventory" action
 *
 * @example
 * ```tsx
 * <CardItem
 *   card={browseBaseCard}
 *   mode="storefront"
 *   currency={usdCurrency}
 *   onAction={handleAddToCart}
 * />
 * ```
 */
import React, { useState, useMemo, useEffect } from 'react';
import OptimizedImage from '@/shared/media/OptimizedImage';
import { X } from 'lucide-react';
import VariationBadge from '@/shared/ui/VariationBadge';
import { ACCESSIBILITY_CONFIG } from '@/lib/constants';
import { formatCurrencySimple, formatPriceDisplay } from '@/lib/utils';
import { api, ENDPOINTS } from '@/lib/api';
import type {
  BrowseBaseCard,
  BrowseVariation,
  CardVariation,
  Currency
} from '@/types';
import {
  formatTreatment,
  formatFinish,
  isFoilCard,
  hasSpecialTreatment
} from '@/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the CardItem component
 */
export interface CardItemProps {
  /** Card data including all variations and metadata */
  card: BrowseBaseCard;
  /** Display mode determining behavior and action button text */
  mode: 'storefront' | 'inventory' | 'all';
  /** Currency for price display (defaults to USD if not provided) */
  currency?: Currency;
  /** Callback when user triggers the action button (Add to Cart/Manage/Add to Inventory) */
  onAction: (params: ActionParams) => void;
}

/**
 * Parameters passed to the onAction callback
 * Contains all information needed to process the user's selection
 */
export interface ActionParams {
  /** The base card that was actioned */
  card: BrowseBaseCard;
  /** Selected variation ID (treatment/finish combination) */
  variationId: number;
  /** Selected inventory ID (quality/language specific), if applicable */
  inventoryId: number | undefined;
  /** Selected quality grade, if applicable */
  quality: string | undefined;
  /** Selected language, if applicable */
  language: string | undefined;
}

interface InventoryItem {
  id: number;
  card_id: number;
  quality: string;
  language: string;
  stock_quantity: number;
  price: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

const CardItem: React.FC<CardItemProps> = ({
  card,
  mode,
  currency = { code: 'USD', symbol: '$', rate: 1, label: 'US Dollar' },
  onAction
}) => {
  // --------------------------------------------------------------------------
  // STATE FOR 3-DROPDOWN SYSTEM
  // --------------------------------------------------------------------------

  const [selectedVariation, setSelectedVariation] = useState<BrowseVariation>();
  const [selectedQuality, setSelectedQuality] = useState<string>();
  const [selectedLanguage, setSelectedLanguage] = useState<string>();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // State for image modal
  const [showImageModal, setShowImageModal] = useState(false);

  // --------------------------------------------------------------------------
  // FILTER VARIATIONS BASED ON MODE
  // --------------------------------------------------------------------------

  const availableVariations = useMemo(() => {
    if (mode === 'all') {
      return card.variations; // Show all variations
    }
    // inventory/storefront: only variations with stock
    return card.variations.filter(v => v.in_stock > 0);
  }, [card.variations, mode]);

  // --------------------------------------------------------------------------
  // FETCH INVENTORY FOR SELECTED VARIATION
  // --------------------------------------------------------------------------

  useEffect(() => {
    // NOTE: This fetch is disabled because the API endpoint /cards/:id/inventory doesn't exist
    // In admin mode, cards already have all necessary inventory data from the main query
    // In storefront mode, variations already include in_stock information
    // If needed in the future, implement the backend endpoint first

    setInventory([]);
    setInventoryLoading(false);

    /* DISABLED - No backend endpoint exists
    if (!selectedVariation || mode === 'all') {
      setInventory([]);
      return;
    }

    const fetchInventory = async () => {
      setInventoryLoading(true);
      try {
        const response = await api.get<{ inventory: InventoryItem[] }>(
          `${ENDPOINTS.ADMIN.CARD_BY_ID(selectedVariation.id)}/inventory`
        );
        setInventory(response.inventory || []);
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
        setInventory([]);
      } finally {
        setInventoryLoading(false);
      }
    };

    fetchInventory();
    */
  }, [selectedVariation, mode]);

  // --------------------------------------------------------------------------
  // FILTER INVENTORY BY STOCK (EXCEPT IN 'ALL' MODE)
  // --------------------------------------------------------------------------

  const availableQualities = useMemo(() => {
    if (mode === 'all') return []; // Handled in modal
    return inventory.filter(inv => inv.stock_quantity > 0);
  }, [inventory, mode]);

  const availableLanguages = useMemo(() => {
    if (!selectedQuality || mode === 'all') return [];
    return availableQualities.filter(inv => inv.quality === selectedQuality);
  }, [availableQualities, selectedQuality, mode]);

  // --------------------------------------------------------------------------
  // INITIALIZE DEFAULT SELECTIONS
  // --------------------------------------------------------------------------

  useEffect(() => {
    // Auto-select first available variation
    if (availableVariations.length > 0 && !selectedVariation) {
      setSelectedVariation(availableVariations[0]);
    }
  }, [availableVariations, selectedVariation]);

  useEffect(() => {
    // Auto-select first available quality
    if (availableQualities.length > 0 && !selectedQuality) {
      setSelectedQuality(availableQualities[0].quality);
    }
  }, [availableQualities, selectedQuality]);

  useEffect(() => {
    // Auto-select first available language
    if (availableLanguages.length > 0 && !selectedLanguage) {
      setSelectedLanguage(availableLanguages[0].language);
    }
  }, [availableLanguages, selectedLanguage]);

  // --------------------------------------------------------------------------
  // GET CURRENT SELECTION DATA
  // --------------------------------------------------------------------------

  const selectedInventory = useMemo(() => {
    if (!selectedQuality || !selectedLanguage) return null;
    return inventory.find(inv =>
      inv.quality === selectedQuality &&
      inv.language === selectedLanguage
    );
  }, [inventory, selectedQuality, selectedLanguage]);

  // --------------------------------------------------------------------------
  // VARIATION DROPDOWN HELPERS
  // --------------------------------------------------------------------------

  const formatVariationOption = (variation: BrowseVariation): string => {
    const treatment = formatTreatment(variation.treatment);
    const finish = formatFinish(variation.finish);
    return `${treatment} ${finish}`;
  };

  // --------------------------------------------------------------------------
  // RENDER HELPERS
  // --------------------------------------------------------------------------

  const renderVariationDropdown = () => {
    if (availableVariations.length === 0) return null;

    if (availableVariations.length === 1) {
      // Show as static badge
      return (
        <div className="variation-badge">
          <span className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-2 rounded-md truncate block" title={formatVariationOption(availableVariations[0])}>
            {formatVariationOption(availableVariations[0])}
          </span>
        </div>
      );
    }

    // Show as dropdown
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Variation
        </label>
        <select
          value={selectedVariation?.id || ''}
          onChange={(e) => {
            const variation = availableVariations.find(v => v.id === Number(e.target.value));
            setSelectedVariation(variation);
            // Reset dependent selections
            setSelectedQuality(undefined);
            setSelectedLanguage(undefined);
          }}
          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent truncate"
          title={selectedVariation ? formatVariationOption(selectedVariation) : ''}
        >
          {availableVariations.map(v => (
            <option key={v.id} value={v.id} title={formatVariationOption(v)}>
              {formatVariationOption(v)}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderQualityDropdown = () => {
    // Quality/language selection is handled in modal for storefront
    // Only show quality dropdown in admin 'inventory' mode
    if (mode !== 'inventory' || availableQualities.length === 0) return null;

    if (availableQualities.length === 1) {
      // Show as static text
      return (
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Quality
          </label>
          <div className="text-sm text-slate-700">
            {availableQualities[0].quality}
          </div>
        </div>
      );
    }

    // Show as dropdown
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Quality
        </label>
        <select
          value={selectedQuality || ''}
          onChange={(e) => {
            setSelectedQuality(e.target.value);
            // Reset dependent selection
            setSelectedLanguage(undefined);
          }}
          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {availableQualities.map(inv => (
            <option key={inv.id} value={inv.quality}>
              {inv.quality} ({inv.stock_quantity} in stock)
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderLanguageDropdown = () => {
    // Quality/language selection is handled in modal for storefront
    // Only show language dropdown in admin 'inventory' mode
    if (mode !== 'inventory' || availableLanguages.length === 0) return null;

    if (availableLanguages.length === 1) {
      // Show as static text
      return (
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Language
          </label>
          <div className="text-sm text-slate-700">
            {availableLanguages[0].language}
          </div>
        </div>
      );
    }

    // Show as dropdown
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Language
        </label>
        <select
          value={selectedLanguage || ''}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {availableLanguages.map(inv => (
            <option key={inv.id} value={inv.language}>
              {inv.language} ({inv.stock_quantity} in stock)
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderStockAndPrice = () => {
    if (mode === 'all') {
      // Show total stock across all variations and price
      const priceDisplay = formatPriceDisplay(card.variations, currency, mode);
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${
              card.total_stock > 0 ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <span className="text-slate-700">
              {card.total_stock > 0
                ? `${card.total_stock} total stock (${card.variation_count} variations)`
                : 'No inventory'
              }
            </span>
          </div>
          {priceDisplay && (
            <div className="text-lg font-bold text-slate-900">
              {priceDisplay}
            </div>
          )}
        </div>
      );
    }

    // For storefront/inventory modes, show selected variation info
    if (!selectedVariation) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-slate-500">No variation available</span>
        </div>
      );
    }

    // Show stock for selected variation and overall price range
    const hasStock = selectedVariation.in_stock > 0;

    // For inventory/storefront modes, show overall price range if multiple variations
    // For single variation, show the specific price
    const priceDisplay = formatPriceDisplay(card.variations, currency, mode);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${hasStock ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm text-slate-700">
              {hasStock ? `Stock: ${selectedVariation.in_stock}` : 'Out of stock'}
            </span>
          </div>
        </div>
        {priceDisplay && (
          <div className="text-lg font-bold text-slate-900">
            {priceDisplay}
          </div>
        )}
      </div>
    );
  };

  const renderActionButton = () => {
    const handleClick = () => {
      onAction({
        card,
        variationId: selectedVariation?.id || card.variations[0]?.id || card.id,
        inventoryId: selectedInventory?.id,
        quality: selectedQuality,
        language: selectedLanguage
      });
    };

    const buttonText = mode === 'all' ? 'Add to Inventory' :
                      mode === 'inventory' ? 'Manage' :
                      'Add to Cart';

    // Button should be enabled when:
    // - 'all' mode: always (opens modal to add inventory)
    // - 'inventory' mode: when variation is selected (opens manage modal)
    // - 'storefront' mode: when variation has stock (opens modal to select quality/language)
    const hasVariation = !!selectedVariation;
    const hasStock = mode === 'all' || (selectedVariation && selectedVariation.in_stock > 0);
    const isDisabled = !hasVariation || !hasStock;

    return (
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
          isDisabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        }`}
        style={{ minHeight: `${ACCESSIBILITY_CONFIG.MIN_TOUCH_TARGET}px` }}
        aria-label={`${buttonText} for ${card.name}`}
      >
        {buttonText}
      </button>
    );
  };

  // --------------------------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------------------------

  // Use the base card's image_url, or fall back to the first variation's image
  const imageUrl = card.image_url || 
                   (selectedVariation?.image) || 
                   (card.variations?.[0]?.image) || 
                   '/images/card-back-placeholder.svg';

  const isCardFoil = selectedVariation ? selectedVariation.finish === 'foil' : false;
  const hasSpecial = selectedVariation
    ? hasSpecialTreatment({ treatment: selectedVariation.treatment })
    : false;

  return (
    <div className="card-mm flex flex-col h-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image Section */}
      <div className="relative flex-shrink-0 overflow-hidden bg-slate-50" style={{ aspectRatio: '5/7' }}>
        <button
          onClick={() => setShowImageModal(true)}
          className="block w-full h-full focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden"
          aria-label={`View larger image of ${card.name}`}
        >
          <OptimizedImage
            src={imageUrl}
            alt={card.name}
            width={250}
            height={350}
            className={`w-full h-full object-cover hover:scale-105 transition-transform ${
              isCardFoil
                ? 'ring-2 ring-yellow-400 ring-offset-2 shadow-yellow-200/50 shadow-lg'
                : ''
            }`}
            placeholder="blur"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        </button>
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-grow p-4">
        {/* Content that can grow/shrink */}
        <div className="flex flex-col flex-grow space-y-4">
          {/* Card Info */}
          <div className="flex-shrink-0">
            <h3 className="font-semibold text-lg text-slate-900 line-clamp-2 mb-1">
              {card.name}
            </h3>
            <p className="text-sm text-slate-600">
              {card.set_name}
            </p>
            {card.card_number && (
              <p className="text-sm text-slate-500">
                #{card.card_number}
              </p>
            )}
          </div>

          {/* Three Dropdowns */}
          <div className="space-y-3 flex-shrink-0">
            {renderVariationDropdown()}
            {renderQualityDropdown()}
            {renderLanguageDropdown()}
          </div>

          {/* Stock and Price */}
          <div className="flex-shrink-0 py-3 border-t border-slate-200">
            {inventoryLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-pulse" />
                <span>Loading...</span>
              </div>
            ) : (
              renderStockAndPrice()
            )}
          </div>
        </div>

        {/* Action Button - Always at bottom */}
        <div className="flex-shrink-0 pt-4">
          {renderActionButton()}
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
              aria-label="Close image modal"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={imageUrl}
              alt={card.name}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

CardItem.displayName = 'CardItem';
export default CardItem;