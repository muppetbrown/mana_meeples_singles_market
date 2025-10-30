// apps/web/src/shared/card/CardItem.tsx
/**
 * Card Item Component - IMPLEMENTATION OF NEW ARCHITECTURE
 * Displays individual card with 3-dropdown system for grid view
 *
 * ARCHITECTURE:
 * - Grid view: Large cards with 3 dropdowns (Variation, Quality, Language)
 * - Adapts display based on mode: storefront/inventory/all
 * - Follows AI development principles for clarity and maintainability
 */
import React, { useState, useMemo, useEffect } from 'react';
import OptimizedImage from '@/shared/media/OptimizedImage';
import { X } from 'lucide-react';
import VariationBadge from '@/shared/ui/VariationBadge';
import { ACCESSIBILITY_CONFIG } from '@/lib/constants';
import { formatCurrencySimple } from '@/lib/utils';
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

export interface CardItemProps {
  card: BrowseBaseCard;
  mode: 'storefront' | 'inventory' | 'all';
  currency?: Currency;
  onAction: (params: ActionParams) => void;
}

export interface ActionParams {
  card: BrowseBaseCard;
  variationId: number;
  inventoryId: number | undefined;
  quality: string | undefined;
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
    if (!selectedVariation || mode === 'all') {
      setInventory([]);
      return;
    }

    const fetchInventory = async () => {
      setInventoryLoading(true);
      try {
        const response = await api.get<{ inventory: InventoryItem[] }>(
          `${ENDPOINTS.CARDS.BY_ID(selectedVariation.id)}/inventory`
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
          <span className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-2 rounded-md">
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
          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {availableVariations.map(v => (
            <option key={v.id} value={v.id}>
              {formatVariationOption(v)}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderQualityDropdown = () => {
    if (mode === 'all' || availableQualities.length === 0) return null;

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
    if (mode === 'all' || availableLanguages.length === 0) return null;

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
      // Show total stock across all variations
      return (
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
      );
    }

    if (!selectedInventory) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-slate-500">Select options above</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-slate-700">
              Stock: {selectedInventory.stock_quantity}
            </span>
          </div>
          <span className="text-lg font-bold text-slate-900">
            {formatCurrencySimple(selectedInventory.price, currency)}
          </span>
        </div>
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

    const isDisabled = mode !== 'all' && !selectedInventory;

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

  const imageUrl = card.image_url || '/images/card-back-placeholder.svg';

  // DEBUG: Log image URL to help troubleshoot Issue #4
  useEffect(() => {
    console.log('CardItem - card data:', {
      id: card.id,
      name: card.name,
      image_url: card.image_url,
      hasImage: !!card.image_url,
      imageUrl: imageUrl
    });
  }, [card.id, card.name, card.image_url, imageUrl]);
  const isCardFoil = selectedVariation ? selectedVariation.finish === 'foil' : false;
  const hasSpecial = selectedVariation ? hasSpecialTreatment({ treatment: selectedVariation.treatment } as any) : false;

  return (
    <div className="card-mm flex flex-col h-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image Section */}
      <div className="relative flex-shrink-0 overflow-hidden">
        <button
          onClick={() => setShowImageModal(true)}
          className="block w-full focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg overflow-hidden"
          aria-label={`View larger image of ${card.name}`}
        >
          <OptimizedImage
            src={imageUrl}
            alt={card.name}
            width={250}
            height={350}
            className={`w-full h-48 sm:h-56 lg:h-64 object-cover hover:scale-105 transition-transform ${
              isCardFoil
                ? 'ring-2 ring-yellow-400 ring-offset-2 shadow-yellow-200/50 shadow-lg'
                : ''
            }`}
            placeholder="blur"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />

        {/* Variation badges overlay */}
        {selectedVariation && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isCardFoil && (
              <VariationBadge
                finish={formatFinish(selectedVariation.finish)}
              />
            )}
            {hasSpecial && (
              <VariationBadge
                finish=""
                treatment={formatTreatment(selectedVariation.treatment)}
              />
            )}
            {selectedVariation.promo_type && (
              <VariationBadge
                finish=""
                promoType={selectedVariation.promo_type}
              />
            )}
          </div>
        )}
        </button>
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-grow p-4 space-y-4">
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

        {/* Action Button */}
        <div className="flex-shrink-0 mt-auto">
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